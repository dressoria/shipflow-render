-- FASE 5.39 — pending_label_orders table
-- Purpose: persists a rate snapshot + payment intent before purchasing a label.
-- A row is created when the user clicks "Pay this label by card".
-- The label is only purchased server-side AFTER Stripe confirms payment
-- AND ENABLE_REAL_LABEL_PURCHASE=true.
--
-- STATUS: PROPOSED — NOT YET APPLIED.
-- Review this migration with docs/ROADMAP.md FASE 5.39 before running.
-- Run ONLY after go/no-go checklist is complete.

create type pending_label_order_status as enum (
  'pending_payment',
  'payment_confirmed',
  'label_purchased',
  'label_failed',
  'refund_needed',
  'refunded',
  'expired',
  'canceled'
);

create table if not exists pending_label_orders (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users(id) on delete cascade,

  status                    pending_label_order_status not null default 'pending_payment',

  -- Rate snapshot at the time of order creation.
  -- Prices are frozen here; the label purchase uses these values, not a re-fetch.
  rate_snapshot             jsonb not null,

  -- Full address snapshots (origin, destination) as jsonb.
  origin                    jsonb not null,
  destination               jsonb not null,
  parcel                    jsonb not null,

  -- Customer-facing price (what they pay, including markup + payment fee).
  customer_price            numeric(10, 2) not null,
  currency                  text not null default 'usd',

  -- Stripe identifiers — populated when checkout session is created / completed.
  stripe_checkout_session_id  text unique,
  stripe_payment_intent_id    text unique,
  stripe_event_id             text,

  -- Populated after label is successfully purchased.
  shipment_id               uuid references shipments(id),
  label_id                  text,

  -- Idempotency key used when purchasing the label server-side.
  label_idempotency_key     text unique,

  -- Order expires after 30 minutes if payment is not completed.
  expires_at                timestamptz not null default (now() + interval '30 minutes'),

  metadata                  jsonb,

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- Index for user-scoped queries (dashboard, support lookup).
create index if not exists pending_label_orders_user_id_idx
  on pending_label_orders (user_id, created_at desc);

-- Index for webhook lookup by Stripe session.
create index if not exists pending_label_orders_stripe_session_idx
  on pending_label_orders (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

-- Trigger: keep updated_at current.
create or replace function set_pending_label_orders_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger pending_label_orders_updated_at
  before update on pending_label_orders
  for each row execute function set_pending_label_orders_updated_at();

-- RLS: users can only read their own orders; service_role writes.
alter table pending_label_orders enable row level security;

create policy "pending_label_orders: user read own"
  on pending_label_orders for select
  using (auth.uid() = user_id);

-- No direct insert/update from client — all writes go through service_role
-- (API routes that hold SUPABASE_SERVICE_ROLE_KEY).
