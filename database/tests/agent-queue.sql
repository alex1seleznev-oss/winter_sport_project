\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'wsh_ci' THEN RAISE EXCEPTION 'CI_DATABASE_REQUIRED'; END IF; END $$;

create temporary table agent_queue_assertions(name text primary key,passed boolean not null,details jsonb not null default '{}'::jsonb);

insert into agent_queue_assertions values
('anon_no_job_read',not has_table_privilege('anon','public.agent_jobs','SELECT'),'{}'),
('authenticated_no_job_read',not has_table_privilege('authenticated','public.agent_jobs','SELECT'),'{}'),
('service_role_can_read',has_table_privilege('service_role','public.agent_jobs','SELECT'),'{}'),
('service_role_no_direct_insert',not has_table_privilege('service_role','public.agent_jobs','INSERT'),'{}'),
('service_role_no_artifact_update',not has_table_privilege('service_role','public.agent_artifacts','UPDATE'),'{}'),
('anon_cannot_enqueue',not has_function_privilege('anon','public.agent_enqueue_job(jsonb,text)','EXECUTE'),'{}'),
('service_role_can_enqueue',has_function_privilege('service_role','public.agent_enqueue_job(jsonb,text)','EXECUTE'),'{}');

set role service_role;
select public.agent_enqueue_job(
 '{"jobId":"10000000-0000-4000-8000-000000000001","type":"research.story","createdAt":"2026-10-04T19:00:00Z","requestedBy":"ci","agentId":"research","status":"queued","confidence":"unknown","reviewRequired":false,"inputRefs":["event:ci"],"sourceRefs":["https://example.com/source"],"dependencies":[],"outputs":[],"auditTrail":[],"attempt":0,"maxAttempts":3,"payload":{"eventRef":"event:ci"}}'::jsonb,
 'ci:research:1'
) as research_job;
select public.agent_enqueue_job(
 '{"jobId":"10000000-0000-4000-8000-000000000002","type":"fact.story","createdAt":"2026-10-04T19:00:01Z","requestedBy":"ci","agentId":"fact-check","status":"queued","confidence":"unknown","reviewRequired":false,"inputRefs":["job:10000000-0000-4000-8000-000000000001"],"sourceRefs":[],"dependencies":["10000000-0000-4000-8000-000000000001"],"outputs":[],"auditTrail":[],"attempt":0,"maxAttempts":2,"payload":{"eventRef":"event:ci"}}'::jsonb,
 'ci:fact:1'
) as fact_job;
reset role;

insert into agent_queue_assertions
select 'dependency_blocks_claim',not public.agent_job_ready('10000000-0000-4000-8000-000000000002'::uuid),jsonb_build_object('status',(select status from public.agent_jobs where id='10000000-0000-4000-8000-000000000002'));

set role service_role;
create temporary table claimed_research as select * from public.agent_claim_job('10000000-0000-4000-8000-000000000001','ci-worker',60);
reset role;
insert into agent_queue_assertions select 'claim_sets_lease',count(*)=1 and bool_and(status='running' and attempt=1 and lease_token is not null),jsonb_build_object('rows',count(*)) from claimed_research;

set role service_role;
select * from public.agent_complete_job(
 '10000000-0000-4000-8000-000000000001','ci-worker',(select lease_token from claimed_research),
 '["artifact:research:1"]'::jsonb,
 '[{"type":"evidence-packet","ref":"artifact:research:1","value":{"packetId":"ci-packet"},"metadata":{"ci":true}}]'::jsonb,
 '{"runId":"20000000-0000-4000-8000-000000000001","modelProfile":"balanced","model":"ci-model","responseId":"ci-response","startedAt":"2026-10-04T19:00:02Z","completedAt":"2026-10-04T19:00:03Z","usage":{"inputTokens":10,"outputTokens":5},"metadata":{"ci":true}}'::jsonb
);
reset role;
insert into agent_queue_assertions values
('dependency_unblocks_after_success',public.agent_job_ready('10000000-0000-4000-8000-000000000002'::uuid),'{}'),
('artifact_persisted',(select count(*)=1 from public.agent_artifacts where job_id='10000000-0000-4000-8000-000000000001'),'{}'),
('run_persisted',(select count(*)=1 from public.agent_runs where job_id='10000000-0000-4000-8000-000000000001'),'{}');

