-- Durable control-plane storage for Agent Fabric v1.
-- This file is replay-tested in CI before any hosted application.

create table if not exists public.agent_jobs (
  id uuid primary key,
  idempotency_key text not null unique,
  job_type text not null,
  agent_id text not null,
  status text not null check (status in ('queued','blocked','running','succeeded','failed','review_required','cancelled')),
  requested_by text not null,
  confidence text not null default 'unknown' check (confidence in ('unknown','low','medium','high','verified')),
  review_required boolean not null default false,
  attempt integer not null default 0 check (attempt >= 0 and attempt <= 10),
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  input_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(input_refs)='array'),
  source_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(source_refs)='array'),
  dependencies jsonb not null default '[]'::jsonb check (jsonb_typeof(dependencies)='array'),
  outputs jsonb not null default '[]'::jsonb check (jsonb_typeof(outputs)='array'),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload)='object'),
  available_at timestamptz not null default now(),
  lease_owner text,
  lease_token uuid,
  lease_expires_at timestamptz,
  heartbeat_at timestamptz,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  check (attempt <= max_attempts),
  check (
    (status='running' and lease_owner is not null and lease_token is not null and lease_expires_at is not null)
    or
    (status<>'running' and lease_owner is null and lease_token is null and lease_expires_at is null)
  )
);

create table if not exists public.agent_job_dependencies (
  job_id uuid not null references public.agent_jobs(id) on delete cascade,
  depends_on_job_id uuid not null references public.agent_jobs(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key(job_id,depends_on_job_id),
  check (job_id<>depends_on_job_id)
);

create table if not exists public.agent_runs (
  id uuid primary key,
  job_id uuid not null references public.agent_jobs(id) on delete cascade,
  agent_id text not null,
  model_profile text,
  model text,
  provider_response_id text,
  input_tokens integer check (input_tokens is null or input_tokens>=0),
  output_tokens integer check (output_tokens is null or output_tokens>=0),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  started_at timestamptz not null,
  completed_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_artifacts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.agent_jobs(id) on delete cascade,
  run_id uuid references public.agent_runs(id) on delete set null,
  artifact_type text not null,
  artifact_ref text not null,
  payload jsonb not null,
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-fA-F]{64}$'),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now(),
  unique(job_id,artifact_ref)
);

create table if not exists public.agent_approvals (
  id bigint generated always as identity primary key,
  job_id uuid not null references public.agent_jobs(id) on delete cascade,
  gate text not null,
  decision text not null check (decision in ('approved','rejected','revoked')),
  evidence_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence_refs)='array'),
  decided_by text not null,
  decided_at timestamptz not null default now()
);

create table if not exists public.agent_audit_events (
  id bigint generated always as identity primary key,
  job_id uuid references public.agent_jobs(id) on delete cascade,
  agent_id text not null,
  event_type text not null,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details)='object'),
  created_at timestamptz not null default now()
);

create index if not exists agent_jobs_ready_idx on public.agent_jobs(status,available_at,created_at) where status='queued';
create index if not exists agent_jobs_agent_status_idx on public.agent_jobs(agent_id,status);
create index if not exists agent_jobs_lease_idx on public.agent_jobs(lease_expires_at) where status='running';
create index if not exists agent_dependencies_dep_idx on public.agent_job_dependencies(depends_on_job_id,job_id);
create index if not exists agent_runs_job_created_idx on public.agent_runs(job_id,created_at);
create index if not exists agent_artifacts_job_idx on public.agent_artifacts(job_id,created_at);
create index if not exists agent_approvals_job_gate_idx on public.agent_approvals(job_id,gate,decided_at desc,id desc);
create index if not exists agent_audit_job_created_idx on public.agent_audit_events(job_id,created_at);

alter table public.agent_jobs enable row level security;
alter table public.agent_job_dependencies enable row level security;
alter table public.agent_runs enable row level security;
alter table public.agent_artifacts enable row level security;
alter table public.agent_approvals enable row level security;
alter table public.agent_audit_events enable row level security;

revoke all on public.agent_jobs from anon,authenticated;
revoke all on public.agent_job_dependencies from anon,authenticated;
revoke all on public.agent_runs from anon,authenticated;
revoke all on public.agent_artifacts from anon,authenticated;
revoke all on public.agent_approvals from anon,authenticated;
revoke all on public.agent_audit_events from anon,authenticated;

