-- FASE 5.85 — Shared Address Book Supabase persistence

create table if not exists public.user_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  country text not null check (country in ('EC', 'US')),
  type text not null check (type in ('sender', 'recipient', 'both')),
  contact_name text,
  company text,
  phone text,
  email text,
  address_line1 text not null,
  address_line2 text,
  reference text,
  city text not null,
  state_province text,
  postal_code text,
  latitude numeric,
  longitude numeric,
  is_default_sender boolean not null default false,
  is_default_recipient boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_addresses_user_id_idx on public.user_addresses(user_id);
create index if not exists user_addresses_user_country_idx on public.user_addresses(user_id, country);
create index if not exists user_addresses_label_idx on public.user_addresses(user_id, label);

create or replace function public.set_user_addresses_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_addresses_updated_at on public.user_addresses;
create trigger user_addresses_updated_at
before update on public.user_addresses
for each row execute function public.set_user_addresses_updated_at();

alter table public.user_addresses enable row level security;

drop policy if exists "user_addresses_select_own" on public.user_addresses;
create policy "user_addresses_select_own"
on public.user_addresses for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_addresses_insert_own" on public.user_addresses;
create policy "user_addresses_insert_own"
on public.user_addresses for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "user_addresses_update_own" on public.user_addresses;
create policy "user_addresses_update_own"
on public.user_addresses for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "user_addresses_delete_own" on public.user_addresses;
create policy "user_addresses_delete_own"
on public.user_addresses for delete
to authenticated
using (auth.uid() = user_id);
