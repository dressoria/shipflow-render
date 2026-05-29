-- FASE 5.65 — SendiFlash Prep managed MVP
-- Purpose: manual-managed Amazon FBA prep requests, reviewed and updated by SendiFlash admins.
--
-- STATUS: PROPOSED — review and apply manually in staging first.
-- This migration does not touch shipping labels, wallet, Stripe, refunds, voids, or provider tables.

do $$
begin
  create type prep_order_status as enum (
    'quote_requested',
    'under_review',
    'awaiting_inventory',
    'inventory_received',
    'prep_in_progress',
    'action_required',
    'ready_to_ship_to_amazon',
    'shipped_to_amazon',
    'completed',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type prep_order_visibility as enum ('customer', 'internal');
exception
  when duplicate_object then null;
end $$;

create table if not exists prep_orders (
  id                         uuid primary key default gen_random_uuid(),
  user_id                    uuid not null references auth.users(id) on delete cascade,
  status                     prep_order_status not null default 'quote_requested',
  service_type               text not null default 'managed_fba_prep',
  marketplace                text not null default 'amazon_fba',
  business_name              text,
  contact_name               text not null,
  contact_email              text not null,
  contact_phone              text,
  product_summary            text not null,
  total_units                integer not null default 0 check (total_units >= 0),
  total_cartons              integer not null default 0 check (total_cartons >= 0),
  estimated_unit_price       integer,
  estimated_total            integer,
  final_unit_price           integer,
  final_total                integer,
  partner_cost_total         integer,
  margin_total               integer,
  customer_notes             text,
  admin_notes                text,
  partner_name_internal      text,
  partner_reference_internal text,
  receiving_reference        text,
  metadata                   jsonb not null default '{}'::jsonb,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

create table if not exists prep_order_items (
  id              uuid primary key default gen_random_uuid(),
  prep_order_id   uuid not null references prep_orders(id) on delete cascade,
  sku             text,
  product_name    text not null,
  asin            text,
  units           integer not null default 0 check (units >= 0),
  cartons         integer not null default 0 check (cartons >= 0),
  prep_services   text[] not null default '{}'::text[],
  notes           text,
  created_at      timestamptz not null default now()
);

create table if not exists prep_order_events (
  id              uuid primary key default gen_random_uuid(),
  prep_order_id   uuid not null references prep_orders(id) on delete cascade,
  visibility      prep_order_visibility not null default 'customer',
  status          prep_order_status,
  title           text not null,
  message         text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create table if not exists prep_order_documents (
  id              uuid primary key default gen_random_uuid(),
  prep_order_id   uuid not null references prep_orders(id) on delete cascade,
  visibility      prep_order_visibility not null default 'customer',
  file_name       text not null,
  file_url        text,
  storage_path    text,
  document_type   text,
  created_at      timestamptz not null default now()
);

create index if not exists prep_orders_user_id_idx
  on prep_orders (user_id, created_at desc);

create index if not exists prep_orders_status_idx
  on prep_orders (status, created_at desc);

create index if not exists prep_order_items_order_idx
  on prep_order_items (prep_order_id);

create index if not exists prep_order_events_order_idx
  on prep_order_events (prep_order_id, created_at desc);

create index if not exists prep_order_documents_order_idx
  on prep_order_documents (prep_order_id, created_at desc);

create or replace function set_prep_orders_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists prep_orders_updated_at on prep_orders;

create trigger prep_orders_updated_at
  before update on prep_orders
  for each row execute function set_prep_orders_updated_at();

alter table prep_orders enable row level security;
alter table prep_order_items enable row level security;
alter table prep_order_events enable row level security;
alter table prep_order_documents enable row level security;

create policy "prep_orders: user read own"
  on prep_orders for select
  using (auth.uid() = user_id);

create policy "prep_orders: user create own"
  on prep_orders for insert
  with check (auth.uid() = user_id);

create policy "prep_order_items: user read own"
  on prep_order_items for select
  using (
    exists (
      select 1 from prep_orders
      where prep_orders.id = prep_order_items.prep_order_id
        and prep_orders.user_id = auth.uid()
    )
  );

create policy "prep_order_items: user create own"
  on prep_order_items for insert
  with check (
    exists (
      select 1 from prep_orders
      where prep_orders.id = prep_order_items.prep_order_id
        and prep_orders.user_id = auth.uid()
    )
  );

create policy "prep_order_events: user read own customer-visible"
  on prep_order_events for select
  using (
    visibility = 'customer'
    and exists (
      select 1 from prep_orders
      where prep_orders.id = prep_order_events.prep_order_id
        and prep_orders.user_id = auth.uid()
    )
  );

create policy "prep_order_documents: user read own customer-visible"
  on prep_order_documents for select
  using (
    visibility = 'customer'
    and exists (
      select 1 from prep_orders
      where prep_orders.id = prep_order_documents.prep_order_id
        and prep_orders.user_id = auth.uid()
    )
  );

-- Regular users cannot update/delete Prep rows directly.
-- Admin operations use service role through admin-only API routes.
