-- FASE 5.33
-- Stripe Checkout recharge records.
--
-- Safe to review/apply manually in Supabase SQL Editor after backup.
-- Do not run automatically from Codex.

create extension if not exists "pgcrypto";

create table if not exists public.payment_recharges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  stripe_event_id text unique,
  amount numeric(10, 2) not null,
  currency text not null default 'usd',
  status text not null default 'pending',
  balance_movement_id text references public.balance_movements(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_recharges_amount_positive_check check (amount > 0),
  constraint payment_recharges_currency_usd_check check (currency = 'usd'),
  constraint payment_recharges_status_check check (status in ('pending', 'paid', 'failed', 'canceled', 'refunded'))
);

create index if not exists payment_recharges_user_id_idx
  on public.payment_recharges(user_id);

create index if not exists payment_recharges_status_idx
  on public.payment_recharges(status);

create index if not exists payment_recharges_checkout_session_idx
  on public.payment_recharges(stripe_checkout_session_id);

create index if not exists payment_recharges_payment_intent_idx
  on public.payment_recharges(stripe_payment_intent_id);

create index if not exists payment_recharges_created_at_idx
  on public.payment_recharges(created_at);

create or replace function public.set_payment_recharges_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_payment_recharges_updated_at on public.payment_recharges;
create trigger set_payment_recharges_updated_at
before update on public.payment_recharges
for each row execute function public.set_payment_recharges_updated_at();

alter table public.payment_recharges enable row level security;

drop policy if exists "payment_recharges_select_own" on public.payment_recharges;
create policy "payment_recharges_select_own"
on public.payment_recharges for select
using (
  auth.uid() = user_id
  or public.is_admin()
);

-- No insert/update/delete policies are granted to authenticated users.
-- Writes are server-side only through service_role after API/webhook validation.
