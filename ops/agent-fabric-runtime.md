# Agent Fabric runtime

The Agent Fabric execution path is intentionally server-only and fail-closed.

Required Vercel environment variables:

- `NEXT_PUBLIC_SUPABASE_URL` — Winter Sports Hub Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only Supabase credential used by the durable queue adapter.
- `AGENT_DISPATCH_SECRET` — bearer secret protecting `/api/agent-dispatch`.
- `CRON_SECRET` — bearer secret used by Vercel Cron to call `/api/agent-scheduler`.
- `OPENAI_API_KEY` — server-only model provider credential.
- model binding: the current fallback is `OPENAI_MODEL=gpt-6.1-sol`; profile-specific `OPENAI_MODEL_ECONOMY`, `OPENAI_MODEL_BALANCED`, or `OPENAI_MODEL_EXPERT` may override it later.

As of 2026-10-05 all required runtime variable names are configured in Vercel for production, preview, and development. Secret values remain server-only and are not stored in the repository.

Runtime flow:

`queued -> leased -> running -> succeeded | failed | review_required`

Model-runtime workers load dependency artifacts from Supabase, persist model runs and validated artifacts, and keep retry/review handling inside the durable queue contracts. The deterministic `qa` worker uses the same durable job lifecycle without a model call. A passing QA run emits a `qa-report` plus a `release-candidate`; a failing QA run emits only a `qa-report` and moves to review.

The scheduler is separately protected and deliberately bounded. One invocation recovers expired leases, asks Supabase only for ready jobs belonging to the approved executable roles, then executes at most one job. The database candidate RPC independently excludes Publisher even if a caller requests it.

The production Vercel configuration includes a once-daily `/api/agent-scheduler` fallback. Higher-frequency scheduling may be added through Supabase `pg_cron` + `pg_net` only after the production execution path is verified end-to-end.

`publisher` remains disabled. No model worker or deterministic QA worker has direct production publication permission.
