-- ShipFlow FASE 1C: security and logistics foundation.
-- Apply manually in Supabase after review. This migration is not executed by Codex.

create extension if not exists "pgcrypto";

alter table public.profiles enable row level security;
alter table public.shipments enable row level security;
alter table public.balance_movements enable row level security;
alter table public.tracking_events enable row level security;
alter table public.couriers enable row level security;

-- A. Profiles security foundation.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$;

create or replace function public.protect_profile_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'profile id cannot be changed';
  end if;

  if new.created_at is distinct from old.created_at then
    raise exception 'profile created_at cannot be changed';
  end if;

  if new.role is distinct from old.role
    and auth.role() <> 'service_role'
    and not public.is_admin()
  then
    raise exception 'profile role cannot be changed by this user';
  end if;

  if new.email is distinct from old.email
    and auth.role() <> 'service_role'
    and not public.is_admin()
  then
    raise exception 'profile email cannot be changed by this user';
  end if;

  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists protect_profile_admin_fields on public.profiles;
create trigger protect_profile_admin_fields
before update on public.profiles
for each row execute function public.protect_profile_admin_fields();

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (
  auth.uid() = id
  or public.is_admin()
);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (
  auth.uid() = id
  and role = 'user'
);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
on public.profiles for update
using (public.is_admin())
with check (public.is_admin());

-- B. Shipments logistics foundation.
alter table public.shipments
  add column if not exists provider text,
  add column if not exists provider_shipment_id text,
  add column if not exists provider_label_id text,
  add column if not exists provider_rate_id text,
  add column if not exists provider_service_code text,
  add column if not exists label_url text,
  add column if not exists label_format text,
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists label_status text not null default 'internal',
  add column if not exists provider_cost numeric(10, 2),
  add column if not exists platform_markup numeric(10, 2) not null default 0,
  add column if not exists customer_price numeric(10, 2),
  add column if not exists currency text not null default 'USD',
  add column if not exists idempotency_key text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.shipments
  drop constraint if exists shipments_provider_cost_check,
  add constraint shipments_provider_cost_check
    check (provider_cost is null or provider_cost >= 0);

alter table public.shipments
  drop constraint if exists shipments_platform_markup_check,
  add constraint shipments_platform_markup_check
    check (platform_markup >= 0);

alter table public.shipments
  drop constraint if exists shipments_customer_price_check,
  add constraint shipments_customer_price_check
    check (customer_price is null or customer_price >= 0);

alter table public.shipments
  drop constraint if exists shipments_payment_status_check,
  add constraint shipments_payment_status_check
    check (payment_status in ('unpaid', 'paid', 'refunded', 'failed'));

alter table public.shipments
  drop constraint if exists shipments_label_status_check,
  add constraint shipments_label_status_check
    check (label_status in ('internal', 'pending', 'processing', 'purchased', 'failed', 'voided', 'refunded'));

create index if not exists shipments_idempotency_key_idx
  on public.shipments(user_id, idempotency_key)
  where idempotency_key is not null;

do $$
begin
  if exists (
    select 1
    from public.shipments
    where idempotency_key is not null
    group by user_id, idempotency_key
    having count(*) > 1
  ) then
    raise notice 'Skipping shipments_user_id_idempotency_key_unique_idx because duplicate idempotency keys exist.';
  else
    create unique index if not exists shipments_user_id_idempotency_key_unique_idx
      on public.shipments(user_id, idempotency_key)
      where idempotency_key is not null;
  end if;
end;
$$;

create index if not exists shipments_provider_idx on public.shipments(provider);
create index if not exists shipments_provider_label_id_idx on public.shipments(provider_label_id);
create index if not exists shipments_label_status_idx on public.shipments(label_status);
create index if not exists shipments_payment_status_idx on public.shipments(payment_status);
create index if not exists shipments_created_at_idx on public.shipments(created_at);

-- C. Balance ledger foundation.
alter table public.balance_movements
  add column if not exists type text not null default 'debit',
  add column if not exists reference_type text,
  add column if not exists reference_id text,
  add column if not exists shipment_id text references public.shipments(id) on delete set null,
  add column if not exists idempotency_key text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_by uuid references auth.users(id) on delete set null;

update public.balance_movements
set type = case
  when amount > 0 then 'recharge'
  when amount < 0 then 'debit'
  else type
end
where type = 'debit';

alter table public.balance_movements
  drop constraint if exists balance_movements_amount_nonzero_check,
  add constraint balance_movements_amount_nonzero_check
    check (amount <> 0);

alter table public.balance_movements
  drop constraint if exists balance_movements_type_check,
  add constraint balance_movements_type_check
    check (type in ('recharge', 'debit', 'refund', 'adjustment', 'fee'));

