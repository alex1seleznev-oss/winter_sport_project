\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'wsh_ci' THEN RAISE EXCEPTION 'CI_DATABASE_REQUIRED'; END IF; END $$;

create temporary table agent_review_assertions(name text primary key,passed boolean not null,details jsonb not null default '{}'::jsonb);

insert into agent_review_assertions values
('anon_cannot_review',not has_function_privilege('anon','public.agent_review_job(uuid,text,uuid,jsonb,jsonb,jsonb,text)','EXECUTE'),'{}'),
('authenticated_cannot_review',not has_function_privilege('authenticated','public.agent_review_job(uuid,text,uuid,jsonb,jsonb,jsonb,text)','EXECUTE'),'{}'),
('service_role_can_review',has_function_privilege('service_role','public.agent_review_job(uuid,text,uuid,jsonb,jsonb,jsonb,text)','EXECUTE'),'{}');

set role service_role;
select public.agent_enqueue_job(
 '{"jobId":"10000000-0000-4000-8000-000000000010","type":"fact.review","createdAt":"2026-10-05T07:00:00Z","requestedBy":"ci","agentId":"fact-check","status":"queued","confidence":"unknown","reviewRequired":false,"inputRefs":[],"sourceRefs":[],"dependencies":[],"outputs":[],"auditTrail":[],"attempt":0,"maxAttempts":2,"payload":{}}'::jsonb,
 'ci:review:1'
);
create temporary table claimed_review as select * from public.agent_claim_job('10000000-0000-4000-8000-000000000010','ci-review-worker',120);
select * from public.agent_review_job(
 '10000000-0000-4000-8000-000000000010',
 'ci-review-worker',
 (select lease_token from claimed_review),
 '["artifact:fact-review:1"]'::jsonb,
 '[{"type":"fact-check-report","ref":"artifact:fact-review:1","value":{"packetId":"ci-review","decision":"review"},"metadata":{"ci":true}}]'::jsonb,
 '{"runId":"20000000-0000-4000-8000-000000000010","modelProfile":"balanced","model":"ci-model","responseId":"ci-review-response","startedAt":"2026-10-05T07:00:01Z","completedAt":"2026-10-05T07:00:02Z","usage":{"inputTokens":12,"outputTokens":6},"metadata":{"ci":true}}'::jsonb,
 'fact-check-needs-human-review'
);
reset role;

insert into agent_review_assertions
select 'review_status_persisted',status='review_required' and review_required and lease_token is null and completed_at is not null,
       jsonb_build_object('status',status,'reviewRequired',review_required)
from public.agent_jobs where id='10000000-0000-4000-8000-000000000010';

insert into agent_review_assertions values
('review_artifact_persisted',(select count(*)=1 from public.agent_artifacts where job_id='10000000-0000-4000-8000-000000000010'),'{}'),
('review_run_persisted',(select count(*)=1 from public.agent_runs where job_id='10000000-0000-4000-8000-000000000010'),'{}'),
('review_audit_persisted',(select count(*)=1 from public.agent_audit_events where job_id='10000000-0000-4000-8000-000000000010' and event_type='job-review-required'),'{}');

DO $$ BEGIN
 IF EXISTS(select 1 from agent_review_assertions where not passed) THEN
   RAISE EXCEPTION 'AGENT_REVIEW_ASSERTIONS_FAILED:%',(select jsonb_agg(jsonb_build_object('name',name,'details',details)) from agent_review_assertions where not passed);
 END IF;
END $$;
select jsonb_build_object('agent_review',true,'assertions',(select count(*) from agent_review_assertions),'all_passed',(select bool_and(passed) from agent_review_assertions));
