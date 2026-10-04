-- Persist a model run and its validated artifacts while transitioning a claimed job
-- to review_required. This mirrors agent_complete_job but keeps the release path closed.

create or replace function public.agent_review_job(
  p_job_id uuid,
  p_worker_id text,
  p_lease_token uuid,
  p_outputs jsonb default '[]'::jsonb,
  p_artifacts jsonb default '[]'::jsonb,
  p_run jsonb default null,
  p_reason text default 'model-review-required'
)
returns setof public.agent_jobs
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_job public.agent_jobs%rowtype;
  v_run_id uuid;
begin
  if jsonb_typeof(coalesce(p_outputs,'[]'::jsonb))<>'array' then raise exception 'AGENT_OUTPUTS_INVALID'; end if;
  if jsonb_typeof(coalesce(p_artifacts,'[]'::jsonb))<>'array' then raise exception 'AGENT_ARTIFACTS_INVALID'; end if;
  if p_reason is null or btrim(p_reason)='' or length(p_reason)>160 then raise exception 'AGENT_REVIEW_REASON_INVALID'; end if;

  select * into v_job from public.agent_jobs j where j.id=p_job_id for update;
  if not found then raise exception 'AGENT_JOB_NOT_FOUND'; end if;
  if v_job.status<>'running'
     or v_job.lease_owner<>p_worker_id
     or v_job.lease_token<>p_lease_token
     or v_job.lease_expires_at<now()
  then raise exception 'AGENT_LEASE_NOT_OWNED'; end if;

  if p_run is not null then
    if jsonb_typeof(p_run)<>'object' then raise exception 'AGENT_RUN_INVALID'; end if;
    v_run_id:=(p_run->>'runId')::uuid;
    insert into public.agent_runs(
      id,job_id,agent_id,model_profile,model,provider_response_id,input_tokens,output_tokens,metadata,started_at,completed_at
    ) values(
      v_run_id,p_job_id,v_job.agent_id,p_run->>'modelProfile',p_run->>'model',p_run->>'responseId',
      nullif(p_run#>>'{usage,inputTokens}','')::integer,
      nullif(p_run#>>'{usage,outputTokens}','')::integer,
      coalesce(p_run->'metadata','{}'::jsonb),
      coalesce((p_run->>'startedAt')::timestamptz,now()),
      coalesce((p_run->>'completedAt')::timestamptz,now())
    ) on conflict(id) do nothing;
  end if;

  insert into public.agent_artifacts(job_id,run_id,artifact_type,artifact_ref,payload,sha256,metadata)
  select p_job_id,v_run_id,x->>'type',x->>'ref',x->'value',x->>'sha256',coalesce(x->'metadata','{}'::jsonb)
  from jsonb_array_elements(coalesce(p_artifacts,'[]'::jsonb)) x
  where x ? 'type' and x ? 'ref' and x ? 'value'
  on conflict(job_id,artifact_ref) do nothing;

  update public.agent_jobs j
  set status='review_required',
      review_required=true,
      outputs=coalesce(p_outputs,'[]'::jsonb),
      lease_owner=null,
      lease_token=null,
      lease_expires_at=null,
      heartbeat_at=null,
      locked_until=null,
      completed_at=now(),
      updated_at=now()
  where j.id=p_job_id
  returning * into v_job;

  insert into public.agent_audit_events(job_id,agent_id,event_type,details)
  values(
    p_job_id,
    v_job.agent_id,
    'job-review-required',
    jsonb_build_object(
      'reason',p_reason,
      'outputCount',jsonb_array_length(v_job.outputs),
      'artifactCount',jsonb_array_length(coalesce(p_artifacts,'[]'::jsonb)),
      'runId',v_run_id,
      'attempt',v_job.attempt
    )
  );

  return next v_job;
end
$$;

revoke all on function public.agent_review_job(uuid,text,uuid,jsonb,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.agent_review_job(uuid,text,uuid,jsonb,jsonb,jsonb,text) to service_role;
