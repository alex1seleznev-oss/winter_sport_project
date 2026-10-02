create table public.editorial_queue (
 id bigint generated always as identity primary key,
 event_id bigint references public.events(id) on delete cascade,
 job_type text not null check(job_type in ('preview','startlist_update','live_note','recap','deep_analysis','broadcast_update')),
 status text not null default 'queued' check(status in ('queued','ready','published','skipped','error')),
 evidence jsonb not null default '[]'::jsonb,
 draft jsonb not null default '{}'::jsonb,
 priority smallint not null default 3,
 scheduled_for timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(event_id,job_type)
);
alter table public.editorial_queue enable row level security;
create policy "editorial_queue_public_read" on public.editorial_queue for select to anon,authenticated using(status in ('ready','published'));
grant select on public.editorial_queue to anon,authenticated;

create table public.broadcast_checks (
 id bigint generated always as identity primary key,
 event_id bigint references public.events(id) on delete cascade,
 checked_at timestamptz not null default now(),
 provider text not null,
 candidate_url text,
 region text,
 status text not null check(status in ('found','not_found','geo_restricted','needs_verification')),
 evidence_url text,
 unique(event_id,provider,checked_at)
);
alter table public.broadcast_checks enable row level security;
create policy "broadcast_checks_public_read" on public.broadcast_checks for select to anon,authenticated using(true);
grant select on public.broadcast_checks to anon,authenticated;