# Agent input coverage, operating visibility and public navigation
## Problem and scope
The scheduler was healthy but idle. The official observer watched only Kontiolahti, while unchanged evidence correctly reused its completed graph. Community observations and the legacy editorial queue require separate review and cannot be treated as ready model work.
## Changes
- Rotate deterministically through actual World Cup event IDs BT2627SWRLCP01–09 returned by the approved IBU 2627 Level 1 feed. Process exactly one event per workflow invocation; log the selected ID and actual coverage. Preserve the old Kontiolahti idempotency key and all official-source/OIDC/publication boundaries.
- Retry a transient empty FIS document or socket interruption once. Continue failing on the second failure; no retries for HTTP denials, TLS, redirects or document limits.
- Replace the old role registry display with current aggregate queue counts, a capped ready-job count and last completed model call. Worker configuration is explicitly separate. Failure to read telemetry shows unknown rather than zero.
- Add direct calendar/article navigation to the real-photo cover; keep photographs untouched.
- Emit WebSite structured data only for the configured canonical origin. Invalid/missing athlete IDs return real 404s; unfinished numeric profiles have self-canonicals and noindex.
## Outstanding
Community review backlog and the old editorial queue are not automatically promoted. Publisher remains disabled. These changes increase official-source draft coverage; they do not enable automatic publication or claim that all roles are active.
## Verification
Unit, build, HTTP and desktop/mobile Playwright checks run in the pull request. The deployment and first new observer receipt must be inspected separately after release. This record does not assert a successful future run.
