create table public.source_feeds (
 id bigint generated always as identity primary key,
 name text not null,
 kind text not null,
 url text not null unique,
 authority_level smallint not null default 3,
 active boolean not null default true,
 last_checked_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.source_feeds enable row level security;
create policy "source_feeds_public_read" on public.source_feeds for select to anon, authenticated using (true);
grant select on public.source_feeds to anon, authenticated;

create table public.event_updates (
 id bigint generated always as identity primary key,
 event_id bigint references public.events(id) on delete cascade,
 source_id bigint references public.source_feeds(id) on delete set null,
 field_name text not null,
 previous_value text,
 current_value text,
 detected_at timestamptz not null default now(),
 verified boolean not null default false
);
alter table public.event_updates enable row level security;
create policy "event_updates_public_read" on public.event_updates for select to anon, authenticated using (true);
grant select on public.event_updates to anon, authenticated;

create table public.intelligence_items (
 id bigint generated always as identity primary key,
 event_id bigint references public.events(id) on delete cascade,
 source_id bigint references public.source_feeds(id) on delete set null,
 item_kind text not null,
 title text,
 url text not null,
 summary text,
 published_at timestamptz,
 fetched_at timestamptz not null default now(),
 reliability smallint not null default 3,
 unique(url)
);
alter table public.intelligence_items enable row level security;
create policy "intelligence_public_read" on public.intelligence_items for select to anon, authenticated using (true);
grant select on public.intelligence_items to anon, authenticated;

create table public.weather_snapshots (
 id bigint generated always as identity primary key,
 event_id bigint references public.events(id) on delete cascade,
 forecast_for timestamptz not null,
 temperature_c numeric,
 wind_mps numeric,
 gust_mps numeric,
 precipitation_mm numeric,
 condition text,
 source_url text,
 fetched_at timestamptz not null default now()
);
alter table public.weather_snapshots enable row level security;
create policy "weather_public_read" on public.weather_snapshots for select to anon, authenticated using (true);
grant select on public.weather_snapshots to anon, authenticated;