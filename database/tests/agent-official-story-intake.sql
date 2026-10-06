\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'wsh_ci' THEN RAISE EXCEPTION 'CI_DATABASE_REQUIRED'; END IF; END $$;

create temporary table agent_official_story_assertions(
  name text primary key,
  passed boolean not null,
  details jsonb not null default '{}'::jsonb
);

insert into agent_official_story_assertions values
('anon_cannot_enqueue_official_story',not has_function_privilege('anon','public.agent_enqueue_official_story_pipeline(bigint,text,text,text,text,timestamptz,text,boolean)','EXECUTE'),'{}'),
('authenticated_cannot_enqueue_official_story',not has_function_privilege('authenticated','public.agent_enqueue_official_story_pipeline(bigint,text,text,text,text,timestamptz,text,boolean)','EXECUTE'),'{}'),
('service_role_can_enqueue_official_story',has_function_privilege('service_role','public.agent_enqueue_official_story_pipeline(bigint,text,text,text,text,timestamptz,text,boolean)','EXECUTE'),'{}');

insert into public.source_feeds(name,kind,url,authority_level,active)
values('CI official feed','official_calendar','https://official.example.com/calendar',5,true)
returning id as official_feed_id \gset

insert into public.source_feeds(name,kind,url,authority_level,active)
values('CI low authority feed','media','https://media.example.com/feed',3,true)
returning id as low_feed_id \gset

create temporary table agent_official_story_fixture(
  official_feed_id bigint not null,
  low_feed_id bigint not null
);
insert into agent_official_story_fixture values (:'official_feed_id'::bigint,:'low_feed_id'::bigint);
grant select on agent_official_story_fixture to service_role;

set role service_role;
select
  result->>'researchJobId' as research_job_id,
  result->>'factCheckJobId' as fact_job_id,
  result->>'editorialWriterJobId' as writer_job_id,
  result->>'qaJobId' as qa_job_id,
  result->>'publisherEnqueued' as publisher_enqueued,
  result->>'reused' as first_reused
from (
  select public.agent_enqueue_official_story_pipeline(
    :'official_feed_id'::bigint,
    'ci-official-001',
    'Synthetic official story',
    'https://official.example.com/calendar/event-1',
    'Official evidence says event one is scheduled on the synthetic test date.',
    '2026-10-06T04:00:00Z'::timestamptz,
    'ru',
    false
  ) as result
) s \gset
reset role;

insert into agent_official_story_assertions values
('pipeline_created_four_jobs',(select count(*)=4 from public.agent_jobs where idempotency_key like 'official-story:ci-official-001:%'),'{}'),
('pipeline_has_exact_agents',(select array_agg(agent_id order by agent_id)=array['editorial-writer','fact-check','qa','research']::text[] from public.agent_jobs where idempotency_key like 'official-story:ci-official-001:%'),'{}'),
('pipeline_has_no_publisher',not exists(select 1 from public.agent_jobs where idempotency_key like 'official-story:ci-official-001:%' and agent_id='publisher'),'{}'),
('first_call_not_reused',:'first_reused'='false',jsonb_build_object('reused',:'first_reused')),
('return_says_no_publisher',:'publisher_enqueued'='false',jsonb_build_object('publisherEnqueued',:'publisher_enqueued')),
('research_binds_exact_evidence',exists(
  select 1 from public.agent_jobs
  where id=:'research_job_id'::uuid
    and agent_id='research'
    and job_type='research.official-story'
    and source_refs='["https://official.example.com/calendar/event-1"]'::jsonb
    and payload->>'kind'='official_story_intake'
    and payload->>'storyKey'='ci-official-001'
    and payload->'sourceEvidence'='[{"url":"https://official.example.com/calendar/event-1","evidence":"Official evidence says event one is scheduled on the synthetic test date."}]'::jsonb
    and payload->'referenceContract'->>'sourceId'=('official-feed-'||:'official_feed_id')
),'{}'),
('fact_depends_on_research',exists(
  select 1 from public.agent_jobs
  where id=:'fact_job_id'::uuid
    and agent_id='fact-check'
    and dependencies=jsonb_build_array(:'research_job_id')
),'{}'),
('writer_depends_on_fact',exists(
  select 1 from public.agent_jobs
  where id=:'writer_job_id'::uuid
    and agent_id='editorial-writer'
    and dependencies=jsonb_build_array(:'fact_job_id')
),'{}'),
('qa_depends_on_fact_and_writer',exists(
  select 1 from public.agent_jobs
  where id=:'qa_job_id'::uuid
    and agent_id='qa'
    and dependencies=jsonb_build_array(:'fact_job_id',:'writer_job_id')
),'{}'),
('research_ready_first',public.agent_job_ready(:'research_job_id'::uuid),'{}'),
('fact_not_ready_before_research',not public.agent_job_ready(:'fact_job_id'::uuid),'{}'),
('writer_not_ready_before_fact',not public.agent_job_ready(:'writer_job_id'::uuid),'{}'),
('qa_not_ready_before_dependencies',not public.agent_job_ready(:'qa_job_id'::uuid),'{}'),
('pipeline_has_guard_audit',exists(
  select 1 from public.agent_audit_events
  where job_id=:'research_job_id'::uuid
    and agent_id='research'
    and event_type='official-story-pipeline-enqueued'
    and details->>'publisherEnqueued'='false'
    and details->>'jobCount'='4'
),'{}');

