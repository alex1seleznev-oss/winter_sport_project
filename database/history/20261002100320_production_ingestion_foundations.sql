alter table public.events add column if not exists external_key text unique;
alter table public.events add column if not exists source_feed_id bigint references public.source_feeds(id);
alter table public.events add column if not exists source_updated_at timestamptz;
alter table public.events add column if not exists verified_at timestamptz;
alter table public.events add column if not exists source_confidence smallint default 5 check(source_confidence between 1 and 5);
create index if not exists events_external_key_idx on public.events(external_key);

create table if not exists public.source_accounts (
 id bigint generated always as identity primary key,
 athlete_id bigint references public.athletes(id) on delete cascade,
 platform text not null,
 handle text,
 url text not null unique,
 official boolean not null default false,
 active boolean not null default true,
 reliability smallint not null default 3 check(reliability between 1 and 5),
 last_checked_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.source_accounts enable row level security;
create policy "source_accounts_public_read" on public.source_accounts for select to anon,authenticated using(true);
grant select on public.source_accounts to anon,authenticated;

create table if not exists public.event_features (
 id bigint generated always as identity primary key,
 event_id bigint not null references public.events(id) on delete cascade,
 athlete_id bigint references public.athletes(id) on delete cascade,
 feature_key text not null,
 feature_value numeric,
 feature_json jsonb not null default '{}'::jsonb,
 sample_size integer,
 calculated_at timestamptz not null default now(),
 unique(event_id,athlete_id,feature_key)
);
alter table public.event_features enable row level security;
create policy "event_features_public_read" on public.event_features for select to anon,authenticated using(true);
grant select on public.event_features to anon,authenticated;