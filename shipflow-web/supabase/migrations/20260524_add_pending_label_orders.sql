-- FASE 5.39B — pending_label_orders table (revised)
-- Purpose: persists a rate snapshot + Stripe checkout intent before purchasing a label.
-- A row is created when the user clicks "Pay this label by card" (ENABLE_DIRECT_LABEL_PAYMENT=true).
-- The label is only purchased server-side AFTER:
--   1. Stripe fires checkout.session.completed
--   2. ENABLE_REAL_LABEL_PURCHASE=true
--
-- STATUS: PROPOSED — NOT YET APPLIED.
-- Review docs/LABELS_GO_NO_GO.md before running.
-- Apply in staging first, then production.
-- Run ONLY after the go/no-go checklist is complete.
--
-- Idempotency note:
-- This migration is intended to be run once per environment. The enum creation is guarded,
-- and the trigger is dropped/recreated, but review output carefully if re-running after a
-- partial manual apply.
--
-- State machine:
--   pending_payment
--     → expired (expires_at passed before payment)
--     → canceled (user canceled before payment)
--     → paid_test_mode (paid but ENABLE_REAL_LABEL_PURCHASE=false)
--     → paid_waiting_label_purchase (paid, ENABLE_REAL_LABEL_PURCHASE=true, label queued)
--   paid_waiting_label_purchase
--     → label_purchase_pending (FASE 5.39C — label API call in flight)
--   label_purchase_pending
--     → label_purchased (success)
--     → action_required (label failed, manual intervention)
--     → refund_needed (label permanently failed, must refund)
--   action_required
--     → refund_needed (admin decides to refund)
--   refund_needed
--     → refund_pending (FASE 5.40D — Stripe refund initiated)
--   refund_pending
--     → refunded (FASE 5.40D — Stripe confirms refund complete)
--
-- Terminal states: label_purchased, expired, canceled, refunded

do $$
begin
  create type pending_label_order_status as enum (
    'pending_payment',
    'paid_test_mode',
    'paid_waiting_label_purchase',
    'label_purchase_pending',
    'label_purchased',
    'action_required',
    'refund_needed',
    'refund_pending',
    'refunded',
    'expired',
    'canceled'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists pending_label_orders (
  id                            uuid primary key default gen_random_uuid(),
  user_id                       uuid not null references auth.users(id) on delete cascade,

  status                        pending_label_order_status not null default 'pending_payment',

  -- Provider/service info (denormalized for fast lookup and audit).
  provider                      text not null,
  service_code                  text,
  service_name                  text,

  -- Amount in Stripe-compatible cents (e.g., 1500 = $15.00).
  -- Calculated server-side from rate_snapshot; client-provided values are ignored.
  amount_cents                  integer not null check (amount_cents > 0),
  currency                      text not null default 'usd',

  -- Rate snapshot frozen at order creation.
  -- Label purchase validates against this snapshot and may re-fetch rates only to obtain
  -- a fresh providerRateId when the carrier requires it.
  rate_snapshot                 jsonb not null,

  -- Address and parcel snapshots (separate columns for queryability).
  origin                        jsonb not null,
  destination                   jsonb not null,
  parcel                        jsonb not null,

  -- Stripe identifiers — populated when the checkout session is created / completed.
  stripe_checkout_session_id    text unique,
  stripe_payment_intent_id      text,
  stripe_event_id               text,
  stripe_refund_id              text,

  -- Purchase idempotency key (used when calling the carrier API for the label).
  -- Separate from the Stripe session — survives retries without double-purchasing.
  idempotency_key               text unique,

  -- Label purchase results — populated after label_purchased.
  shipment_id                   uuid references shipments(id),
  label_id                      text,
  tracking_number               text,

  -- Safe error message (no API secrets) — set on action_required or refund_needed.
  error_message                 text,
  refund_error_message          text,

  -- Timestamps.
  expires_at                    timestamptz not null default (now() + interval '30 minutes'),
  paid_at                       timestamptz,      -- set when Stripe confirms payment
  refund_attempted_at           timestamptz,      -- set before calling Stripe Refund API
  refunded_at                   timestamptz,      -- set after Stripe refund or manual refund confirmation
  processed_at                  timestamptz,      -- set when label purchase resolves (success or failure)
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),

  -- Miscellaneous reconciliation/audit data.
  metadata                      jsonb
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

-- User-scoped queries (dashboard, support lookup).
create index if not exists pending_label_orders_user_id_idx
  on pending_label_orders (user_id, created_at desc);

-- Status filtering (admin queries, expiry sweeps, support).
create index if not exists pending_label_orders_status_idx
  on pending_label_orders (status);

-- Webhook lookup by Stripe checkout session (checkout.session.completed).
create index if not exists pending_label_orders_stripe_session_idx
  on pending_label_orders (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

-- Webhook lookup by payment intent (payment_intent.payment_failed).
create index if not exists pending_label_orders_stripe_pi_idx
  on pending_label_orders (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

-- Expiry sweep (background job, FASE 5.39C+): only pending_payment rows can expire.
create index if not exists pending_label_orders_expires_at_idx
  on pending_label_orders (expires_at)
  where status = 'pending_payment';

-- ── Trigger: keep updated_at current ─────────────────────────────────────────

create or replace function set_pending_label_orders_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pending_label_orders_updated_at on pending_label_orders;

create trigger pending_label_orders_updated_at
  before update on pending_label_orders
  for each row execute function set_pending_label_orders_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table pending_label_orders enable row level security;

-- Users can read only their own orders.
create policy "pending_label_orders: user read own"
  on pending_label_orders for select
  using (auth.uid() = user_id);

-- No INSERT or UPDATE policies for regular users.
-- All writes go through API routes that hold SUPABASE_SERVICE_ROLE_KEY (service_role bypasses RLS).
-- This prevents clients from altering status, amount_cents, or rate_snapshot directly.
