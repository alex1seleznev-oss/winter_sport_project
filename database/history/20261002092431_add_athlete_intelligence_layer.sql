create table public.athletes (
 id bigint generated always as identity primary key,
 full_name text not null,
 sport text not null,
 gender text,
 nation text,
 external_ids jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 unique(full_name,sport,nation)
);
alter table public.athletes enable row level security;
create policy "athletes_public_read" on public.athletes for select to anon,authenticated using(true);
grant select on public.athletes to anon,authenticated;

create table public.athlete_results (
 id bigint generated always as identity primary key,
 athlete_id bigint not null references public.athletes(id) on delete cascade,
 event_id bigint references public.events(id) on delete cascade,
 result_date date,
 rank integer,
 finish_time_seconds numeric,
 time_behind_seconds numeric,
 ski_time_seconds numeric,
 shooting_total integer,
 shooting_misses integer,
 shooting_prone_misses integer,
 shooting_standing_misses integer,
 shooting_time_seconds numeric,
 intermediate jsonb not null default '{}'::jsonb,
 source_url text,
 created_at timestamptz not null default now(),
 unique(athlete_id,event_id)
);
create index athlete_results_athlete_date_idx on public.athlete_results(athlete_id,result_date desc);
alter table public.athlete_results enable row level security;
create policy "athlete_results_public_read" on public.athlete_results for select to anon,authenticated using(true);
grant select on public.athlete_results to anon,authenticated;

create table public.analysis_hypotheses (
 id bigint generated always as identity primary key,
 event_id bigint references public.events(id) on delete cascade,
 athlete_id bigint references public.athletes(id) on delete cascade,
 hypothesis_type text not null,
 statement text not null,
 evidence jsonb not null default '[]'::jsonb,
 confidence numeric(4,3) not null check(confidence between 0 and 1),
 created_before_event boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.analysis_hypotheses enable row level security;
create policy "analysis_hypotheses_public_read" on public.analysis_hypotheses for select to anon,authenticated using(true);
grant select on public.analysis_hypotheses to anon,authenticated;

create table public.hypothesis_evaluations (
 id bigint generated always as identity primary key,
 hypothesis_id bigint not null references public.analysis_hypotheses(id) on delete cascade unique,
 outcome text not null check(outcome in ('supported','mixed','not_supported','insufficient_data')),
 score numeric(5,4),
 explanation text,
 evidence jsonb not null default '[]'::jsonb,
 evaluated_at timestamptz not null default now()
);
alter table public.hypothesis_evaluations enable row level security;
create policy "hypothesis_evaluations_public_read" on public.hypothesis_evaluations for select to anon,authenticated using(true);
grant select on public.hypothesis_evaluations to anon,authenticated;