-- service_role may inspect durable state, but all mutations must use the guarded RPCs below.
grant select on public.agent_jobs,public.agent_job_dependencies,public.agent_runs,public.agent_artifacts,public.agent_approvals,public.agent_audit_events to service_role;
revoke insert,update,delete on public.agent_jobs,public.agent_job_dependencies,public.agent_runs,public.agent_artifacts,public.agent_approvals,public.agent_audit_events from service_role;
revoke usage,select on sequence public.agent_approvals_id_seq from service_role;
revoke usage,select on sequence public.agent_audit_events_id_seq from service_role;

create or replace function public.agent_gate_approved(p_job_id uuid,p_gate text)
returns boolean
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select coalesce((
    select a.decision='approved'
    from public.agent_approvals a
    where a.job_id=p_job_id and a.gate=p_gate
    order by a.decided_at desc,a.id desc
    limit 1
  ),false)
$$;

create or replace function public.agent_job_ready(p_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select exists(
    select 1
    from public.agent_jobs j
    where j.id=p_job_id
      and j.status='queued'
      and j.available_at<=now()
      and j.attempt<j.max_attempts
      and not exists(
        select 1
        from public.agent_job_dependencies d
        join public.agent_jobs dep on dep.id=d.depends_on_job_id
        where d.job_id=j.id and dep.status<>'succeeded'
      )
      and (
        j.job_type not like 'publish.%'
        or (public.agent_gate_approved(j.id,'fact-check-passed') and public.agent_gate_approved(j.id,'qa-passed'))
      )
      and (
        j.job_type not like 'visual.%'
        or coalesce(j.payload->>'namedPersonMedia','false')<>'true'
        or (public.agent_gate_approved(j.id,'identity-reviewed') and public.agent_gate_approved(j.id,'rights-reviewed'))
      )
  )
$$;

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
begin
  if p_job is null or jsonb_typeof(p_job)<>'object' then raise exception 'AGENT_JOB_INVALID'; end if;
  if p_idempotency_key is null or btrim(p_idempotency_key)='' or length(p_idempotency_key)>300 then raise exception 'AGENT_IDEMPOTENCY_KEY_INVALID'; end if;
  v_id := (p_job->>'jobId')::uuid;
  v_status := coalesce(p_job->>'status','queued');
  if v_status not in ('queued','blocked') then raise exception 'AGENT_ENQUEUE_STATUS_INVALID:%',v_status; end if;
  v_dependencies := coalesce(p_job->'dependencies','[]'::jsonb);
  if jsonb_typeof(v_dependencies)<>'array' then raise exception 'AGENT_DEPENDENCIES_INVALID'; end if;

  select * into v_existing from public.agent_jobs where idempotency_key=p_idempotency_key for update;
  if found then
    if v_existing.id<>v_id
      or v_existing.job_type<>p_job->>'type'
      or v_existing.agent_id<>p_job->>'agentId'
      or v_existing.payload<>coalesce(p_job->'payload','{}'::jsonb)
      or v_existing.input_refs<>coalesce(p_job->'inputRefs','[]'::jsonb)
      or v_existing.source_refs<>coalesce(p_job->'sourceRefs','[]'::jsonb)
      or v_existing.dependencies<>v_dependencies
    then raise exception 'AGENT_IDEMPOTENCY_CONFLICT:%',p_idempotency_key; end if;
    return v_existing.id;
  end if;

  insert into public.agent_jobs(
    id,idempotency_key,job_type,agent_id,status,requested_by,confidence,review_required,
    attempt,max_attempts,input_refs,source_refs,dependencies,outputs,payload,available_at,created_at,updated_at
  ) values(
    v_id,p_idempotency_key,p_job->>'type',p_job->>'agentId',v_status,coalesce(p_job->>'requestedBy','system'),
    coalesce(p_job->>'confidence','unknown'),coalesce((p_job->>'reviewRequired')::boolean,false),
    coalesce((p_job->>'attempt')::integer,0),coalesce((p_job->>'maxAttempts')::integer,3),
    coalesce(p_job->'inputRefs','[]'::jsonb),coalesce(p_job->'sourceRefs','[]'::jsonb),v_dependencies,
    coalesce(p_job->'outputs','[]'::jsonb),coalesce(p_job->'payload','{}'::jsonb),
    coalesce((p_job->>'availableAt')::timestamptz,now()),coalesce((p_job->>'createdAt')::timestamptz,now()),now()
  );

  insert into public.agent_job_dependencies(job_id,depends_on_job_id)
  select v_id,value::uuid from jsonb_array_elements_text(v_dependencies)
  on conflict do nothing;

  insert into public.agent_audit_events(job_id,agent_id,event_type,details)
  values(v_id,p_job->>'agentId','job-enqueued',jsonb_build_object('idempotencyKey',p_idempotency_key));
  return v_id;
end
$$;

create or replace function public.agent_recover_expired_leases()
returns integer
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_count integer;
begin
  with expired as (
    update public.agent_jobs j
    set status=case when j.attempt>=j.max_attempts then 'failed' else 'queued' end,
        available_at=case when j.attempt>=j.max_attempts then j.available_at else now() end,
        lease_owner=null,lease_token=null,lease_expires_at=null,heartbeat_at=null,
        completed_at=case when j.attempt>=j.max_attempts then now() else null end,
        updated_at=now()
    where j.status='running' and j.lease_expires_at<now()
    returning j.id,j.agent_id,j.status,j.attempt,j.max_attempts
  ), audited as (
    insert into public.agent_audit_events(job_id,agent_id,event_type,details)
    select id,agent_id,'lease-expired',jsonb_build_object('resultStatus',status,'attempt',attempt,'maxAttempts',max_attempts) from expired
    returning 1
  )
  select count(*) into v_count from audited;
  return v_count;
end
$$;

create or replace function public.agent_claim_job(p_job_id uuid,p_worker_id text,p_lease_seconds integer default 120)
returns setof public.agent_jobs
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_token uuid;
begin
  if p_worker_id is null or btrim(p_worker_id)='' or length(p_worker_id)>200 then raise exception 'AGENT_WORKER_ID_INVALID'; end if;
  if p_lease_seconds<15 or p_lease_seconds>900 then raise exception 'AGENT_LEASE_SECONDS_INVALID'; end if;
  perform public.agent_recover_expired_leases();
  if not public.agent_job_ready(p_job_id) then return; end if;
  v_token:=gen_random_uuid();

  return query
  with claimed as (
    update public.agent_jobs j
    set status='running',attempt=j.attempt+1,lease_owner=p_worker_id,lease_token=v_token,
        lease_expires_at=now()+make_interval(secs=>p_lease_seconds),heartbeat_at=now(),
        started_at=coalesce(j.started_at,now()),completed_at=null,updated_at=now()
    where j.id=p_job_id and public.agent_job_ready(j.id)
    returning j.*
  ), audited as (
    insert into public.agent_audit_events(job_id,agent_id,event_type,details)
    select id,agent_id,'job-claimed',jsonb_build_object('workerId',p_worker_id,'leaseToken',lease_token,'leaseExpiresAt',lease_expires_at,'attempt',attempt) from claimed
    returning 1
  )
  select c.* from claimed c;
end
$$;

create or replace function public.agent_heartbeat_job(p_job_id uuid,p_worker_id text,p_lease_token uuid,p_lease_seconds integer default 120)
returns setof public.agent_jobs
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if p_lease_seconds<15 or p_lease_seconds>900 then raise exception 'AGENT_LEASE_SECONDS_INVALID'; end if;
  return query
  update public.agent_jobs j
  set lease_expires_at=now()+make_interval(secs=>p_lease_seconds),heartbeat_at=now(),updated_at=now()
  where j.id=p_job_id and j.status='running' and j.lease_owner=p_worker_id and j.lease_token=p_lease_token and j.lease_expires_at>=now()
  returning j.*;
end
$$;

create or replace function public.agent_complete_job(
  p_job_id uuid,p_worker_id text,p_lease_token uuid,p_outputs jsonb default '[]'::jsonb,
  p_artifacts jsonb default '[]'::jsonb,p_run jsonb default null
)
returns setof public.agent_jobs
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_job public.agent_jobs%rowtype; v_run_id uuid;
begin
  if jsonb_typeof(coalesce(p_outputs,'[]'::jsonb))<>'array' then raise exception 'AGENT_OUTPUTS_INVALID'; end if;
  if jsonb_typeof(coalesce(p_artifacts,'[]'::jsonb))<>'array' then raise exception 'AGENT_ARTIFACTS_INVALID'; end if;
  select * into v_job from public.agent_jobs j where j.id=p_job_id for update;
  if not found then raise exception 'AGENT_JOB_NOT_FOUND'; end if;
  if v_job.status<>'running' or v_job.lease_owner<>p_worker_id or v_job.lease_token<>p_lease_token or v_job.lease_expires_at<now() then raise exception 'AGENT_LEASE_NOT_OWNED'; end if;

  if p_run is not null then
    if jsonb_typeof(p_run)<>'object' then raise exception 'AGENT_RUN_INVALID'; end if;
    v_run_id:=(p_run->>'runId')::uuid;
    insert into public.agent_runs(id,job_id,agent_id,model_profile,model,provider_response_id,input_tokens,output_tokens,metadata,started_at,completed_at)
    values(v_run_id,p_job_id,v_job.agent_id,p_run->>'modelProfile',p_run->>'model',p_run->>'responseId',
      nullif(p_run#>>'{usage,inputTokens}','')::integer,nullif(p_run#>>'{usage,outputTokens}','')::integer,
      coalesce(p_run->'metadata','{}'::jsonb),coalesce((p_run->>'startedAt')::timestamptz,now()),coalesce((p_run->>'completedAt')::timestamptz,now()))
    on conflict(id) do nothing;
  end if;

  insert into public.agent_artifacts(job_id,run_id,artifact_type,artifact_ref,payload,sha256,metadata)
  select p_job_id,v_run_id,x->>'type',x->>'ref',x->'value',x->>'sha256',coalesce(x->'metadata','{}'::jsonb)
  from jsonb_array_elements(coalesce(p_artifacts,'[]'::jsonb)) x
  where x ? 'type' and x ? 'ref' and x ? 'value'
  on conflict(job_id,artifact_ref) do nothing;

  update public.agent_jobs j
  set status='succeeded',outputs=coalesce(p_outputs,'[]'::jsonb),lease_owner=null,lease_token=null,lease_expires_at=null,heartbeat_at=null,completed_at=now(),updated_at=now()
  where j.id=p_job_id returning * into v_job;
  insert into public.agent_audit_events(job_id,agent_id,event_type,details)
  values(p_job_id,v_job.agent_id,'job-succeeded',jsonb_build_object('outputCount',jsonb_array_length(v_job.outputs),'artifactCount',jsonb_array_length(coalesce(p_artifacts,'[]'::jsonb)),'runId',v_run_id));
  return next v_job;
end
$$;

create or replace function public.agent_fail_job(p_job_id uuid,p_worker_id text,p_lease_token uuid,p_review_required boolean default false,p_error_code text default null)
returns setof public.agent_jobs
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_job public.agent_jobs%rowtype;
begin
  select * into v_job from public.agent_jobs j where j.id=p_job_id for update;
  if not found then raise exception 'AGENT_JOB_NOT_FOUND'; end if;
  if v_job.status<>'running' or v_job.lease_owner<>p_worker_id or v_job.lease_token<>p_lease_token or v_job.lease_expires_at<now() then raise exception 'AGENT_LEASE_NOT_OWNED'; end if;
  update public.agent_jobs j
  set status=case when p_review_required then 'review_required' else 'failed' end,review_required=p_review_required,
      lease_owner=null,lease_token=null,lease_expires_at=null,heartbeat_at=null,completed_at=now(),updated_at=now()
  where j.id=p_job_id returning * into v_job;
  insert into public.agent_audit_events(job_id,agent_id,event_type,details)
  values(p_job_id,v_job.agent_id,case when p_review_required then 'job-review-required' else 'job-failed' end,jsonb_build_object('errorCode',p_error_code,'attempt',v_job.attempt));
  return next v_job;
end
$$;

create or replace function public.agent_requeue_job(p_job_id uuid,p_available_at timestamptz default now())
returns setof public.agent_jobs
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_job public.agent_jobs%rowtype;
begin
  select * into v_job from public.agent_jobs j where j.id=p_job_id for update;
  if not found then raise exception 'AGENT_JOB_NOT_FOUND'; end if;
  if v_job.status not in ('failed','blocked','review_required') then raise exception 'AGENT_JOB_NOT_REQUEUEABLE'; end if;
  if v_job.attempt>=v_job.max_attempts then raise exception 'AGENT_JOB_ATTEMPTS_EXHAUSTED'; end if;
  update public.agent_jobs j set status='queued',review_required=false,available_at=coalesce(p_available_at,now()),completed_at=null,updated_at=now() where j.id=p_job_id returning * into v_job;
  insert into public.agent_audit_events(job_id,agent_id,event_type,details) values(p_job_id,v_job.agent_id,'job-requeued',jsonb_build_object('availableAt',v_job.available_at));
  return next v_job;
end
$$;

create or replace function public.agent_record_approval(p_job_id uuid,p_gate text,p_decision text,p_evidence_refs jsonb default '[]'::jsonb,p_decided_by text default 'system')
returns bigint
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_id bigint; v_agent text;
begin
  if p_gate not in ('identity-reviewed','rights-reviewed','fact-check-passed','qa-passed') then raise exception 'AGENT_GATE_INVALID:%',p_gate; end if;
  if p_decision not in ('approved','rejected','revoked') then raise exception 'AGENT_APPROVAL_DECISION_INVALID'; end if;
  if jsonb_typeof(coalesce(p_evidence_refs,'[]'::jsonb))<>'array' then raise exception 'AGENT_APPROVAL_REFS_INVALID'; end if;
  select agent_id into v_agent from public.agent_jobs where id=p_job_id;
  if v_agent is null then raise exception 'AGENT_JOB_NOT_FOUND'; end if;
  insert into public.agent_approvals(job_id,gate,decision,evidence_refs,decided_by) values(p_job_id,p_gate,p_decision,coalesce(p_evidence_refs,'[]'::jsonb),p_decided_by) returning id into v_id;
  insert into public.agent_audit_events(job_id,agent_id,event_type,details) values(p_job_id,v_agent,'approval-recorded',jsonb_build_object('gate',p_gate,'decision',p_decision,'decidedBy',p_decided_by));
  return v_id;
end
$$;

revoke all on function public.agent_gate_approved(uuid,text) from public,anon,authenticated;
revoke all on function public.agent_job_ready(uuid) from public,anon,authenticated;
revoke all on function public.agent_enqueue_job(jsonb,text) from public,anon,authenticated;
revoke all on function public.agent_recover_expired_leases() from public,anon,authenticated;
revoke all on function public.agent_claim_job(uuid,text,integer) from public,anon,authenticated;
revoke all on function public.agent_heartbeat_job(uuid,text,uuid,integer) from public,anon,authenticated;
revoke all on function public.agent_complete_job(uuid,text,uuid,jsonb,jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.agent_fail_job(uuid,text,uuid,boolean,text) from public,anon,authenticated;
revoke all on function public.agent_requeue_job(uuid,timestamptz) from public,anon,authenticated;
revoke all on function public.agent_record_approval(uuid,text,text,jsonb,text) from public,anon,authenticated;

grant execute on function public.agent_gate_approved(uuid,text) to service_role;
grant execute on function public.agent_job_ready(uuid) to service_role;
grant execute on function public.agent_enqueue_job(jsonb,text) to service_role;
grant execute on function public.agent_recover_expired_leases() to service_role;
grant execute on function public.agent_claim_job(uuid,text,integer) to service_role;
grant execute on function public.agent_heartbeat_job(uuid,text,uuid,integer) to service_role;
grant execute on function public.agent_complete_job(uuid,text,uuid,jsonb,jsonb,jsonb) to service_role;
grant execute on function public.agent_fail_job(uuid,text,uuid,boolean,text) to service_role;
grant execute on function public.agent_requeue_job(uuid,timestamptz) to service_role;
grant execute on function public.agent_record_approval(uuid,text,text,jsonb,text) to service_role;
