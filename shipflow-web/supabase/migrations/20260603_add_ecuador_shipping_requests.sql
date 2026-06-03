-- FASE 5.76 — Ecuador Shipping beta request data flow
-- Purpose: additive regional shipment request storage for Ecuador beta operations only.
-- No Delivereo calls, no payment logic, and no Shipping Labels changes are introduced here.

create table if not exists regional_shipments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  market text not null default 'EC',
  service_type text not null default 'ecuador_delivery',
  provider text not null default 'manual',
  status text not null default 'draft',
  payment_status text not null default 'unpaid',
  provider_order_id text,
  provider_tracking_id text,
  provider_status text,
  origin_name text,
  origin_phone text,
  origin_address text,
  origin_city text,
  origin_reference text,
  destination_name text,
  destination_phone text,
  destination_address text,
  destination_city text,
  destination_reference text,
  package_description text,
  package_weight numeric,
  package_length numeric,
  package_width numeric,
  package_height numeric,
  declared_value integer,
  provider_cost integer,
  customer_price integer,
  margin integer,
  customer_notes text,
  admin_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists regional_shipment_events (
  id uuid primary key default gen_random_uuid(),
  regional_shipment_id uuid not null references regional_shipments(id) on delete cascade,
  visibility text not null default 'customer',
  status text,
  title text not null,
  message text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists regional_shipments_user_id_idx
  on regional_shipments (user_id, created_at desc);

create index if not exists regional_shipments_market_status_idx
  on regional_shipments (market, status, created_at desc);

create index if not exists regional_shipment_events_order_idx
  on regional_shipment_events (regional_shipment_id, created_at desc);

create or replace function set_regional_shipments_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists regional_shipments_updated_at on regional_shipments;

create trigger regional_shipments_updated_at
  before update on regional_shipments
  for each row execute function set_regional_shipments_updated_at();

alter table regional_shipments enable row level security;
alter table regional_shipment_events enable row level security;

create policy "regional_shipments: user read own"
  on regional_shipments for select
  using (auth.uid() = user_id);

create policy "regional_shipments: user create own"
  on regional_shipments for insert
  with check (auth.uid() = user_id);

create policy "regional_shipment_events: user read own customer-visible"
  on regional_shipment_events for select
  using (
    visibility = 'customer'
    and exists (
      select 1 from regional_shipments
      where regional_shipments.id = regional_shipment_events.regional_shipment_id
        and regional_shipments.user_id = auth.uid()
    )
  );

-- Regular users cannot update/delete regional rows directly.
-- Admin and internal operations use the service role through admin-only APIs.
