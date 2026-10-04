# Agent Runtime v1 — implementation layer

This layer turns the Agent Fabric architecture into enforceable code and now includes a bounded model-execution adapter for the read/review specialists. Production publication remains outside the model runtime.

## Implemented
- typed-by-contract job envelope and audit trail;
- secret-field rejection for job/audit payloads;
- deterministic routing from job type to specialist role;
- explicit model profiles (`economy`, `balanced`, `expert`, `deterministic`);
- explicit skill allowlists per role;
- publisher-only production mutation skill;
- dependency, retry and approval-gate checks;
- separate instructions for all ten roles;
- proposed durable Supabase job/artifact/approval/audit schema with RLS and no anon/authenticated access;
- executable model workers for Research, Fact Check, Editorial Writer and Visual Director;
- OpenAI Responses API provider using native `fetch`, so no SDK dependency or lockfile change is required;
- strict Structured Outputs contracts plus a second local validation layer using the existing artifact validators;
- per-profile input/output ceilings, request timeout, job-attempt ceilings and bounded audit metadata;
- fail-closed provenance rules for evidence, claims and named-person media.

## Model runtime boundary

Only these roles may execute through `model-runtime`:
- `research`
- `fact-check`
- `editorial-writer`
- `visual-director`

A model-runtime worker is rejected if its agent has `productionWrite=true`. `publisher` remains a disabled `deterministic-publisher` worker.

The runtime reads model names from environment variables instead of committing a model ID:
- `OPENAI_MODEL_ECONOMY`
- `OPENAI_MODEL_BALANCED`
- `OPENAI_MODEL_EXPERT`
- fallback: `OPENAI_MODEL`

`OPENAI_API_KEY` is read only inside the provider and is never placed into a job, artifact, audit event or response metadata.

## Structured execution

Every model call receives:
1. the role instruction file;
2. a bounded job projection (`jobId`, type, payload and refs);
3. explicitly supplied typed input artifacts;
4. a strict JSON Schema for that role's output.

The returned JSON is then validated again locally. A syntactically valid model response is not sufficient to pass the control plane.

Additional deterministic checks:
- Research cannot introduce a source URL that was not supplied through the job or a validated `source-snapshot`.
- Fact Check must check every claim exactly once, cannot cite evidence outside the packet, and cannot emit `approved-evidence` on a non-pass decision.
- Approved evidence must contain the exact original evidence packet and the exact emitted fact-check report; the model cannot silently rewrite evidence while approving it.
- Editorial Writer may reference only approved claim IDs and approved evidence refs.
- Visual Director may use athlete media only when it matches a validated `verified-media` input, keeps the reviewed credit, and the job is inside the named-person gate path.
- If verified person media is unavailable, the model can return a typography/data-graphics package with no person media rather than inventing an athlete image.

## Runtime states

The current memory store remains the execution harness for this PR. Model execution moves a job through:

`queued -> running -> succeeded | failed | review_required`

A Fact Check `block` or `review_required` decision becomes `review_required`, not a successful downstream handoff. Provider/network/schema failures become `failed` and can only be retried through the existing bounded job requeue path.

Each completed model run adds bounded audit metadata (`runId`, role, model profile/model name, output artifact types and normalized usage counters). Prompts, API credentials and full model outputs are not copied into the audit trail.

## OpenAI provider behavior

The provider calls `POST /v1/responses` with `store:false` and `text.format.type=json_schema` in strict mode. It treats refusals, malformed JSON, non-completed responses and HTTP/network errors as explicit failures. Timeouts abort the request.

The provider is injectable; tests use a deterministic fake provider and make no external model calls.

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
1. Persist queue, leases, artifacts, approvals and run traces in Supabase.
2. Add idempotency keys and lease-expiry recovery for workers.
3. Wire approved Media Watch/source artifacts into Research jobs and verified athlete media into Visual Director jobs.
4. Add an end-to-end executable editorial pipeline through deterministic QA.
5. Keep Publisher deterministic and separately authorized until durable gates and replay tests are green.
