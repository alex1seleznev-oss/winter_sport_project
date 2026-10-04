# Agent Runtime v1 — implementation layer

This layer turns the Agent Fabric architecture into enforceable code before any model or external credential is introduced.

## Implemented in this layer
- typed-by-contract job envelope and audit trail;
- secret-field rejection for job/audit payloads;
- deterministic routing from job type to specialist role;
- explicit model profiles (`economy`, `balanced`, `expert`, `deterministic`);
- explicit skill allowlists per role;
- publisher-only production mutation skill;
- dependency, retry and approval-gate checks;
- separate instructions for all ten roles;
- dry-run CLI that shows routing/skills without calling a model or mutating data;
- proposed durable Supabase job/artifact/approval/audit schema with RLS and no anon/authenticated access.

## Why the model runtime is not wired in the same step
The OpenAI Agents SDK is the planned execution runtime, but this repository currently has no SDK dependency or model credential. The control plane is intentionally made testable first. A following change may add `@openai/agents` and Zod v4, then map these existing role manifests into SDK `Agent` definitions and tools. The SDK adapter must not weaken the deterministic permission/gate layer.

Official TypeScript SDK guidance supports agents with instructions/tools, handoffs, guardrails and tracing. Our architecture keeps publication deterministic and outside a general-purpose discovery agent.

## Canonical job types
- `source.*` → Media Watch
- `media.discover*` → Photo Scout
- `media.curate*` → Media Curator
- `research.*` → Research
- `fact.*` → Fact Checker
- `editorial.*` → Editorial Writer
- `visual.*` → Visual Director
- `qa.*` → QA
- `publish.*` → Publisher
- `orchestrate.*` → Orchestrator

Unknown job families fail closed.

## Publication gates
A `publish.*` job cannot dispatch until `fact-check-passed` and `qa-passed` approvals exist. A named-person `visual.*` job cannot dispatch until `identity-reviewed` and `rights-reviewed` approvals exist.

## Next implementation wave
1. SDK adapter for Research / Fact Check / Writer first (read/review only).
2. Wrap existing Media Watch and athlete photo collector as deterministic specialist tools.
3. Persist queue state in Supabase after migration replay and review.
4. Add bounded server-side dispatch endpoint with authentication and idempotency.
5. Add tracing/cost fields and hard per-job ceilings.
6. Keep Publisher deterministic and separately authorized.
