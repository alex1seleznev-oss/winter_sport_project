create table public.athlete_timeline (
 id bigint generated always as identity primary key,
 athlete_id bigint not null references public.athletes(id) on delete cascade,
 occurred_at timestamptz not null,
 item_type text not null,
 title text,
 summary text,
 source_url text not null,
 source_kind text not null,
 reliability smallint not null default 3 check(reliability between 1 and 5),
 payload jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 unique(athlete_id,source_url)
);
create index athlete_timeline_idx on public.athlete_timeline(athlete_id,occurred_at desc);
alter table public.athlete_timeline enable row level security;
create policy "athlete_timeline_public_read" on public.athlete_timeline for select to anon,authenticated using(true);
grant select on public.athlete_timeline to anon,authenticated;

create table public.ingestion_runs (
 id bigint generated always as identity primary key,
 source_id bigint references public.source_feeds(id) on delete set null,
 started_at timestamptz not null default now(),
 finished_at timestamptz,
 status text not null default 'running',
 items_seen integer not null default 0,
 items_written integer not null default 0,
 error_message text
);
alter table public.ingestion_runs enable row level security;
create policy "ingestion_runs_public_read" on public.ingestion_runs for select to anon,authenticated using(true);
grant select on public.ingestion_runs to anon,authenticated;