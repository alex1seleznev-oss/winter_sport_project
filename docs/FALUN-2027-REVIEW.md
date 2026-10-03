# Falun 2027: completed official schedule review

Review ID: `falun-2027-official-review-20261003-r2`.
Database: Winter Sports Hub, competition external key `fis-wch-2627-falun`.
Applied and independently read back on 2026-10-03. This is a record of a reviewed data correction, not an automatic publisher.

## Completed database outcome

The partial application recorded in `ingestion_runs` #13 was resolved in a single transaction. Run #14 has status `verified_change_applied` (2026-10-03T18:36:29.914412Z).

- 14 existing event records updated and 4 missing qualification records added: 18 total.
- 10 records have a verified gender-specific race start in `start_time_msk`.
- 8 sprint/team-sprint records belong to four shared M/W sessions. Their `start_time_msk` is NULL; the shared session start and its meaning are retained in event notes and the audit log.
- Two previously populated sprint-final start times were cleared because they were shared session times, not published individual gender start times.
- Original proposals: 14 applied and 8 rejected as superseded/inaccurate. Six corrected proposals were applied (four qualification entries and two precision corrections). No Falun proposals remain pending. Rejected originals were preserved, not deleted or represented as applied.
- 41 audit records preserve complete before/after event and competition values, original proposal payloads, review decisions, source URLs, source publication time, fetch time, hashes, FIS race IDs and time precision.
- Source authority/confidence remains 5. Other competitions, broadcasts and results were not modified. No schema, role, RLS, credential or publication-permission changes were made.

Independent read-back: 18 expected keys, 18 matching rows, zero time mismatches, zero provenance mismatches, eight shared-session notes. This verifies the database state; it is not a claim that every future source document or race time is immutable.

## Official evidence

Official organizer, English:
https://falun2027.com/here-is-the-competition-schedule-for-falun-2027/

Official organizer, Swedish:
https://falun2027.com/sv/har-ar-tavlingsprogrammet-pa-falun-2027/

FIS event:
https://www.fis-ski.com/DB/general/event-details.html?eventid=63107&seasoncode=2027&sectorcode=CC

FIS result shell / event selector:
https://www.fis-ski.com/DB/general/results.html?raceid=52297&sectorcode=CC

The English publication metadata is `2026-09-17T12:32:11+00:00`, not an invented midnight timestamp. English and Swedish programme times agree. FIS confirms the 18 entries but does not provide individual gender start times for the combined sessions in the captured event document. Organizer caveat: subsequent programme changes remain possible.

Evidence run: https://github.com/alex1seleznev-oss/winter_sport_project/actions/runs/37144590702

Artifact `11281847179`, `falun-official-programme-evidence`, contains four original HTML documents and their manifest. The downloaded ZIP and every document hash were independently checked. The workflow is now manual-only and read-only: fixed official HTTPS URLs, required TLS validation, no redirect following, bounded document size, no database credentials.

ZIP SHA-256: `ef4fda269a8a304b07afa456fb030da576c0d9ab5f523ea9f075dffed9beef34`.

| Document | Fetched at (UTC) | SHA-256 |
| --- | --- | --- |
| Organizer English | 2026-10-03T18:32:43.353555Z | `4b6693e1ae3dd8ee11f75d7866d60cbc81ca0cd9d1a14118f392fbb31732536b` |
| Organizer Swedish | 2026-10-03T18:32:44.378748Z | `32df410cf1f7ff2640deb23affc775bb88f6ae29e424ec756ae8e1dfc182bbfd` |
| FIS event | 2026-10-03T18:32:45.237940Z | `2fd1fe9bb1dfa578e16c0ea83c24be78cb9a61841483df7618fc56767c51c310` |
| FIS result shell | 2026-10-03T18:32:45.745304Z | `0903b61bb1c62b0828170cd497da3958aae740a445205723512576dd1e3c5f3e` |

Artifact retention is 30 days (this capture expires 2026-11-02). Hashes and provenance remain in the database and this review; hashes do not substitute for permanent storage of the original bytes.

## Time semantics: never invent precision

Convert using `Europe/Stockholm` to `Europe/Moscow` on the actual race date. All dates in this programme are +2 hours from the stated Swedish local time to Moscow. The transaction checked the conversion again in PostgreSQL.

An organizer line for a joint men's/women's session proves the session start only. It does not prove that both races start simultaneously. Do not put the shared time into both gender-specific `start_time_msk` fields merely to eliminate NULLs. The legacy schema has no structured session field, so the current explicit session time is stored in `notes` and `event_updates.current_value` instead. A later timing-schema change would require a separate compatible migration.

| Date | Session | Shared beginning, MSK | Affected entries |
| --- | --- | --- | --- |
| 2027-02-25 | Sprint qualification, free | 13:45 | Women and men |
| 2027-02-25 | Sprint finals, free | 16:15 | Women and men |
| 2027-03-03 | Team sprint qualification, classic | 14:15 | Women and men |
| 2027-03-03 | Team sprint finals, classic | 16:15 | Women and men |

## Reviewed event identity and precise race times

Every key below has prefix `fis-wch-2627-falun-`. A dash means the separate gender start is not published; see the session table above. Each specific FIS source is stored in event notes as `https://www.fis-ski.com/DB/general/results.html?sectorcode=CC&raceid=<ID>`; race 52297 is not a universal source for every race.

| Key suffix | FIS race ID | Individual start, MSK |
| --- | --- | --- |
| `20270224-75c-m` | 52282 | 17:30 |
| `20270224-75c-w` | 52281 | 15:00 |
| `20270225-spq-m` | 52284 | — |
| `20270225-spf-m` | 52285 | — |
| `20270225-spq-w` | 52283 | — |
| `20270225-spf-w` | 52286 | — |
| `20270227-skiathlon-m` | 52287 | 16:00 |
| `20270228-skiathlon-w` | 52288 | 16:00 |
| `20270302-10c-m` | 52290 | 15:15 |
| `20270302-10c-w` | 52289 | 17:45 |
| `20270303-tspq-m` | 52292 | — |
| `20270303-ts-m` | 52293 | — |
| `20270303-tspq-w` | 52291 | — |
| `20270303-ts-w` | 52294 | — |
| `20270304-relay-m` | 52295 | 15:15 |
| `20270305-relay-w` | 52296 | 17:30 |
| `20270306-50f-m` | 52297 | 13:30 |
| `20270307-50f-w` | 52298 | 15:00 |

February 24 contains qualification races (FIS WSCQUA), not medal races. The 18 records include qualifying rounds; they are not 18 medal events.

FIS labels the women's team-sprint qualification (52291) `2x4.5 km`, whereas the men's qualification (52292) is `1.5 km`. The reviewed record preserves the women's official label with an explicit note rather than copying the men's distance. This is a reported source value, not an inference that the race format or course has been independently confirmed. Recheck the official race regulations/start list when published.

## Subsequent verification

Use the exact external keys, source IDs and reviewed values when comparing subsequent official changes. Later shared-session clarification is a meaningful update, not a reason to fill inferred times today. Do not revive rejected r1 proposals or blindly replay them. Any write should preserve old and new values, evidence and review, verify current preconditions, and commit its data and audit atomically.

The read-only evidence workflow neither approves proposals nor writes sports data. A successful HTTP response is not a verified schedule change. This review used the owner's explicit authorization and the connected SQL tool; it did not deploy a new privileged writer.
