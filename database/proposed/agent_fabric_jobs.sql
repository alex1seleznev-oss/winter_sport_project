-- Proposed durable control-plane storage for Agent Fabric v1.
-- Review and replay-test before applying to production.

create table if not exists public.agent_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  agent_id text not null,
  status text not null check (status in ('queued','blocked','running','succeeded','failed','review_required','cancelled')),
  requested_by text not null,
  confidence text not null default 'unknown' check (confidence in ('unknown','low','medium','high','verified')),
  review_required boolean not null default false,
  attempt integer not null default 0 check (attempt >= 0 and attempt <= 10),
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  input_refs jsonb not null default '[]'::jsonb,
  source_refs jsonb not null default '[]'::jsonb,
  dependencies jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_artifacts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.agent_jobs(id) on delete cascade,
  artifact_type text not null,
  storage_ref text not null,
  sha256 text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_approvals (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.agent_jobs(id) on delete cascade,
  gate text not null,
  decision text not null check (decision in ('approved','rejected','revoked')),
  evidence_refs jsonb not null default '[]'::jsonb,
  decided_by text not null,
  decided_at timestamptz not null default now(),
  unique(job_id,gate,decision,decided_at)
);

create table if not exists public.agent_audit_events (
  id bigint generated always as identity primary key,
  job_id uuid references public.agent_jobs(id) on delete cascade,
  agent_id text not null,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists agent_jobs_status_created_idx on public.agent_jobs(status,created_at);
create index if not exists agent_jobs_agent_status_idx on public.agent_jobs(agent_id,status);
create index if not exists agent_artifacts_job_idx on public.agent_artifacts(job_id);
create index if not exists agent_approvals_job_gate_idx on public.agent_approvals(job_id,gate);
create index if not exists agent_audit_job_created_idx on public.agent_audit_events(job_id,created_at);

alter table public.agent_jobs enable row level security;
alter table public.agent_artifacts enable row level security;
alter table public.agent_approvals enable row level security;
alter table public.agent_audit_events enable row level security;

revoke all on public.agent_jobs from anon, authenticated;
revoke all on public.agent_artifacts from anon, authenticated;
revoke all on public.agent_approvals from anon, authenticated;
revoke all on public.agent_audit_events from anon, authenticated;

-- Runtime server credentials are intentionally not created in SQL or stored in this repository.
-- Production mutation remains a separate Publisher capability after application-level gates pass.
