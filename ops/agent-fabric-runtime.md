# Agent Fabric runtime

The model dispatch path is intentionally server-only and fail-closed.

Required Vercel environment variables:

- `NEXT_PUBLIC_SUPABASE_URL` — Winter Sports Hub Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only Supabase credential used by the durable queue adapter.
- `AGENT_DISPATCH_SECRET` — bearer secret protecting `/api/agent-dispatch`.
- `OPENAI_API_KEY` — server-only model provider credential.
- one or more model bindings: `OPENAI_MODEL_ECONOMY`, `OPENAI_MODEL_BALANCED`, `OPENAI_MODEL_EXPERT` (or a compatible `OPENAI_MODEL` fallback).

Runtime flow:

`queued -> leased -> running -> succeeded | failed | review_required`

The dispatcher executes only `model-runtime` workers, loads dependency artifacts from Supabase, persists model runs and validated artifacts, and keeps retry/review handling inside the durable queue contracts.

`publisher` remains disabled. No model worker has direct production publication permission.
