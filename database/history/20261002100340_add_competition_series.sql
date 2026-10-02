create table public.competitions (
 id bigint generated always as identity primary key,
 external_key text not null unique,
 sport text not null,
 scope text not null,
 series text not null,
 name text not null,
 location text,
 country text,
 start_date date not null,
 end_date date not null,
 source_url text,
 source_feed_id bigint references public.source_feeds(id),
 status text not null default 'scheduled',
 verified_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.competitions enable row level security;
create policy "competitions_public_read" on public.competitions for select to anon,authenticated using(true);
grant select on public.competitions to anon,authenticated;
alter table public.events add column if not exists competition_id bigint references public.competitions(id) on delete set null;