create index if not exists balance_movements_user_id_idx on public.balance_movements(user_id);
create index if not exists balance_movements_shipment_id_idx on public.balance_movements(shipment_id);
create index if not exists balance_movements_idempotency_key_idx on public.balance_movements(idempotency_key);
create index if not exists balance_movements_created_at_idx on public.balance_movements(created_at);

drop policy if exists "balance_movements_insert_own" on public.balance_movements;
drop policy if exists "balance_movements_insert_negative_own" on public.balance_movements;
create policy "balance_movements_insert_negative_own"
on public.balance_movements for insert
with check (
  auth.uid() = user_id
  and amount < 0
  and type in ('debit', 'fee')
);

drop policy if exists "shipments_select_own" on public.shipments;
create policy "shipments_select_own"
on public.shipments for select
using (
  auth.uid() = user_id
  or public.is_admin()
);

drop policy if exists "shipments_insert_own" on public.shipments;
create policy "shipments_insert_own"
on public.shipments for insert
with check (auth.uid() = user_id);

drop policy if exists "shipments_update_own" on public.shipments;
create policy "shipments_update_own"
on public.shipments for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "balance_movements_select_own" on public.balance_movements;
create policy "balance_movements_select_own"
on public.balance_movements for select
using (
  auth.uid() = user_id
  or public.is_admin()
);

-- D. Tracking event extensions from tracking_events_update.sql.
alter table public.tracking_events
  add column if not exists courier text,
  add column if not exists status_label text,
  add column if not exists location text,
  add column if not exists event_date timestamptz,
  add column if not exists source text,
  add column if not exists is_real boolean not null default false;

alter table public.tracking_events
  drop constraint if exists tracking_events_status_check;

update public.tracking_events
set event_date = created_at
where event_date is null;

create index if not exists tracking_events_event_date_idx on public.tracking_events(event_date);
create index if not exists tracking_events_is_real_idx on public.tracking_events(is_real);

drop policy if exists "tracking_events_select_own" on public.tracking_events;
create policy "tracking_events_select_own"
on public.tracking_events for select
using (
  auth.uid() = user_id
  or public.is_admin()
);

drop policy if exists "tracking_events_insert_own" on public.tracking_events;
create policy "tracking_events_insert_own"
on public.tracking_events for insert
with check (auth.uid() = user_id);

drop policy if exists "couriers_select_active_or_admin" on public.couriers;
create policy "couriers_select_active_or_admin"
on public.couriers for select
using (activo = true or public.is_admin());

drop policy if exists "couriers_insert_admin" on public.couriers;
create policy "couriers_insert_admin"
on public.couriers for insert
with check (public.is_admin());

drop policy if exists "couriers_update_admin" on public.couriers;
create policy "couriers_update_admin"
on public.couriers for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "couriers_delete_admin" on public.couriers;
create policy "couriers_delete_admin"
on public.couriers for delete
using (public.is_admin());

-- E. Webhook ingestion/audit foundation.
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text,
  event_type text not null,
  shipment_id text references public.shipments(id) on delete set null,
  tracking_number text,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'received',
  error text
);

alter table public.webhook_events
  drop constraint if exists webhook_events_status_check,
  add constraint webhook_events_status_check
    check (status in ('received', 'processing', 'processed', 'failed', 'ignored'));

create unique index if not exists webhook_events_provider_event_id_unique_idx
  on public.webhook_events(provider, event_id)
  where event_id is not null;

create index if not exists webhook_events_shipment_id_idx on public.webhook_events(shipment_id);
create index if not exists webhook_events_tracking_number_idx on public.webhook_events(tracking_number);
create index if not exists webhook_events_received_at_idx on public.webhook_events(received_at);
create index if not exists webhook_events_status_idx on public.webhook_events(status);

alter table public.webhook_events enable row level security;

drop policy if exists "webhook_events_select_admin" on public.webhook_events;
create policy "webhook_events_select_admin"
on public.webhook_events for select
using (public.is_admin());

-- F. Application audit log foundation.
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_actor_user_id_idx on public.audit_logs(actor_user_id);
create index if not exists audit_logs_action_idx on public.audit_logs(action);
create index if not exists audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at);

alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs_select_admin" on public.audit_logs;
create policy "audit_logs_select_admin"
on public.audit_logs for select
using (public.is_admin());

-- Note: a transactional RPC for create shipment + initial tracking + balance debit
-- is intentionally not activated in this phase. It should be added in a later FASE 1D follow-up or FASE 2
-- after the application has applied and verified these columns.
