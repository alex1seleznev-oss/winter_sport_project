
create table public.events (
  id bigint generated always as identity primary key,
  event_date date,
  start_time_msk time,
  sport text not null check (sport in ('biathlon','cross_country')),
  scope text not null check (scope in ('international','russia')),
  gender text not null check (gender in ('men','women','mixed')),
  series text not null,
  location text,
  country text,
  discipline text not null,
  distance text,
  stage text,
  broadcaster text,
  stream_url text,
  source_url text,
  status text not null default 'scheduled' check (status in ('scheduled','tentative','completed','cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index events_date_idx on public.events(event_date);
create index events_sport_scope_idx on public.events(sport, scope);
alter table public.events enable row level security;
create policy "Public can read events"
on public.events for select
to anon, authenticated
using (true);
grant select on public.events to anon, authenticated;

create table public.sources (
  id bigint generated always as identity primary key,
  name text not null,
  category text,
  url text not null,
  created_at timestamptz not null default now()
);
alter table public.sources enable row level security;
create policy "Public can read sources"
on public.sources for select
to anon, authenticated
using (true);
grant select on public.sources to anon, authenticated;
