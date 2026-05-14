create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  business_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, business_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'business_name',
    case
      when new.email = 'admin@shipflow.local' then 'admin'
      else 'user'
    end
  )
  on conflict (id) do update
  set
    email = excluded.email,
    business_name = coalesce(excluded.business_name, public.profiles.business_name),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles
add column if not exists role text not null default 'user'
check (role in ('user', 'admin'));

create table if not exists public.shipments (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  tracking_number text not null unique,
  sender_name text not null,
  sender_phone text not null,
  origin_city text not null,
  recipient_name text not null,
  recipient_phone text not null,
  destination_city text not null,
  destination_address text not null,
  weight numeric(10, 2) not null check (weight > 0),
  product_type text not null,
  courier text not null,
  shipping_subtotal numeric(10, 2) not null default 0 check (shipping_subtotal >= 0),
  cash_on_delivery_commission numeric(10, 2) not null default 0 check (cash_on_delivery_commission >= 0),
  total numeric(10, 2) not null default 0 check (total >= 0),
  cash_on_delivery boolean not null default false,
  cash_amount numeric(10, 2) not null default 0 check (cash_amount >= 0),
  status text not null default 'Pendiente' check (status in ('Entregado', 'En tránsito', 'Pendiente')),
  value numeric(10, 2) not null default 0 check (value >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shipments
add column if not exists shipping_subtotal numeric(10, 2) not null default 0 check (shipping_subtotal >= 0);

alter table public.shipments
add column if not exists cash_on_delivery_commission numeric(10, 2) not null default 0 check (cash_on_delivery_commission >= 0);

alter table public.shipments
add column if not exists total numeric(10, 2) not null default 0 check (total >= 0);

create table if not exists public.balance_movements (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  concept text not null,
  amount numeric(10, 2) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.tracking_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id text not null references public.shipments(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  tracking_number text not null,
  title text not null,
  description text,
  status text not null check (status in ('Entregado', 'En tránsito', 'Pendiente')),
  created_at timestamptz not null default now()
);

create table if not exists public.couriers (
  id text primary key,
  nombre text not null,
  activo boolean not null default true,
  logo_url text,
  cobertura text not null,
  precio_base numeric(10, 2) not null default 0 check (precio_base >= 0),
  precio_por_kg numeric(10, 2) not null default 0 check (precio_por_kg >= 0),
  permite_contra_entrega boolean not null default false,
  comision_contra_entrega numeric(10, 2) not null default 0 check (comision_contra_entrega >= 0),
  tiempo_estimado text not null,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shipments_user_id_idx on public.shipments(user_id);
create index if not exists shipments_tracking_number_idx on public.shipments(tracking_number);
create index if not exists balance_movements_user_id_idx on public.balance_movements(user_id);
create index if not exists tracking_events_tracking_number_idx on public.tracking_events(tracking_number);
create index if not exists couriers_activo_idx on public.couriers(activo);

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

alter table public.profiles enable row level security;
alter table public.shipments enable row level security;
alter table public.balance_movements enable row level security;
alter table public.tracking_events enable row level security;
alter table public.couriers enable row level security;

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
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

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

drop policy if exists "balance_movements_insert_own" on public.balance_movements;
create policy "balance_movements_insert_own"
on public.balance_movements for insert
with check (auth.uid() = user_id);

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
