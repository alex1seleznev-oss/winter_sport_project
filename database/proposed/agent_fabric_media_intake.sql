-- Guarded media-intake handoff into Agent Fabric.
-- Public/social observations are recorded as review-required media-watch jobs only.
-- This RPC never schedules publication and never accepts a caller-selected agent.

create or replace function public.agent_record_media_observation(
  p_idempotency_key text,
  p_payload jsonb,
  p_source_refs jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_id uuid;
  v_existing public.agent_jobs%rowtype;
begin
  if p_idempotency_key is null
     or btrim(p_idempotency_key)=''
     or length(p_idempotency_key)>300
     or p_idempotency_key not like 'media:%'
  then
    raise exception 'MEDIA_INTAKE_IDEMPOTENCY_INVALID';
  end if;

  if p_payload is null or jsonb_typeof(p_payload)<>'object' then
    raise exception 'MEDIA_INTAKE_PAYLOAD_INVALID';
  end if;
  if p_payload->>'kind'<>'media_intake_observation' then
    raise exception 'MEDIA_INTAKE_KIND_INVALID';
  end if;
  if p_payload->>'verification_status'<>'unverified' then
    raise exception 'MEDIA_INTAKE_VERIFICATION_INVALID';
  end if;
  if coalesce((p_payload->>'calendar_mutation_allowed')::boolean,true) then
    raise exception 'MEDIA_INTAKE_CALENDAR_MUTATION_FORBIDDEN';
  end if;
  if p_payload ? 'publication_allowed'
     and coalesce((p_payload->>'publication_allowed')::boolean,true)
  then
    raise exception 'MEDIA_INTAKE_PUBLICATION_FORBIDDEN';
  end if;

  if p_source_refs is null
     or jsonb_typeof(p_source_refs)<>'array'
     or jsonb_array_length(p_source_refs)<1
     or jsonb_array_length(p_source_refs)>20
  then
    raise exception 'MEDIA_INTAKE_SOURCE_REFS_INVALID';
  end if;
  if exists(
    select 1
    from jsonb_array_elements_text(p_source_refs) as r(value)
    where value !~ '^https://'
  ) then
    raise exception 'MEDIA_INTAKE_SOURCE_REF_INVALID';
  end if;

  select * into v_existing
  from public.agent_jobs
  where idempotency_key=p_idempotency_key
  for update;

  if found then
    if v_existing.agent_id<>'media-watch'
       or v_existing.job_type<>'media.intake.observation'
       or v_existing.payload<>p_payload
       or v_existing.source_refs<>p_source_refs
    then
      raise exception 'MEDIA_INTAKE_IDEMPOTENCY_CONFLICT';
    end if;
    return v_existing.id;
  end if;

  v_id:=gen_random_uuid();
  insert into public.agent_jobs(
    id,agent_key,idempotency_key,job_type,agent_id,status,requested_by,
    confidence,review_required,attempts,attempt,max_attempts,
    input_refs,source_refs,dependencies,outputs,payload,
    available_at,locked_until,created_at,updated_at
  ) values(
    v_id,null,p_idempotency_key,'media.intake.observation','media-watch','review_required',
    'github-oidc:public-media-watch','unknown',true,0,0,1,
    '[]'::jsonb,p_source_refs,'[]'::jsonb,'[]'::jsonb,p_payload,
    now(),null,now(),now()
  );

  insert into public.agent_audit_events(job_id,agent_id,event_type,details)
  values(
    v_id,'media-watch','media-intake-recorded',
    jsonb_build_object(
      'idempotencyKey',p_idempotency_key,
      'sourceRefCount',jsonb_array_length(p_source_refs),
      'publicationAllowed',false,
      'calendarMutationAllowed',false
    )
  );

  return v_id;
end
$$;

revoke all on function public.agent_record_media_observation(text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.agent_record_media_observation(text,jsonb,jsonb) to service_role;
