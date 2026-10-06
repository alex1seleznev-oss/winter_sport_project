# Agent Fabric runtime

The Agent Fabric execution path is intentionally server-only and fail-closed.

Required Vercel environment variables:

- `NEXT_PUBLIC_SUPABASE_URL` — Winter Sports Hub Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only Supabase credential used by the durable queue adapter.
- `AGENT_DISPATCH_SECRET` — bearer secret protecting `/api/agent-dispatch`.
- `CRON_SECRET` — bearer secret used by Vercel Cron to call `/api/agent-scheduler`.
- `OPENAI_API_KEY` — server-only model provider credential.
- model binding: the current fallback is `OPENAI_MODEL=gpt-6.1-sol`; profile-specific `OPENAI_MODEL_ECONOMY`, `OPENAI_MODEL_BALANCED`, or `OPENAI_MODEL_EXPERT` may override it later.

As of 2026-10-05 all required runtime variable names are configured in Vercel for production, preview, and development. Secret values remain server-only and are not stored in the repository. The scheduler bearer in Vercel is synchronized with the Supabase Vault value used by `agent_scheduler_tick()`.

Runtime flow:

`queued -> leased -> running -> succeeded | failed | review_required`

Model-runtime workers load dependency artifacts from Supabase, persist model runs and validated artifacts, and keep retry/review handling inside the durable queue contracts. The deterministic `qa` worker uses the same durable job lifecycle without a model call. A passing QA run emits a `qa-report` plus a `release-candidate`; a failing QA run emits only a `qa-report` and moves to review.

The scheduler is separately protected and deliberately bounded. One invocation recovers expired leases, asks Supabase only for ready jobs belonging to the approved executable roles, then executes at most one job. The database candidate RPC independently excludes Publisher even if a caller requests it.

The production Vercel configuration includes a once-daily `/api/agent-scheduler` fallback. A Supabase `pg_cron` job also invokes the bounded scheduler through `pg_net`; each invocation still executes at most one ready job.

## Guarded official-source story intake

`agent_enqueue_official_story_pipeline(...)` is the service-role-only bridge for already captured official-source evidence. It accepts only an active `source_feeds` row with `authority_level >= 5`, requires the submitted HTTPS URL to use the same host as that approved feed, and requires non-empty bounded evidence. The exact evidence is placed in `job.payload.sourceEvidence`, so Research cannot replace URL-only provenance with invented source contents.

One accepted intake creates exactly four durable jobs:

`Research -> Fact Check -> Editorial Writer -> QA`

The chain is text-only in v1. `namedPersonMedia=true` is rejected because named-person material must go through the separate Visual Director identity/rights gates. Public and community sources continue to enter through the review-required media-watch path and are not promoted into this official-source chain.

The caller supplies a stable `storyKey` that includes its source revision or equivalent change identifier. Calls for the same story key are serialized and reused only when the prior four-job graph exactly matches the new request; conflicting reuse fails closed. No Visual Director job and no Publisher job are created by this RPC.

### Secretless GitHub OIDC observer

`.github/workflows/official-story-intake.yml` is the first bounded automatic observer for the official-source chain. It runs every three hours or by explicit workflow dispatch, reads the official IBU page through the hardened HTTPS fetch helper, extracts only the configured 2026/27 Kontiolahti World Cup event, and writes a bounded candidate artifact. The parser requires the expected season, event identifier, venue and date-range shape; missing or ambiguous evidence fails closed.

The workflow does not store a Supabase service-role key in GitHub. It requests a short-lived GitHub Actions OIDC token for audience `winter-sports-official-story-intake` and sends the candidate to the `official-story-intake` Supabase Edge Function. The function independently validates the exact repository, `refs/heads/main`, workflow reference, allowed event type and audience. It also hard-binds `sourceKey=ibu` to the approved IBU calendar feed and to the configured `BT2627SWRLCP01` / season `2627` URL contract before resolving the authority-level-5 feed server-side.

The candidate revision is derived from the normalized official evidence. Unchanged evidence therefore reuses the existing four-job graph through the database idempotency guard; a genuine evidence change produces a new story key and a new Research -> Fact Check -> Editorial Writer -> QA chain. This observer has no calendar mutation capability, cannot choose an agent or source-feed ID, rejects named-person media, and cannot create Publisher work.

`publisher` remains disabled. No model worker, deterministic QA worker, OIDC observer, or official-source intake endpoint has direct production publication permission.
