# Agent Fabric runtime

The model dispatch path is intentionally server-only and fail-closed.

Required Vercel environment variables:

- `NEXT_PUBLIC_SUPABASE_URL` — Winter Sports Hub Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only Supabase credential used by the durable queue adapter.
- `AGENT_DISPATCH_SECRET` — bearer secret protecting `/api/agent-dispatch`.
- `CRON_SECRET` — bearer secret used by Vercel Cron to call `/api/agent-scheduler`.
- `OPENAI_API_KEY` — server-only model provider credential.
- model binding: the current fallback is `OPENAI_MODEL=gpt-6.1-sol`; profile-specific `OPENAI_MODEL_ECONOMY`, `OPENAI_MODEL_BALANCED`, or `OPENAI_MODEL_EXPERT` may override it later.

Runtime flow:

`queued -> leased -> running -> succeeded | failed | review_required`

The dispatcher executes only `model-runtime` workers, loads dependency artifacts from Supabase, persists model runs and validated artifacts, and keeps retry/review handling inside the durable queue contracts.

The scheduler is separately protected and deliberately bounded. One invocation recovers expired leases, asks Supabase only for ready jobs belonging to the approved model-specialist roles, then executes at most one job. The database candidate RPC independently excludes Publisher even if a caller requests it.

The production Vercel configuration includes a once-daily `/api/agent-scheduler` fallback. Until `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY` are configured, the scheduler returns a successful `skipped` readiness result rather than attempting model work. Higher-frequency scheduling should be added through Supabase `pg_cron` + `pg_net` only after the runtime credentials are present.

`publisher` remains disabled. No model worker has direct production publication permission.
