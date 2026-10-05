-- Return a bounded list of ready durable jobs that the caller is allowed to dispatch.
-- Keep the database fail-closed as well as the application scheduler: only the four
-- reviewed model-runtime specialist roles may ever be returned by this RPC.

create or replace function public.agent_dispatch_candidates(
  p_agent_ids text[],
  p_limit integer default 5
)
returns table(job_id uuid)
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select j.id
  from public.agent_jobs j
  where j.status='queued'
    and coalesce(array_length(p_agent_ids,1),0)>0
    and j.agent_id=any(p_agent_ids)
    and j.agent_id in ('research','fact-check','editorial-writer','visual-director')
    and public.agent_job_ready(j.id)
  order by j.available_at asc,j.created_at asc,j.id asc
  limit least(greatest(coalesce(p_limit,5),1),20)
$$;

revoke all on function public.agent_dispatch_candidates(text[],integer) from public,anon,authenticated;
grant execute on function public.agent_dispatch_candidates(text[],integer) to service_role;
