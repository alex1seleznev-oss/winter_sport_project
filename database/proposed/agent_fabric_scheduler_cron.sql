-- Production scheduler trigger for bounded Agent Fabric model jobs.
-- The bearer secret itself is generated directly inside Supabase Vault and is never committed.

create extension if not exists pg_cron with schema extensions;

create or replace function public.agent_scheduler_tick()
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  bearer text;
  request_id bigint;
begin
  select decrypted_secret
    into bearer
    from vault.decrypted_secrets
   where name = 'agent_fabric_scheduler_bearer_v1'
   order by updated_at desc
   limit 1;

  if bearer is null or length(bearer) < 32 then
    raise exception 'AGENT_SCHEDULER_SECRET_MISSING' using errcode = '22023';
  end if;

  select net.http_get(
    url := 'https://winter-sport-project.vercel.app/api/agent-scheduler',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || bearer,
      'User-Agent', 'winter-sports-agent-scheduler/1'
    ),
    timeout_milliseconds := 4500
  ) into request_id;

  return request_id;
end;
$$;

revoke all on function public.agent_scheduler_tick() from public;
revoke all on function public.agent_scheduler_tick() from anon;
revoke all on function public.agent_scheduler_tick() from authenticated;
grant execute on function public.agent_scheduler_tick() to service_role;

select cron.schedule(
  'agent-fabric-model-scheduler',
  '*/5 * * * *',
  $$select public.agent_scheduler_tick();$$
);
