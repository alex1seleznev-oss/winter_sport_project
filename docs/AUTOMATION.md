# Automation architecture

## Source of truth
Official federation and organizer data controls dates, times, disciplines, start lists and results.

## Intelligence layer
Public athlete/team accounts, specialist media, communities and fan pages are discovery/context sources. They create claims, never silent facts.

## Race lifecycle
1. Discover competition.
2. Normalize individual races.
3. Re-check schedule and Moscow time.
4. Discover authorized broadcasts.
5. Collect weather/start-list/context.
6. Generate evidence pack and preview draft.
7. During/after race ingest results.
8. Generate recap/analysis.
9. Evaluate pre-race hypotheses.
10. Update athlete/source reliability history.

## Failure handling
Parsers have regression checks. A broken parser must not erase previous confirmed data. Unverified schedule changes remain pending.
