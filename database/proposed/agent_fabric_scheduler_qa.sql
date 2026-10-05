-- Production delta for deterministic QA scheduling.
-- The application scheduler gained the deterministic-qa worker in Agent Fabric v4;
-- widen the guarded database candidate RPC by exactly one role. Publisher remains
-- excluded independently of caller input and publication approvals.

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
    and j.agent_id in ('research','fact-check','editorial-writer','visual-director','qa')
    and public.agent_job_ready(j.id)
  order by j.available_at asc,j.created_at asc,j.id asc
  limit least(greatest(coalesce(p_limit,5),1),20)
$$;

revoke all on function public.agent_dispatch_candidates(text[],integer) from public,anon,authenticated;
grant execute on function public.agent_dispatch_candidates(text[],integer) to service_role;
