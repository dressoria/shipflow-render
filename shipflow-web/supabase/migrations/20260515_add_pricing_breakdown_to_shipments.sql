-- ShipFlow FASE 5.10: Persistencia financiera de pricing.
--
-- STATUS: NOT EXECUTED. Apply manually in Supabase after:
--   (a) FASE 1C migration (20260514_shipflow_security_logistics_foundation.sql) is applied.
--   (b) FASE 4D migration (20260514_create_label_transaction_rpc.sql) is applied.
--   (c) Backup/snapshot taken.
--
-- PREREQUISITE: Both FASE 1C and FASE 4D migrations must be applied before this one.
-- SECURITY: The RPC section uses SECURITY DEFINER and is only callable by service_role.
--
-- PURPOSE:
--   Adds financial pricing columns to shipments for audit, reporting, and real payments.
--   Pricing model "shipflow_v1":
--     provider_cost    = actual carrier/provider cost (raw)
--     platform_markup  = max(0.99, provider_cost * 6%) — ShipFlow margin
--     pricing_subtotal = provider_cost + platform_markup (before payment processing)
--     payment_fee      = pricing_subtotal * 2.9% + $0.30 — passed through to customer; NOT absorbed by ShipFlow
--     customer_price   = pricing_subtotal + payment_fee — total charged to customer
--     pricing_breakdown = snapshot of the calculation applied at purchase time (jsonb)
--     pricing_model    = identifier of the formula used (e.g. 'shipflow_v1')
--
-- VOID/REFUND NOTE:
--   void_label_refund_transaction refunds p_refund_amount.
--   The caller (api/labels/[id]/void) passes customer_price as p_refund_amount.
--   This means the full amount — including payment_fee — is refunded to the internal balance.
--   This is correct: ShipFlow credits back what the customer paid.
--   There is no double-refund risk because the idempotency check prevents duplicate refund inserts.

-- ============================================================
-- SECTION 1: New columns on public.shipments
-- ============================================================

-- Defensive adds for legacy installs that may not have FASE 1C columns yet.
alter table public.shipments
  add column if not exists provider_cost numeric(10, 2),
  add column if not exists platform_markup numeric(10, 2) not null default 0,
  add column if not exists customer_price numeric(10, 2);

-- New FASE 5.10 columns.
-- payment_fee: payment processing cost passed through to the customer (never absorbed by ShipFlow).
alter table public.shipments
  add column if not exists payment_fee numeric(10, 2) not null default 0;

-- pricing_subtotal: provider_cost + platform_markup before payment_fee is added.
alter table public.shipments
  add column if not exists pricing_subtotal numeric(10, 2);

-- pricing_model: identifier of the pricing formula applied (e.g. 'shipflow_v1').
alter table public.shipments
  add column if not exists pricing_model text;

-- pricing_breakdown: snapshot of the full calculation at purchase time (for audit/reporting).
alter table public.shipments
  add column if not exists pricing_breakdown jsonb not null default '{}'::jsonb;

-- Constraints for new columns.
alter table public.shipments
  drop constraint if exists shipments_payment_fee_check,
  add constraint shipments_payment_fee_check
    check (payment_fee >= 0);

alter table public.shipments
  drop constraint if exists shipments_pricing_subtotal_check,
  add constraint shipments_pricing_subtotal_check
    check (pricing_subtotal is null or pricing_subtotal >= 0);

-- Comments for documentation.
comment on column public.shipments.provider_cost     is 'Actual carrier/provider cost (raw). ShipFlow pays this to the carrier.';
comment on column public.shipments.platform_markup   is 'ShipFlow margin: max(0.99, provider_cost * 6%). Added on top of provider cost.';
comment on column public.shipments.pricing_subtotal  is 'provider_cost + platform_markup. Base price before payment processing fee.';
comment on column public.shipments.payment_fee       is 'Payment processing cost (subtotal * 2.9% + $0.30). Passed to the customer; NOT absorbed by ShipFlow.';
comment on column public.shipments.customer_price    is 'Total charged to customer: provider_cost + platform_markup + payment_fee.';
comment on column public.shipments.pricing_model     is 'Identifier of the pricing formula used at purchase time (e.g. shipflow_v1).';
comment on column public.shipments.pricing_breakdown is 'Full snapshot of the pricing calculation at purchase time. Used for audit and reporting.';

-- ============================================================
-- SECTION 2: Updated RPC — create_label_shipment_transaction
--   Adds p_payment_fee, p_pricing_subtotal, p_pricing_model, p_pricing_breakdown params.
--   All new params have defaults for backward compatibility with callers that predate FASE 5.10.
-- ============================================================

create extension if not exists "pgcrypto";

