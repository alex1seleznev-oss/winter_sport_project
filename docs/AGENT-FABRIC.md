# Winter Sports Hub — Agent Fabric

## Goal
Replace one general-purpose automation with a coordinated set of specialist workers. Each agent has one job, a narrow toolset, explicit inputs/outputs and least-privilege write access. An orchestrator routes jobs between them and records provenance.

## Core flow

`Media Watch -> Research / Fact Check -> Editorial Writer -> Visual Director -> QA -> Publisher`

Photo tasks use a parallel path:

`Media Watch / Photo Scout -> Media Curator -> Identity + Rights Gate -> Visual Director -> QA -> Publisher`

No discovery agent publishes directly.

## Agents

### 1. Orchestrator
- Receives events and creates jobs.
- Chooses the specialist agent from `config/agents/registry.json`.
- Tracks job state, retries, dependencies and provenance.
- Cannot invent facts or bypass review gates.

### 2. Media Watch
- Monitors approved public sources and records deltas.
- Produces source snapshots and candidate events.
- Does not write calendar facts or publish articles.

### 3. Photo Scout
- Finds candidate athlete/event images from allowed sources.
- Records source URL, author, licence, dimensions, hashes and athlete candidate.
- Never marks identity as verified and never deploys an image.

### 4. Media Curator
- Deduplicates images, rejects unsupported media and obvious namesakes.
- Maintains the scalable athlete media library.
- Sends ambiguous identity/rights cases to review instead of guessing.

### 5. Research Agent
- Builds an evidence packet for a story or event from multiple sources.
- Separates official facts, secondary reporting and community signals.
- Outputs claims with source references and timestamps.

### 6. Fact Checker
- Validates each material claim against the evidence packet.
- Flags conflicts, stale information and unsupported claims.
- Can block downstream publication.

### 7. Editorial Writer
- Writes articles from an approved evidence packet only.
- Uses the site's editorial voice, structure, SEO metadata and internal links.
- Does not silently add unsupported biographical/current-form claims.

### 8. Visual Director
- Selects verified real-athlete media and composes page/card/hero layouts.
- May crop, mask, resize and layer reviewed images.
- Must not synthesize named athletes, reconstruct faces or replace identity/equipment.
- Falls back to typographic/data graphics when no verified image exists.

### 9. QA Agent
- Runs deterministic tests, build, browser checks, link/source checks and visual constraints.
- Verifies identity/rights gates, mobile behavior, accessibility and no accidental external/generated image calls.
- Blocks merge when a required check fails.

### 10. Publisher
- The only agent allowed to promote reviewed content to production-facing state.
- Requires Fact Checker + QA success and the appropriate media rights/identity state.
- Records the exact inputs, commit/revision and publication timestamp.

## Job contract
Every task passed between agents must contain:

- `jobId`
- `type`
- `createdAt`
- `inputRefs`
- `sourceRefs`
- `requestedBy`
- `agentId`
- `status`
- `confidence`
- `reviewRequired`
- `outputs`
- `auditTrail`

## Permission model
Discovery agents are read-only against production data. Review agents may write review artifacts. Publisher is the only production mutation role. Photo Scout and Media Curator can never set `deployable=true`; that requires the explicit identity/rights gate.

## Runtime decision — v1
The first production implementation will use the OpenAI Agents SDK in TypeScript, running inside the existing application infrastructure rather than a separate bot fleet.

- **Agent runtime:** OpenAI Agents SDK for typed agents, tools, handoffs, guardrails and tracing.
- **Orchestrator runtime:** a server-side TypeScript worker/API route deployed with the Winter Sports Hub application on Vercel.
- **Durable state / queue:** Supabase Postgres tables for jobs, dependencies, attempts, evidence references, approvals and audit records.
- **Recurring triggers:** existing GitHub Actions for bounded scheduled collectors; Vercel cron/server routes may enqueue work where low-latency dispatch is useful.
- **Specialist execution:** one registry entry per role; the orchestrator selects the role, model profile and allowed tools, then persists the result before any handoff.
- **Publication:** deterministic publisher code, not an autonomous general-purpose model, performs production mutation only after the required gates are satisfied.

This keeps orchestration, storage and approvals under project control while allowing model choice to be changed per role without redesigning the pipeline.

## Model routing policy
Do not use the strongest model for every task.

- `economy`: routing, classification, deduplication, metadata extraction and routine Media Watch triage.
- `balanced`: ambiguous media review, evidence synthesis and routine fact checks.
- `expert`: final editorial writing, difficult research conflicts and complex visual/editorial decisions.
- `deterministic`: QA tests, rights/identity state transitions, database mutations and publishing whenever rules can be expressed in code.

Model IDs are configuration, not architecture. They may be upgraded or downgraded without changing agent contracts. Escalation to a more expensive profile is allowed only when confidence or task complexity crosses a configured threshold.

## Cost controls
- Hard monthly API budget and per-job token/tool-call ceilings.
- Cache shared system instructions and stable project context.
- Deduplicate source material before model calls.
- Use deterministic code before model inference whenever possible.
- Run expensive Research/Writer/Visual stages only for events that pass Media Watch triage.
- Batch low-priority collection/review work where practical.
- Log tokens, tool calls and estimated cost per agent/job so cost can be attributed and tuned.

## Automation model
GitHub Actions remains the execution scheduler for bounded recurring jobs. Supabase can hold durable queues/job state. Each workflow calls one specialist worker rather than embedding all logic in one script. The orchestrator dispatches the next job only after dependency conditions are satisfied.

## First migration targets
1. Treat current Media Watch as `media-watch`, not as the global automation system.
2. Treat the athlete library collector as `photo-scout` + `media-curator`.
3. Split editorial generation into `research`, `fact-check`, and `editorial-writer` stages.
4. Route reviewed media/content into `visual-director`.
5. Put final build/browser/source checks under `qa`.
6. Keep production promotion behind `publisher`.

The registry in `config/agents/registry.json` is the machine-readable source of truth for these roles.