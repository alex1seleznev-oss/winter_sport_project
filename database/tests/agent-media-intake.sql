\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'wsh_ci' THEN RAISE EXCEPTION 'CI_DATABASE_REQUIRED'; END IF; END $$;

create temporary table agent_media_intake_assertions(
  name text primary key,
  passed boolean not null,
  details jsonb not null default '{}'::jsonb
);

insert into agent_media_intake_assertions values
('anon_cannot_record_media',not has_function_privilege('anon','public.agent_record_media_observation(text,jsonb,jsonb)','EXECUTE'),'{}'),
('authenticated_cannot_record_media',not has_function_privilege('authenticated','public.agent_record_media_observation(text,jsonb,jsonb)','EXECUTE'),'{}'),
('service_role_can_record_media',has_function_privilege('service_role','public.agent_record_media_observation(text,jsonb,jsonb)','EXECUTE'),'{}');

set role service_role;
select public.agent_record_media_observation(
  'media:ci-source:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  '{"kind":"media_intake_observation","verification_status":"unverified","calendar_mutation_allowed":false,"publication_allowed":false,"sourceKey":"ci-source","url":"https://example.com/item","revision":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}'::jsonb,
  '["https://example.com/feed","https://example.com/item"]'::jsonb
) as media_job_id \gset
select public.agent_record_media_observation(
  'media:ci-source:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  '{"kind":"media_intake_observation","verification_status":"unverified","calendar_mutation_allowed":false,"publication_allowed":false,"sourceKey":"ci-source","url":"https://example.com/item","revision":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}'::jsonb,
  '["https://example.com/feed","https://example.com/item"]'::jsonb
) as media_job_id_repeat \gset
reset role;

insert into agent_media_intake_assertions values
('media_job_is_review_required',exists(
  select 1 from public.agent_jobs
  where id=:'media_job_id'::uuid
    and agent_key is null
    and agent_id='media-watch'
    and job_type='media.intake.observation'
    and status='review_required'
    and review_required=true
    and attempt=0
    and max_attempts=1
),jsonb_build_object('jobId',:'media_job_id')),
('media_job_is_idempotent',:'media_job_id'=:'media_job_id_repeat',jsonb_build_object('first',:'media_job_id','repeat',:'media_job_id_repeat')),
('media_job_never_ready',not public.agent_job_ready(:'media_job_id'::uuid),'{}'),
('media_job_has_audit',exists(
  select 1 from public.agent_audit_events
  where job_id=:'media_job_id'::uuid
    and agent_id='media-watch'
    and event_type='media-intake-recorded'
    and details->>'publicationAllowed'='false'
    and details->>'calendarMutationAllowed'='false'
),'{}');

DO $$
BEGIN
  begin
    perform public.agent_record_media_observation(
      'media:ci-unsafe:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      '{"kind":"media_intake_observation","verification_status":"unverified","calendar_mutation_allowed":true,"publication_allowed":false}'::jsonb,
      '["https://example.com/unsafe"]'::jsonb
    );
    raise exception 'EXPECTED_CALENDAR_MUTATION_REJECTION';
  exception when others then
    if sqlerrm='EXPECTED_CALENDAR_MUTATION_REJECTION' then raise; end if;
    if sqlerrm not like 'MEDIA_INTAKE_CALENDAR_MUTATION_FORBIDDEN%' then raise; end if;
  end;

  begin
    perform public.agent_record_media_observation(
      'media:ci-source:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      '{"kind":"media_intake_observation","verification_status":"unverified","calendar_mutation_allowed":false,"publication_allowed":false,"changed":true}'::jsonb,
      '["https://example.com/feed","https://example.com/item"]'::jsonb
    );
    raise exception 'EXPECTED_IDEMPOTENCY_CONFLICT';
  exception when others then
    if sqlerrm='EXPECTED_IDEMPOTENCY_CONFLICT' then raise; end if;
    if sqlerrm not like 'MEDIA_INTAKE_IDEMPOTENCY_CONFLICT%' then raise; end if;
  end;
END $$;

insert into agent_media_intake_assertions values
('unsafe_media_intake_rejected',not exists(
  select 1 from public.agent_jobs where idempotency_key='media:ci-unsafe:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
),'{}');

DO $$ BEGIN
 IF EXISTS(select 1 from agent_media_intake_assertions where not passed) THEN
   RAISE EXCEPTION 'AGENT_MEDIA_INTAKE_ASSERTIONS_FAILED:%',(
     select jsonb_agg(jsonb_build_object('name',name,'details',details))
     from agent_media_intake_assertions where not passed
   );
 END IF;
END $$;
select jsonb_build_object(
  'agent_media_intake',true,
  'assertions',(select count(*) from agent_media_intake_assertions),
  'all_passed',(select bool_and(passed) from agent_media_intake_assertions)
);
