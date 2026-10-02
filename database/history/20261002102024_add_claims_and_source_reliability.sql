create table public.claims (
 id bigint generated always as identity primary key,
 event_id bigint references public.events(id) on delete cascade,
 athlete_id bigint references public.athletes(id) on delete cascade,
 claim_type text not null,
 claim_text text not null,
 status text not null default 'unverified' check(status in ('unverified','corroborated','confirmed','disputed','false')),
 confidence numeric(4,3) not null default 0.3 check(confidence between 0 and 1),
 first_seen_at timestamptz not null default now(),
 verified_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.claims enable row level security;
create policy "claims_public_read" on public.claims for select to anon,authenticated using(true);
grant select on public.claims to anon,authenticated;

create table public.claim_evidence (
 id bigint generated always as identity primary key,
 claim_id bigint not null references public.claims(id) on delete cascade,
 intelligence_item_id bigint references public.intelligence_items(id) on delete cascade,
 source_feed_id bigint references public.source_feeds(id) on delete set null,
 stance text not null default 'supports' check(stance in ('supports','contradicts','mentions')),
 weight numeric(4,3) not null default 0.5 check(weight between 0 and 1),
 created_at timestamptz not null default now(),
 unique(claim_id,intelligence_item_id)
);
alter table public.claim_evidence enable row level security;
create policy "claim_evidence_public_read" on public.claim_evidence for select to anon,authenticated using(true);
grant select on public.claim_evidence to anon,authenticated;

create table public.source_performance (
 source_feed_id bigint primary key references public.source_feeds(id) on delete cascade,
 claims_total integer not null default 0,
 claims_confirmed integer not null default 0,
 claims_disputed integer not null default 0,
 empirical_reliability numeric(5,4),
 updated_at timestamptz not null default now()
);
alter table public.source_performance enable row level security;
create policy "source_performance_public_read" on public.source_performance for select to anon,authenticated using(true);
grant select on public.source_performance to anon,authenticated;