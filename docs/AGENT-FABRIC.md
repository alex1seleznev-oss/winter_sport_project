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