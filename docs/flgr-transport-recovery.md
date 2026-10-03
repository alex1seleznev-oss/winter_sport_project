# FLGR Results transport and calendar contract — 2026-10-03

## Verified diagnosis, not a network-block assumption

Original monitor run: https://github.com/alex1seleznev-oss/winter_sport_project/actions/runs/37120817001

Isolated diagnostic: https://github.com/alex1seleznev-oss/winter_sport_project/actions/runs/37127801942

On the same Ubuntu GitHub-hosted runner, Node 22 fetch failed with ECONNRESET / UND_ERR_SOCKET for the official FLGR Results calendar, while curl returned HTTP 200 with ssl_verify_result=0. The system CA option did not resolve Node's failure. This establishes a transport-specific failure, not a blanket GitHub-network outage. The exact remote reason for closing Node connections is not known.

The strict same-source fallback was verified by source-monitor run https://github.com/alex1seleznev-oss/winter_sport_project/actions/runs/37128053805 (all five sources reachable). It uses the same identifying WinterSportsHub user-agent and official URL. A successful source-health check is NOT successful parsing or a verified calendar delta.

## Second failure exposed after transport recovery

Read-only discovery then returned FLGR_CALENDAR_CONTRACT_MISMATCH, not a transport error. Live official DOM in https://github.com/alex1seleznev-oss/winter_sport_project/actions/runs/37128168124 (artifact 11275995689) showed compact date ranges such as 26-29.11.2026. Parser 1.0.1 required two full dates. Parser 1.0.2 supports the observed compact format while validating actual dates, order, official links and conflicting duplicates. It never guesses a missing year or an ambiguous cross-year boundary.

## Safety and provenance

- Fallback only for classified reset/socket/connection-timeout failures on the two official FLGR calendar/results hosts and fixed path patterns. No fallback for HTTP denials, redirects, certificate failures or malformed documents.
- HTTPS verification stays enabled; curl config is disabled, proxies are disabled, redirects are not followed, no shell is spawned, and identifying user-agent is unchanged.
- 20-second transfer limit, 2 MiB body cap, private temporary output, mandatory cleanup. Use curl 8.4+ so max-filesize also bounds unknown-length responses during transfer; standard Ubuntu runner meets this requirement.
- Every success preserves original official URL, fetched time, document SHA-256, selected transport and original fallback reason. Transport selection never changes source authority, certainty or publication status.
- Monitor/discovery remain read-only without database credentials. HTTP 200 does not imply an approved race time, parsed schedule, published result or completed ingestion.

## Validation and operations

Run `node --test tests/fetch-official.test.mjs tests/flgr-transport.test.mjs tests/flgr-calendar-dates.test.mjs`, then `node scripts/check-official-sources.mjs` and `node scripts/ingest-flgr.mjs` in the deployed environment. Check all official stage detail documents, not just the calendar landing page. Merge only after CI; confirm the first main-branch source-monitor and discovery artifacts before recording recovery in ingestion_runs.

`FLGR verified transport diagnostic` is manual-only. Its Node probe disables fallback so the comparison cannot accidentally label curl success as Node success. `scripts/inspect-flgr-calendar.mjs` provides optional read-only DOM diagnostics. Semantic failures automatically retain bounded row diagnostics and the failed document's provenance.

If connectivity or parsing fails again, keep the last verified sports data unchanged, retain the error category and official URL, and alert on a changed incident rather than presenting a successful import. Do not disable TLS or publication review guards as a workaround.
