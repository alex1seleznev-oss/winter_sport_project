-- Register the public IBU Datacenter endpoint as an authority-level-5 source.
-- IBU describes biathlonresults.com as its Datacenter; this row is deliberately
-- scoped to the Events API root while story intake pins season and level separately.

insert into public.source_feeds(name,kind,url,authority_level,active)
values(
  'IBU Datacenter',
  'official_datacenter',
  'https://biathlonresults.com/modules/sportapi/api/Events',
  5,
  true
)
on conflict(url) do nothing;

do $$
begin
  if not exists(
    select 1
    from public.source_feeds
    where url='https://biathlonresults.com/modules/sportapi/api/Events'
      and active=true
      and authority_level>=5
  ) then
    raise exception 'IBU_DATACENTER_SOURCE_NOT_APPROVED';
  end if;
end
$$;
