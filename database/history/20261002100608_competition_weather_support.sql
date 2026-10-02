alter table public.competitions add column if not exists latitude numeric;
alter table public.competitions add column if not exists longitude numeric;
alter table public.weather_snapshots add column if not exists competition_id bigint references public.competitions(id) on delete cascade;
create index if not exists weather_competition_time_idx on public.weather_snapshots(competition_id,forecast_for);