-- Compatibility bridge for the live legacy media-intake queue.
-- Apply immediately after agent_fabric_jobs.sql in the same migration batch.
-- New Agent Fabric jobs use agent_id/job_type and keep legacy agent_key NULL.

-- Do not enlarge the legacy registry: the active media-intake Edge Function currently
-- selects from that registry and must not see the new model-runtime role catalog.
alter table public.agent_jobs alter column agent_key drop not null;

delete from public.agent_registry r
where r.key in ('orchestrator','media-watch','photo-scout','media-curator','research','fact-check','editorial-writer','visual-director','qa','publisher')
  and not exists(select 1 from public.agent_jobs j where j.agent_key=r.key);

create or replace function public.agent_jobs_legacy_compat_fill()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if new.agent_key is not null then
    new.job_type:=coalesce(new.job_type,'legacy.'||new.agent_key);
    new.agent_id:=coalesce(new.agent_id,new.agent_key);
    new.requested_by:=coalesce(new.requested_by,'legacy');
    new.confidence:=coalesce(new.confidence,'unknown');
    new.review_required:=(new.status='awaiting_review');
    new.attempt:=coalesce(new.attempts,new.attempt,0);
    new.attempts:=coalesce(new.attempts,new.attempt,0);
    new.max_attempts:=greatest(coalesce(new.max_attempts,5),new.attempt,new.attempts,5);
    new.input_refs:=coalesce(new.input_refs,'[]'::jsonb);
    new.source_refs:=coalesce(new.source_refs,'[]'::jsonb);
    new.dependencies:=coalesce(new.dependencies,'[]'::jsonb);
    new.outputs:=coalesce(new.outputs,'[]'::jsonb);
  end if;
  return new;
end
$$;

drop trigger if exists agent_jobs_legacy_compat on public.agent_jobs;
create trigger agent_jobs_legacy_compat
before insert or update on public.agent_jobs
for each row execute function public.agent_jobs_legacy_compat_fill();

-- Existing legacy rows received the new boolean column with its DEFAULT false before
-- the compatibility trigger existed. Normalize them once so the durable projection
-- matches the legacy status semantics used for all future writes.
update public.agent_jobs
set review_required=(status='awaiting_review'),updated_at=now()
where agent_key is not null
  and job_type like 'legacy.%'
  and review_required is distinct from (status='awaiting_review');

-- Keep the existing media-intake/server workflow operational without granting it
-- access to the durable-runtime columns. All new Agent Fabric mutations remain RPC-only.
grant insert(agent_key,idempotency_key,status,payload,attempts,available_at,locked_until,created_at,updated_at)
  on public.agent_jobs to service_role;
grant update(status,payload,attempts,available_at,locked_until,updated_at)
  on public.agent_jobs to service_role;

create or replace function public.agent_enqueue_job(p_job jsonb,p_idempotency_key text)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_id uuid;
  v_existing public.agent_jobs%rowtype;
  v_status text;
  v_dependencies jsonb;
  v_agent_id text;
  v_attempt integer;
  v_max_attempts integer;
begin
  if p_job is null or jsonb_typeof(p_job)<>'object' then raise exception 'AGENT_JOB_INVALID'; end if;
  if p_idempotency_key is null or btrim(p_idempotency_key)='' or length(p_idempotency_key)>300 then raise exception 'AGENT_IDEMPOTENCY_KEY_INVALID'; end if;
  v_id := (p_job->>'jobId')::uuid;
  v_agent_id := p_job->>'agentId';
  if v_agent_id is null or v_agent_id not in ('orchestrator','media-watch','photo-scout','media-curator','research','fact-check','editorial-writer','visual-director','qa','publisher') then
    raise exception 'AGENT_ID_INVALID:%',v_agent_id;
  end if;
  v_status := coalesce(p_job->>'status','queued');
  if v_status not in ('queued','blocked') then raise exception 'AGENT_ENQUEUE_STATUS_INVALID:%',v_status; end if;
  v_dependencies := coalesce(p_job->'dependencies','[]'::jsonb);
  if jsonb_typeof(v_dependencies)<>'array' then raise exception 'AGENT_DEPENDENCIES_INVALID'; end if;
  v_attempt:=coalesce((p_job->>'attempt')::integer,0);
  v_max_attempts:=coalesce((p_job->>'maxAttempts')::integer,3);

  select * into v_existing from public.agent_jobs where idempotency_key=p_idempotency_key for update;
  if found then
    if v_existing.id<>v_id
      or v_existing.job_type<>p_job->>'type'
      or v_existing.agent_id<>v_agent_id
      or v_existing.payload<>coalesce(p_job->'payload','{}'::jsonb)
      or v_existing.input_refs<>coalesce(p_job->'inputRefs','[]'::jsonb)
      or v_existing.source_refs<>coalesce(p_job->'sourceRefs','[]'::jsonb)
      or v_existing.dependencies<>v_dependencies
    then raise exception 'AGENT_IDEMPOTENCY_CONFLICT:%',p_idempotency_key; end if;
    return v_existing.id;
  end if;

  insert into public.agent_jobs(
    id,agent_key,idempotency_key,job_type,agent_id,status,requested_by,confidence,review_required,
    attempts,attempt,max_attempts,input_refs,source_refs,dependencies,outputs,payload,available_at,locked_until,created_at,updated_at
  ) values(
    v_id,null,p_idempotency_key,p_job->>'type',v_agent_id,v_status,coalesce(p_job->>'requestedBy','system'),
    coalesce(p_job->>'confidence','unknown'),coalesce((p_job->>'reviewRequired')::boolean,false),
    v_attempt,v_attempt,v_max_attempts,coalesce(p_job->'inputRefs','[]'::jsonb),coalesce(p_job->'sourceRefs','[]'::jsonb),v_dependencies,
    coalesce(p_job->'outputs','[]'::jsonb),coalesce(p_job->'payload','{}'::jsonb),
    coalesce((p_job->>'availableAt')::timestamptz,now()),null,coalesce((p_job->>'createdAt')::timestamptz,now()),now()
  );

  insert into public.agent_job_dependencies(job_id,depends_on_job_id)
  select v_id,value::uuid from jsonb_array_elements_text(v_dependencies)
  on conflict do nothing;

  insert into public.agent_audit_events(job_id,agent_id,event_type,details)
  values(v_id,v_agent_id,'job-enqueued',jsonb_build_object('idempotencyKey',p_idempotency_key));
  return v_id;
end
$$;

revoke all on function public.agent_jobs_legacy_compat_fill() from public,anon,authenticated,service_role;
revoke all on function public.agent_enqueue_job(jsonb,text) from public,anon,authenticated;
grant execute on function public.agent_enqueue_job(jsonb,text) to service_role;
