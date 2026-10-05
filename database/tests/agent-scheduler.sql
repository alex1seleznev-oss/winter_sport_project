\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'wsh_ci' THEN RAISE EXCEPTION 'CI_DATABASE_REQUIRED'; END IF; END $$;

create temporary table agent_scheduler_assertions(name text primary key,passed boolean not null,details jsonb not null default '{}'::jsonb);

insert into agent_scheduler_assertions values
('anon_cannot_list_dispatch_candidates',not has_function_privilege('anon','public.agent_dispatch_candidates(text[],integer)','EXECUTE'),'{}'),
('authenticated_cannot_list_dispatch_candidates',not has_function_privilege('authenticated','public.agent_dispatch_candidates(text[],integer)','EXECUTE'),'{}'),
('service_role_can_list_dispatch_candidates',has_function_privilege('service_role','public.agent_dispatch_candidates(text[],integer)','EXECUTE'),'{}');

set role service_role;
select public.agent_enqueue_job(
 '{"jobId":"10000000-0000-4000-8000-000000000005","type":"research.scheduler","createdAt":"2026-10-05T08:10:00Z","requestedBy":"ci","agentId":"research","status":"queued","confidence":"unknown","reviewRequired":false,"inputRefs":[],"sourceRefs":["https://example.com/scheduler"],"dependencies":[],"outputs":[],"auditTrail":[],"attempt":0,"maxAttempts":2,"payload":{"probe":"scheduler-ready"}}'::jsonb,
 'ci:scheduler:research:1'
);
select public.agent_enqueue_job(
 '{"jobId":"10000000-0000-4000-8000-000000000006","type":"visual.scheduler","createdAt":"2026-10-05T08:10:01Z","requestedBy":"ci","agentId":"visual-director","status":"queued","confidence":"unknown","reviewRequired":false,"inputRefs":[],"sourceRefs":[],"dependencies":[],"outputs":[],"auditTrail":[],"attempt":0,"maxAttempts":2,"payload":{"namedPersonMedia":true}}'::jsonb,
 'ci:scheduler:visual:1'
);
select public.agent_enqueue_job(
 '{"jobId":"10000000-0000-4000-8000-000000000007","type":"publish.scheduler","createdAt":"2026-10-05T08:10:02Z","requestedBy":"ci","agentId":"publisher","status":"queued","confidence":"verified","reviewRequired":false,"inputRefs":[],"sourceRefs":[],"dependencies":[],"outputs":[],"auditTrail":[],"attempt":0,"maxAttempts":1,"payload":{"probe":"must-never-dispatch"}}'::jsonb,
 'ci:scheduler:publisher:1'
);
select public.agent_record_approval('10000000-0000-4000-8000-000000000007','fact-check-passed','approved','[]','ci');
select public.agent_record_approval('10000000-0000-4000-8000-000000000007','qa-passed','approved','[]','ci');
select public.agent_enqueue_job(
 '{"jobId":"10000000-0000-4000-8000-000000000008","type":"qa.scheduler","createdAt":"2026-10-05T08:10:03Z","requestedBy":"ci","agentId":"qa","status":"queued","confidence":"verified","reviewRequired":false,"inputRefs":[],"sourceRefs":[],"dependencies":[],"outputs":[],"auditTrail":[],"attempt":0,"maxAttempts":1,"payload":{"probe":"deterministic-qa-ready"}}'::jsonb,
 'ci:scheduler:qa:1'
);

create temporary table scheduler_runtime_candidates as
select * from public.agent_dispatch_candidates(array['research','fact-check','editorial-writer','visual-director','qa'],5);
create temporary table scheduler_publisher_candidates as
select * from public.agent_dispatch_candidates(array['publisher'],5);
reset role;

insert into agent_scheduler_assertions values
('ready_research_is_returned',exists(select 1 from scheduler_runtime_candidates where job_id='10000000-0000-4000-8000-000000000005'),jsonb_build_object('candidates',(select jsonb_agg(job_id) from scheduler_runtime_candidates))),
('ready_deterministic_qa_is_returned',exists(select 1 from scheduler_runtime_candidates where job_id='10000000-0000-4000-8000-000000000008'),jsonb_build_object('candidates',(select jsonb_agg(job_id) from scheduler_runtime_candidates))),
('unapproved_named_person_visual_is_blocked',not exists(select 1 from scheduler_runtime_candidates where job_id='10000000-0000-4000-8000-000000000006'),'{}'),
('publisher_is_excluded_even_when_publication_gates_pass',(select count(*)=0 from scheduler_publisher_candidates),jsonb_build_object('publisherReady',public.agent_job_ready('10000000-0000-4000-8000-000000000007'))),
('candidate_batch_is_bounded',(select count(*)<=5 from scheduler_runtime_candidates),jsonb_build_object('count',(select count(*) from scheduler_runtime_candidates)));

DO $$ BEGIN
 IF EXISTS(select 1 from agent_scheduler_assertions where not passed) THEN
   RAISE EXCEPTION 'AGENT_SCHEDULER_ASSERTIONS_FAILED:%',(select jsonb_agg(jsonb_build_object('name',name,'details',details)) from agent_scheduler_assertions where not passed);
 END IF;
END $$;
select jsonb_build_object('agent_scheduler',true,'assertions',(select count(*) from agent_scheduler_assertions),'all_passed',(select bool_and(passed) from agent_scheduler_assertions));