set role service_role;
select
  result->>'researchJobId' as repeated_research_job_id,
  result->>'factCheckJobId' as repeated_fact_job_id,
  result->>'editorialWriterJobId' as repeated_writer_job_id,
  result->>'qaJobId' as repeated_qa_job_id,
  result->>'reused' as repeated_reused
from (
  select public.agent_enqueue_official_story_pipeline(
    :'official_feed_id'::bigint,
    'ci-official-001',
    'Synthetic official story',
    'https://official.example.com/calendar/event-1',
    'Official evidence says event one is scheduled on the synthetic test date.',
    '2026-10-06T04:00:00Z'::timestamptz,
    'ru',
    false
  ) as result
) s \gset
reset role;

insert into agent_official_story_assertions values
('repeat_is_idempotent',
 :'research_job_id'=:'repeated_research_job_id'
 and :'fact_job_id'=:'repeated_fact_job_id'
 and :'writer_job_id'=:'repeated_writer_job_id'
 and :'qa_job_id'=:'repeated_qa_job_id'
 and :'repeated_reused'='true',
 jsonb_build_object('reused',:'repeated_reused'));

set role service_role;
DO $$
DECLARE
  v_official_feed_id bigint;
  v_low_feed_id bigint;
BEGIN
  select official_feed_id,low_feed_id
    into v_official_feed_id,v_low_feed_id
    from agent_official_story_fixture;

  begin
    perform public.agent_enqueue_official_story_pipeline(
      v_low_feed_id,
      'ci-low-authority',
      'Low authority story',
      'https://media.example.com/feed/item',
      'This evidence must never enter the automatic official-source chain.',
      '2026-10-06T04:00:00Z'::timestamptz,
      'ru',
      false
    );
    raise exception 'EXPECTED_LOW_AUTHORITY_REJECTION';
  exception when others then
    if sqlerrm='EXPECTED_LOW_AUTHORITY_REJECTION' then raise; end if;
    if sqlerrm not like 'AGENT_OFFICIAL_STORY_SOURCE_NOT_APPROVED%' then raise; end if;
  end;

  begin
    perform public.agent_enqueue_official_story_pipeline(
      v_official_feed_id,
      'ci-host-mismatch',
      'Host mismatch story',
      'https://evil.example.net/item',
      'Host mismatch evidence.',
      '2026-10-06T04:00:00Z'::timestamptz,
      'ru',
      false
    );
    raise exception 'EXPECTED_HOST_MISMATCH_REJECTION';
  exception when others then
    if sqlerrm='EXPECTED_HOST_MISMATCH_REJECTION' then raise; end if;
    if sqlerrm not like 'AGENT_OFFICIAL_STORY_SOURCE_HOST_MISMATCH%' then raise; end if;
  end;

  begin
    perform public.agent_enqueue_official_story_pipeline(
      v_official_feed_id,
      'ci-named-media',
      'Named-person media story',
      'https://official.example.com/calendar/person',
      'Named-person source evidence.',
      '2026-10-06T04:00:00Z'::timestamptz,
      'ru',
      true
    );
    raise exception 'EXPECTED_NAMED_MEDIA_REJECTION';
  exception when others then
    if sqlerrm='EXPECTED_NAMED_MEDIA_REJECTION' then raise; end if;
    if sqlerrm not like 'AGENT_OFFICIAL_STORY_NAMED_MEDIA_UNSUPPORTED%' then raise; end if;
  end;

  begin
    perform public.agent_enqueue_official_story_pipeline(
      v_official_feed_id,
      'ci-official-001',
      'Synthetic official story',
      'https://official.example.com/calendar/event-1',
      'Changed evidence must conflict with the existing story key.',
      '2026-10-06T04:00:00Z'::timestamptz,
      'ru',
      false
    );
    raise exception 'EXPECTED_IDEMPOTENCY_CONFLICT';
  exception when others then
    if sqlerrm='EXPECTED_IDEMPOTENCY_CONFLICT' then raise; end if;
    if sqlerrm not like 'AGENT_OFFICIAL_STORY_IDEMPOTENCY_CONFLICT%' then raise; end if;
  end;
END $$;
reset role;

insert into agent_official_story_assertions values
('negative_cases_create_no_jobs',not exists(
  select 1 from public.agent_jobs
  where idempotency_key like 'official-story:ci-low-authority:%'
     or idempotency_key like 'official-story:ci-host-mismatch:%'
     or idempotency_key like 'official-story:ci-named-media:%'
),'{}');

DO $$
BEGIN
 IF EXISTS(select 1 from agent_official_story_assertions where not passed) THEN
   RAISE EXCEPTION 'AGENT_OFFICIAL_STORY_ASSERTIONS_FAILED:%',(
     select jsonb_agg(jsonb_build_object('name',name,'details',details))
     from agent_official_story_assertions where not passed
   );
 END IF;
END $$;

select jsonb_build_object(
  'agent_official_story_intake',true,
  'assertions',(select count(*) from agent_official_story_assertions),
  'all_passed',(select bool_and(passed) from agent_official_story_assertions)
);
