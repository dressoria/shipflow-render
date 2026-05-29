-- FASE 5.67 — Prep quote acceptance and payment
-- Purpose: adds payment tracking fields for manual-managed SendiFlash Prep orders.
--
-- STATUS: READY — apply in staging before deploying FASE 5.67 UI changes.
-- This migration does not modify label payment, wallet recharge, refund, void, or provider tables.

alter table prep_orders
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists payment_method text,
  add column if not exists paid_amount integer,
  add column if not exists paid_at timestamptz,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists payment_reference text,
  add column if not exists quote_accepted_at timestamptz,
  add column if not exists quote_expires_at timestamptz;

alter table prep_orders
  drop constraint if exists prep_orders_payment_status_check,
  add constraint prep_orders_payment_status_check
    check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded_manual'));

alter table prep_orders
  drop constraint if exists prep_orders_payment_method_check,
  add constraint prep_orders_payment_method_check
    check (payment_method is null or payment_method in ('wallet', 'card', 'manual'));

create index if not exists prep_orders_payment_status_idx
  on prep_orders (payment_status, created_at desc);

create index if not exists prep_orders_stripe_checkout_session_id_idx
  on prep_orders (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
