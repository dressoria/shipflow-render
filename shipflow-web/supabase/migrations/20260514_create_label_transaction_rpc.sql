-- ShipFlow FASE 4B: transactional RPC for ShipStation label creation.
-- This function replaces the sequential inserts in createShipStationShipment.ts
-- with a single atomic transaction that includes idempotency check and balance validation.
--
-- STATUS: NOT EXECUTED. Apply manually in Supabase after review and after the FASE 1C
-- migration (20260514_shipflow_security_logistics_foundation.sql) is already applied.
--
-- PREREQUISITE: The FASE 1C migration must be applied before this one.
-- USAGE: Call from the server-side via supabase.rpc('create_label_shipment_transaction', {...})
-- SECURITY: SECURITY DEFINER — runs with table owner privileges but validates user_id.

create extension if not exists "pgcrypto";

create or replace function public.create_label_shipment_transaction(
  p_user_id           uuid,
  p_idempotency_key   text,
  p_shipment_id       text,
  p_tracking_number   text,
  p_sender_name       text,
  p_sender_phone      text,
  p_origin_city       text,
  p_recipient_name    text,
  p_recipient_phone   text,
  p_destination_city  text,
  p_destination_addr  text,
  p_weight            numeric,
  p_product_type      text,
  p_carrier_code      text,
  p_shipping_subtotal numeric,
  p_total             numeric,
  p_provider          text,
  p_provider_shipment_id  text,
  p_provider_label_id     text,
  p_provider_service_code text,
  p_provider_cost     numeric,
  p_platform_markup   numeric,
  p_customer_price    numeric,
  p_currency          text,
  p_metadata          jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_id       text;
  v_existing_status   text;
  v_balance           numeric;
begin
  -- 1. Idempotency check: return existing shipment if already purchased.
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

  -- 3. Insert shipment record with all provider fields.
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
    idempotency_key, metadata
  ) values (
    p_shipment_id, p_user_id, p_tracking_number,
    p_sender_name, p_sender_phone, p_origin_city,
    p_recipient_name, p_recipient_phone, p_destination_city, p_destination_addr,
    p_weight, p_product_type, p_carrier_code,
    p_shipping_subtotal, 0, p_total,
    false, 0, 'Pendiente', p_customer_price,
    p_provider, p_provider_shipment_id, p_provider_label_id, null,
    p_provider_service_code, null, null,
    'paid', 'purchased',
    p_provider_cost, p_platform_markup, p_customer_price, p_currency,
    p_idempotency_key, p_metadata
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

  -- 5. Insert balance deduction (negative debit). Must be type = 'debit' to satisfy RLS.
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
      'serviceCode', p_provider_service_code
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
