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