set role service_role;
select public.agent_enqueue_job(
 '{"jobId":"10000000-0000-4000-8000-000000000001","type":"research.story","createdAt":"2026-10-04T19:00:00Z","requestedBy":"ci","agentId":"research","status":"queued","confidence":"unknown","reviewRequired":false,"inputRefs":["event:ci"],"sourceRefs":["https://example.com/source"],"dependencies":[],"outputs":[],"auditTrail":[],"attempt":0,"maxAttempts":3,"payload":{"eventRef":"event:ci"}}'::jsonb,
 'ci:research:1'
);
reset role;
insert into agent_queue_assertions select 'idempotent_enqueue_single_row',(select count(*)=1 from public.agent_jobs where idempotency_key='ci:research:1'),'{}';
DO $$ BEGIN
  BEGIN
    perform public.agent_enqueue_job('{"jobId":"10000000-0000-4000-8000-000000000099","type":"research.story","agentId":"research","payload":{}}'::jsonb,'ci:research:1');
    raise exception 'EXPECTED_IDEMPOTENCY_CONFLICT';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='EXPECTED_IDEMPOTENCY_CONFLICT' THEN RAISE; END IF;
    IF position('AGENT_IDEMPOTENCY_CONFLICT' in SQLERRM)=0 THEN RAISE; END IF;
  END;
END $$;
insert into agent_queue_assertions values('idempotency_conflict_rejected',true,'{}');

set role service_role;
select public.agent_enqueue_job(
 '{"jobId":"10000000-0000-4000-8000-000000000003","type":"visual.article","createdAt":"2026-10-04T19:01:00Z","requestedBy":"ci","agentId":"visual-director","status":"queued","confidence":"unknown","reviewRequired":false,"inputRefs":["draft:ci"],"sourceRefs":[],"dependencies":[],"outputs":[],"auditTrail":[],"attempt":0,"maxAttempts":2,"payload":{"namedPersonMedia":true}}'::jsonb,
 'ci:visual:1'
);
reset role;
insert into agent_queue_assertions values('visual_gate_blocks',not public.agent_job_ready('10000000-0000-4000-8000-000000000003'),'{}');
set role service_role;
select public.agent_record_approval('10000000-0000-4000-8000-000000000003','identity-reviewed','approved','[]','ci');
select public.agent_record_approval('10000000-0000-4000-8000-000000000003','rights-reviewed','approved','[]','ci');
reset role;
insert into agent_queue_assertions values('visual_gate_opens',public.agent_job_ready('10000000-0000-4000-8000-000000000003'),'{}');
set role service_role;
select public.agent_record_approval('10000000-0000-4000-8000-000000000003','rights-reviewed','revoked','[]','ci');
reset role;
insert into agent_queue_assertions values('latest_revocation_closes_gate',not public.agent_job_ready('10000000-0000-4000-8000-000000000003'),'{}');

set role service_role;
select public.agent_enqueue_job(
 '{"jobId":"10000000-0000-4000-8000-000000000004","type":"research.retry","createdAt":"2026-10-04T19:02:00Z","requestedBy":"ci","agentId":"research","status":"queued","confidence":"unknown","reviewRequired":false,"inputRefs":[],"sourceRefs":[],"dependencies":[],"outputs":[],"auditTrail":[],"attempt":0,"maxAttempts":2,"payload":{}}'::jsonb,
 'ci:retry:1'
);
create temporary table claimed_retry as select * from public.agent_claim_job('10000000-0000-4000-8000-000000000004','ci-worker',60);
reset role;
update public.agent_jobs set lease_expires_at=now()-interval '1 second' where id='10000000-0000-4000-8000-000000000004';
set role service_role;
select public.agent_recover_expired_leases();
reset role;
insert into agent_queue_assertions select 'expired_lease_requeued',status='queued' and attempt=1,jsonb_build_object('status',status,'attempt',attempt) from public.agent_jobs where id='10000000-0000-4000-8000-000000000004';
set role service_role;
create temporary table claimed_retry_2 as select * from public.agent_claim_job('10000000-0000-4000-8000-000000000004','ci-worker-2',60);
reset role;
update public.agent_jobs set lease_expires_at=now()-interval '1 second' where id='10000000-0000-4000-8000-000000000004';
set role service_role;
select public.agent_recover_expired_leases();
reset role;
insert into agent_queue_assertions select 'exhausted_lease_terminal_failure',status='failed' and attempt=2,jsonb_build_object('status',status,'attempt',attempt) from public.agent_jobs where id='10000000-0000-4000-8000-000000000004';

insert into agent_queue_assertions select 'audit_is_nonempty',count(*)>=10,jsonb_build_object('events',count(*)) from public.agent_audit_events;

DO $$ BEGIN
 IF EXISTS(select 1 from agent_queue_assertions where not passed) THEN
   RAISE EXCEPTION 'AGENT_QUEUE_ASSERTIONS_FAILED:%',(select jsonb_agg(jsonb_build_object('name',name,'details',details)) from agent_queue_assertions where not passed);
 END IF;
END $$;
select jsonb_build_object('agent_queue',true,'assertions',(select count(*) from agent_queue_assertions),'all_passed',(select bool_and(passed) from agent_queue_assertions));
