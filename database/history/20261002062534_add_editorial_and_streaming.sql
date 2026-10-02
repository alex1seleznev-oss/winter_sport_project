
create table public.articles (
  id bigint generated always as identity primary key,
  event_id bigint references public.events(id) on delete cascade,
  slug text not null unique,
  article_type text not null check (article_type in ('preview','analysis','recap','news')),
  title text not null,
  dek text,
  body_md text,
  hero_image_url text,
  author text,
  published_at timestamptz,
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index articles_event_idx on public.articles(event_id);
create index articles_published_idx on public.articles(published_at desc);
alter table public.articles enable row level security;
create policy "Public can read published articles"
on public.articles for select to anon, authenticated
using (status = 'published');
grant select on public.articles to anon, authenticated;

create table public.streams (
  id bigint generated always as identity primary key,
  event_id bigint references public.events(id) on delete cascade,
  platform text not null,
  label text not null,
  url text not null,
  official boolean not null default false,
  rights_status text not null default 'unknown' check (rights_status in ('official','authorized','unknown','blocked')),
  region text,
  starts_at timestamptz,
  ends_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index streams_event_idx on public.streams(event_id);
alter table public.streams enable row level security;
create policy "Public can read allowed streams"
on public.streams for select to anon, authenticated
using (rights_status in ('official','authorized'));
grant select on public.streams to anon, authenticated;

create table public.media_assets (
  id bigint generated always as identity primary key,
  event_id bigint references public.events(id) on delete cascade,
  article_id bigint references public.articles(id) on delete cascade,
  kind text not null check (kind in ('photo','poster','map','chart','thumbnail')),
  url text not null,
  alt text,
  credit text,
  license text,
  source_url text,
  created_at timestamptz not null default now()
);
alter table public.media_assets enable row level security;
create policy "Public can read media"
on public.media_assets for select to anon, authenticated using (true);
grant select on public.media_assets to anon, authenticated;
