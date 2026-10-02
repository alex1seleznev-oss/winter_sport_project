
    alter table public.competitions
      add column if not exists source_confidence smallint not null default 5
        check (source_confidence between 1 and 5),
      add column if not exists notes text;
  