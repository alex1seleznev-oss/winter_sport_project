-- Follow-up hardening for an already-installed Agent Fabric durable queue.
-- Safe to replay after agent_fabric_jobs.sql + agent_fabric_legacy_compat.sql.

-- The durable migration added review_required with DEFAULT false before the legacy
-- compatibility trigger existed. Normalize pre-existing legacy rows once so their
-- durable projection matches the legacy status semantics used by future writes.
update public.agent_jobs
set review_required=(status='awaiting_review'),updated_at=now()
where agent_key is not null
  and job_type like 'legacy.%'
  and review_required is distinct from (status='awaiting_review');

-- Cover the agent_artifacts.run_id foreign key for run-centric cleanup and lookup.
create index if not exists agent_artifacts_run_idx
  on public.agent_artifacts(run_id)
  where run_id is not null;
