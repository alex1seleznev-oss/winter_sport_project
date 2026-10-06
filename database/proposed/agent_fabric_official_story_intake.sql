-- Guarded official-source handoff into the Agent Fabric editorial chain.
-- This RPC accepts only active authority-level-5 sources, binds exact supplied
-- evidence to Research, creates a text-only Research -> Fact Check -> Writer -> QA
-- chain, and never creates Visual Director or Publisher work.

create or replace function public.agent_enqueue_official_story_pipeline(
  p_source_feed_id bigint,
  p_story_key text,
  p_topic text,
  p_source_url text,
  p_evidence text,
  p_observed_at timestamptz default now(),
  p_language text default 'ru',
  p_named_person_media boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_feed public.source_feeds%rowtype;
  v_feed_host text;
  v_source_host text;
  v_source_id text;
  v_prefix text;
  v_research_key text;
  v_fact_key text;
  v_writer_key text;
  v_qa_key text;
  v_existing_count integer;
  v_research_id uuid;
  v_fact_id uuid;
  v_writer_id uuid;
  v_qa_id uuid;
  v_research_payload jsonb;
  v_fact_payload jsonb;
  v_writer_payload jsonb;
  v_qa_payload jsonb;
  v_research public.agent_jobs%rowtype;
  v_fact public.agent_jobs%rowtype;
  v_writer public.agent_jobs%rowtype;
  v_qa public.agent_jobs%rowtype;
begin
  if p_source_feed_id is null or p_source_feed_id < 1 then
    raise exception 'AGENT_OFFICIAL_STORY_SOURCE_FEED_INVALID';
  end if;
  if p_story_key is null
     or length(p_story_key) < 3
     or length(p_story_key) > 180
     or p_story_key !~ '^[a-z0-9][a-z0-9._:-]*[a-z0-9]$'
  then
    raise exception 'AGENT_OFFICIAL_STORY_KEY_INVALID';
  end if;
  if p_topic is null or btrim(p_topic)='' or length(p_topic)>300 then
    raise exception 'AGENT_OFFICIAL_STORY_TOPIC_INVALID';
  end if;
  if p_source_url is null
     or length(p_source_url)>2048
     or p_source_url !~ '^https://[A-Za-z0-9.-]+(?:/|\?|#|$)'
  then
    raise exception 'AGENT_OFFICIAL_STORY_SOURCE_URL_INVALID';
  end if;
  if p_evidence is null or btrim(p_evidence)='' or length(p_evidence)>12000 then
    raise exception 'AGENT_OFFICIAL_STORY_EVIDENCE_INVALID';
  end if;
  if p_observed_at is null or p_observed_at > now() + interval '5 minutes' then
    raise exception 'AGENT_OFFICIAL_STORY_OBSERVED_AT_INVALID';
  end if;
  if p_language not in ('ru','en') then
    raise exception 'AGENT_OFFICIAL_STORY_LANGUAGE_INVALID';
  end if;
  if coalesce(p_named_person_media,false) then
    raise exception 'AGENT_OFFICIAL_STORY_NAMED_MEDIA_UNSUPPORTED';
  end if;

  select * into v_feed
  from public.source_feeds
  where id=p_source_feed_id
  for share;

  if not found or not v_feed.active or v_feed.authority_level < 5 then
    raise exception 'AGENT_OFFICIAL_STORY_SOURCE_NOT_APPROVED';
  end if;
  if v_feed.url is null
     or length(v_feed.url)>2048
     or v_feed.url !~ '^https://[A-Za-z0-9.-]+(?:/|\?|#|$)'
  then
    raise exception 'AGENT_OFFICIAL_STORY_FEED_URL_INVALID';
  end if;

  v_feed_host:=lower(substring(v_feed.url from '^https://([A-Za-z0-9.-]+)'));
  v_source_host:=lower(substring(p_source_url from '^https://([A-Za-z0-9.-]+)'));
  if v_feed_host is null or v_source_host is null or v_feed_host<>v_source_host then
    raise exception 'AGENT_OFFICIAL_STORY_SOURCE_HOST_MISMATCH';
  end if;

  v_source_id:='official-feed-'||p_source_feed_id::text;
  v_prefix:='official-story:'||p_story_key||':';
  v_research_key:=v_prefix||'research';
  v_fact_key:=v_prefix||'fact';
  v_writer_key:=v_prefix||'writer';
  v_qa_key:=v_prefix||'qa';

  -- Serialize retries of the same story key so a partial duplicate chain cannot
  -- be created under concurrent calls.
  perform pg_advisory_xact_lock(hashtextextended(v_prefix,0));

  select count(*) into v_existing_count
  from public.agent_jobs
  where idempotency_key in (v_research_key,v_fact_key,v_writer_key,v_qa_key);

  if v_existing_count not in (0,4) then
    raise exception 'AGENT_OFFICIAL_STORY_IDEMPOTENCY_PARTIAL';
  end if;

  if v_existing_count=4 then
    select * into strict v_research from public.agent_jobs where idempotency_key=v_research_key;
    select * into strict v_fact from public.agent_jobs where idempotency_key=v_fact_key;
    select * into strict v_writer from public.agent_jobs where idempotency_key=v_writer_key;
    select * into strict v_qa from public.agent_jobs where idempotency_key=v_qa_key;

    v_research_payload:=jsonb_build_object(
      'kind','official_story_intake',
      'storyKey',p_story_key,
      'sourceFeedId',p_source_feed_id,
      'topic',p_topic,
      'language',p_language,
      'observedAt',p_observed_at,
      'namedPersonMedia',false,
      'instruction','Build an evidence packet only from sourceEvidence. Preserve the supplied source URL and evidence exactly. Do not add facts that are not supported by the supplied evidence.',
      'referenceContract',jsonb_build_object('sourceId',v_source_id,'sourceUrl',p_source_url),
      'sourceEvidence',jsonb_build_array(jsonb_build_object('url',p_source_url,'evidence',p_evidence))
    );
    v_fact_payload:=jsonb_build_object(
      'kind','official_story_intake',
      'storyKey',p_story_key,
      'sourceFeedId',p_source_feed_id,
      'instruction','Check every claim only against the evidence string carried by its source. Pass only when the exact supplied evidence supports the claim. Do not infer missing facts from the URL, source reputation or prior knowledge.'
    );
    v_writer_payload:=jsonb_build_object(
      'kind','official_story_intake',
      'storyKey',p_story_key,
      'sourceFeedId',p_source_feed_id,
      'language',p_language,
      'instruction','Create a concise neutral draft only from approved-evidence. Preserve claimIds and sourceRefs. Do not add facts, forecasts or context that are not approved.'
    );
    v_qa_payload:=jsonb_build_object(
      'kind','official_story_intake',
      'storyKey',p_story_key,
      'sourceFeedId',p_source_feed_id,
      'namedPersonMedia',false
    );

    if v_research.agent_id<>'research'
       or v_research.job_type<>'research.official-story'
       or v_research.payload<>v_research_payload
       or v_research.source_refs<>jsonb_build_array(p_source_url)
       or v_research.dependencies<>'[]'::jsonb
       or v_fact.agent_id<>'fact-check'
       or v_fact.job_type<>'fact-check.official-story'
       or v_fact.payload<>v_fact_payload
       or v_fact.dependencies<>jsonb_build_array(v_research.id::text)
       or v_writer.agent_id<>'editorial-writer'
       or v_writer.job_type<>'editorial.official-story'
       or v_writer.payload<>v_writer_payload
       or v_writer.dependencies<>jsonb_build_array(v_fact.id::text)
       or v_qa.agent_id<>'qa'
       or v_qa.job_type<>'qa.release'
       or v_qa.payload<>v_qa_payload
       or v_qa.dependencies<>jsonb_build_array(v_fact.id::text,v_writer.id::text)
    then
      raise exception 'AGENT_OFFICIAL_STORY_IDEMPOTENCY_CONFLICT';
    end if;

    return jsonb_build_object(
      'researchJobId',v_research.id,
      'factCheckJobId',v_fact.id,
      'editorialWriterJobId',v_writer.id,
      'qaJobId',v_qa.id,
      'publisherEnqueued',false,
      'reused',true
    );
  end if;

  v_research_id:=gen_random_uuid();
  v_fact_id:=gen_random_uuid();
  v_writer_id:=gen_random_uuid();
  v_qa_id:=gen_random_uuid();

  v_research_payload:=jsonb_build_object(
    'kind','official_story_intake',
    'storyKey',p_story_key,
    'sourceFeedId',p_source_feed_id,
    'topic',p_topic,
    'language',p_language,
    'observedAt',p_observed_at,
    'namedPersonMedia',false,
    'instruction','Build an evidence packet only from sourceEvidence. Preserve the supplied source URL and evidence exactly. Do not add facts that are not supported by the supplied evidence.',
    'referenceContract',jsonb_build_object('sourceId',v_source_id,'sourceUrl',p_source_url),
    'sourceEvidence',jsonb_build_array(jsonb_build_object('url',p_source_url,'evidence',p_evidence))
  );
  v_fact_payload:=jsonb_build_object(
    'kind','official_story_intake',
    'storyKey',p_story_key,
    'sourceFeedId',p_source_feed_id,
    'instruction','Check every claim only against the evidence string carried by its source. Pass only when the exact supplied evidence supports the claim. Do not infer missing facts from the URL, source reputation or prior knowledge.'
  );
  v_writer_payload:=jsonb_build_object(
    'kind','official_story_intake',
    'storyKey',p_story_key,
    'sourceFeedId',p_source_feed_id,
    'language',p_language,
    'instruction','Create a concise neutral draft only from approved-evidence. Preserve claimIds and sourceRefs. Do not add facts, forecasts or context that are not approved.'
  );
  v_qa_payload:=jsonb_build_object(
    'kind','official_story_intake',
    'storyKey',p_story_key,
    'sourceFeedId',p_source_feed_id,
    'namedPersonMedia',false
  );

  perform public.agent_enqueue_job(
    jsonb_build_object(
      'jobId',v_research_id::text,
      'type','research.official-story',
      'agentId','research',
      'requestedBy','official-source-intake',
      'confidence','high',
      'reviewRequired',false,
      'inputRefs','[]'::jsonb,
      'sourceRefs',jsonb_build_array(p_source_url),
      'dependencies','[]'::jsonb,
      'outputs','[]'::jsonb,
      'payload',v_research_payload
    ),v_research_key
  );

  perform public.agent_enqueue_job(
    jsonb_build_object(
      'jobId',v_fact_id::text,
      'type','fact-check.official-story',
      'agentId','fact-check',
      'requestedBy','official-source-intake',
      'confidence','high',
      'reviewRequired',false,
      'inputRefs',jsonb_build_array('job:'||v_research_id::text),
      'sourceRefs',jsonb_build_array(p_source_url),
      'dependencies',jsonb_build_array(v_research_id::text),
      'outputs','[]'::jsonb,
      'payload',v_fact_payload
    ),v_fact_key
  );

  perform public.agent_enqueue_job(
    jsonb_build_object(
      'jobId',v_writer_id::text,
      'type','editorial.official-story',
      'agentId','editorial-writer',
      'requestedBy','official-source-intake',
      'confidence','high',
      'reviewRequired',false,
      'inputRefs',jsonb_build_array('job:'||v_fact_id::text),
      'sourceRefs',jsonb_build_array(p_source_url),
      'dependencies',jsonb_build_array(v_fact_id::text),
      'outputs','[]'::jsonb,
      'payload',v_writer_payload
    ),v_writer_key
  );

  perform public.agent_enqueue_job(
    jsonb_build_object(
      'jobId',v_qa_id::text,
      'type','qa.release',
      'agentId','qa',
      'requestedBy','official-source-intake',
      'confidence','high',
      'reviewRequired',false,
      'inputRefs',jsonb_build_array('job:'||v_fact_id::text,'job:'||v_writer_id::text),
      'sourceRefs',jsonb_build_array(p_source_url),
      'dependencies',jsonb_build_array(v_fact_id::text,v_writer_id::text),
      'outputs','[]'::jsonb,
      'payload',v_qa_payload
    ),v_qa_key
  );

  insert into public.agent_audit_events(job_id,agent_id,event_type,details)
  values(
    v_research_id,'research','official-story-pipeline-enqueued',
    jsonb_build_object(
      'storyKey',p_story_key,
      'sourceFeedId',p_source_feed_id,
      'jobCount',4,
      'publisherEnqueued',false,
      'namedPersonMedia',false
    )
  );

  return jsonb_build_object(
    'researchJobId',v_research_id,
    'factCheckJobId',v_fact_id,
    'editorialWriterJobId',v_writer_id,
    'qaJobId',v_qa_id,
    'publisherEnqueued',false,
    'reused',false
  );
end
$$;

revoke all on function public.agent_enqueue_official_story_pipeline(bigint,text,text,text,text,timestamptz,text,boolean) from public,anon,authenticated;
grant execute on function public.agent_enqueue_official_story_pipeline(bigint,text,text,text,text,timestamptz,text,boolean) to service_role;