create or replace function public.create_label_shipment_transaction(
  p_user_id               uuid,
  p_idempotency_key       text,
  p_shipment_id           text,
  p_tracking_number       text,
  p_sender_name           text,
  p_sender_phone          text,
  p_origin_city           text,
  p_recipient_name        text,
  p_recipient_phone       text,
  p_destination_city      text,
  p_destination_addr      text,
  p_weight                numeric,
  p_product_type          text,
  p_carrier_code          text,
  p_shipping_subtotal     numeric,
  p_total                 numeric,
  p_provider              text,
  p_provider_shipment_id  text,
  p_provider_label_id     text,
  p_provider_service_code text,
  p_provider_cost         numeric,
  p_platform_markup       numeric,
  p_customer_price        numeric,
  p_currency              text,
  p_label_format          text    default null,
  p_metadata              jsonb   default '{}'::jsonb,
  -- FASE 5.10: financial pricing breakdown (all optional with safe defaults for backward compat)
  p_payment_fee           numeric default 0,
  p_pricing_subtotal      numeric default null,
  p_pricing_model         text    default 'shipflow_v1',
  p_pricing_breakdown     jsonb   default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_id     text;
  v_existing_status text;
  v_balance         numeric;
begin
  -- Guard: customer_price must be positive to create a real label.
  if p_customer_price <= 0 then
    raise exception 'INVALID_PRICE: customer_price must be > 0, got %', p_customer_price;
  end if;

  -- Guard: payment_fee must not be negative.
  if p_payment_fee < 0 then
    raise exception 'INVALID_PAYMENT_FEE: payment_fee must be >= 0, got %', p_payment_fee;
  end if;

  -- Guard: customer_price must be >= provider_cost if provider_cost is positive.
  if p_provider_cost > 0 and p_customer_price < p_provider_cost then
    raise exception 'INVALID_PRICE: customer_price % cannot be less than provider_cost %', p_customer_price, p_provider_cost;
  end if;

  -- 1. Idempotency check: return existing shipment id if already purchased.
  select id, label_status
  into v_existing_id, v_existing_status
  from public.shipments
  where user_id = p_user_id
    and idempotency_key = p_idempotency_key
  limit 1;

  if v_existing_id is not null and v_existing_status = 'purchased' then
    return jsonb_build_object(
      'status', 'existing',
      'shipment_id', v_existing_id
    );
  end if;

  -- 2. Balance validation: ensure the user has enough funds for the actual cost.
  select coalesce(sum(amount), 0)
  into v_balance
  from public.balance_movements
  where user_id = p_user_id;

  if v_balance < p_customer_price then
    raise exception 'INSUFFICIENT_FUNDS: available balance % < required %', v_balance, p_customer_price;
  end if;

  -- 3. Insert shipment record with all provider and pricing fields.
  insert into public.shipments (
    id, user_id, tracking_number,
    sender_name, sender_phone, origin_city,
    recipient_name, recipient_phone, destination_city, destination_address,
    weight, product_type, courier,
    shipping_subtotal, cash_on_delivery_commission, total,
    cash_on_delivery, cash_amount, status, value,
    provider, provider_shipment_id, provider_label_id, provider_rate_id,
    provider_service_code, label_url, label_format,
    payment_status, label_status,
    provider_cost, platform_markup, customer_price, currency,
    payment_fee, pricing_subtotal, pricing_model, pricing_breakdown,
    idempotency_key, metadata
  ) values (
    p_shipment_id, p_user_id, p_tracking_number,
    p_sender_name, p_sender_phone, p_origin_city,
    p_recipient_name, p_recipient_phone, p_destination_city, p_destination_addr,
    p_weight, p_product_type, p_carrier_code,
    p_shipping_subtotal, 0, p_total,
    false, 0, 'Pendiente', p_customer_price,
    p_provider, p_provider_shipment_id, p_provider_label_id, null,
    p_provider_service_code, null, p_label_format,
    'paid', 'purchased',
    p_provider_cost, p_platform_markup, p_customer_price, p_currency,
    p_payment_fee,
    coalesce(p_pricing_subtotal, p_provider_cost + p_platform_markup),
    coalesce(p_pricing_model, 'shipflow_v1'),
    coalesce(p_pricing_breakdown, '{}'::jsonb),
    p_idempotency_key, coalesce(p_metadata, '{}'::jsonb)
  );

  -- 4. Insert initial tracking event.
  insert into public.tracking_events (
    shipment_id, user_id, tracking_number,
    title, description, status,
    source, is_real
  ) values (
    p_shipment_id, p_user_id, p_tracking_number,
    'Label purchased',
    'ShipStation label created. Carrier: ' || p_carrier_code || ', Service: ' || p_provider_service_code || '.',
    'Pendiente',
    'shipstation', true
  );

  -- 5. Insert balance deduction (negative debit).
  insert into public.balance_movements (
    id, user_id, concept, amount, type,
    reference_type, reference_id, shipment_id,
    idempotency_key, created_by, metadata
  ) values (
    'MOV-' || gen_random_uuid()::text,
    p_user_id,
    'ShipStation label ' || p_tracking_number,
    -p_customer_price,
    'debit',
    'shipment', p_shipment_id, p_shipment_id,
    p_idempotency_key, p_user_id,
    jsonb_build_object(
      'trackingNumber', p_tracking_number,
      'providerShipmentId', p_provider_shipment_id,
      'source', 'shipstation_web',
      'provider', p_provider,
      'carrierCode', p_carrier_code,
      'serviceCode', p_provider_service_code,
      'providerCost', p_provider_cost,
      'platformMarkup', p_platform_markup,
      'paymentFee', p_payment_fee,
      'customerPrice', p_customer_price,
      'pricingModel', p_pricing_model
    )
  );

  return jsonb_build_object(
    'status', 'created',
    'shipment_id', p_shipment_id
  );
end;
$$;

-- Only service_role can call this function (called by the backend server, never from the client).
revoke all on function public.create_label_shipment_transaction from public;
grant execute on function public.create_label_shipment_transaction to service_role;
