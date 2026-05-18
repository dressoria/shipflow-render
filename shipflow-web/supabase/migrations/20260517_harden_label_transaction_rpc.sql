-- FASE 5.20D
-- Harden label persistence so provider_rate_id and label_url are written inside
-- create_label_shipment_transaction instead of relying on a post-RPC update.
--
-- Safe to review/apply manually in Supabase SQL Editor after backup.
-- Do not run automatically from Codex.

create extension if not exists "pgcrypto";

drop function if exists public.create_label_shipment_transaction(
  uuid, text, text, text, text, text, text, text, text, text,
  text, numeric, text, text, numeric, numeric, text, text, text, text,
  numeric, numeric, numeric, text, text, jsonb, numeric, numeric, text, jsonb
);

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
  p_payment_fee           numeric default 0,
  p_pricing_subtotal      numeric default null,
  p_pricing_model         text    default 'shipflow_v1',
  p_pricing_breakdown     jsonb   default '{}'::jsonb,
  p_provider_rate_id      text    default null,
  p_label_url             text    default null,
  p_label_status          text    default 'purchased',
  p_payment_status        text    default 'paid'
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
  if p_customer_price <= 0 then
    raise exception 'INVALID_PRICE: customer_price must be > 0, got %', p_customer_price;
  end if;

  if p_payment_fee < 0 then
    raise exception 'INVALID_PAYMENT_FEE: payment_fee must be >= 0, got %', p_payment_fee;
  end if;

  if p_provider_cost > 0 and p_customer_price < p_provider_cost then
    raise exception 'INVALID_PRICE: customer_price % cannot be less than provider_cost %', p_customer_price, p_provider_cost;
  end if;

  if coalesce(p_label_status, '') not in ('purchased', 'pending', 'processing') then
    raise exception 'INVALID_LABEL_STATUS: unsupported label_status %', p_label_status;
  end if;

  if coalesce(p_payment_status, '') not in ('paid', 'unpaid', 'failed') then
    raise exception 'INVALID_PAYMENT_STATUS: unsupported payment_status %', p_payment_status;
  end if;

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

  if v_existing_id is not null then
    raise exception 'IDEMPOTENCY_CONFLICT: existing shipment % has status %', v_existing_id, v_existing_status;
  end if;

  select coalesce(sum(amount), 0)
  into v_balance
  from public.balance_movements
  where user_id = p_user_id;

  if v_balance < p_customer_price then
    raise exception 'INSUFFICIENT_FUNDS: available balance % < required %', v_balance, p_customer_price;
  end if;

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
    p_provider, p_provider_shipment_id, p_provider_label_id, p_provider_rate_id,
    p_provider_service_code, p_label_url, p_label_format,
    p_payment_status, p_label_status,
    p_provider_cost, p_platform_markup, p_customer_price, p_currency,
    p_payment_fee,
    coalesce(p_pricing_subtotal, p_provider_cost + p_platform_markup),
    coalesce(p_pricing_model, 'shipflow_v1'),
    coalesce(p_pricing_breakdown, '{}'::jsonb),
    p_idempotency_key,
    coalesce(p_metadata, '{}'::jsonb)
  );

  insert into public.tracking_events (
    shipment_id, user_id, tracking_number,
    title, description, status,
    source, is_real
  ) values (
    p_shipment_id, p_user_id, p_tracking_number,
    'Label purchased',
    'Label created. Carrier: ' || p_carrier_code || ', Service: ' || p_provider_service_code || '.',
    'Pendiente',
    p_provider, true
  );

  insert into public.balance_movements (
    id, user_id, concept, amount, type,
    reference_type, reference_id, shipment_id,
    idempotency_key, created_by, metadata
  ) values (
    'MOV-' || gen_random_uuid()::text,
    p_user_id,
    'Shipping label ' || p_tracking_number,
    -p_customer_price,
    'debit',
    'shipment', p_shipment_id, p_shipment_id,
    p_idempotency_key, p_user_id,
    jsonb_build_object(
      'trackingNumber', p_tracking_number,
      'providerShipmentId', p_provider_shipment_id,
      'providerLabelId', p_provider_label_id,
      'providerRateId', p_provider_rate_id,
      'source', 'label_purchase_rpc',
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
    'shipment_id', p_shipment_id,
    'tracking_number', p_tracking_number,
    'provider_label_id', p_provider_label_id,
    'provider_rate_id', p_provider_rate_id,
    'label_url', p_label_url
  );
end;
$$;

revoke all on function public.create_label_shipment_transaction from public;
grant execute on function public.create_label_shipment_transaction to service_role;
