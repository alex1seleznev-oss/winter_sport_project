# Biathlon and provenance release — 02.10.2026

## Actual production data action
A manually reviewed, bounded transaction added12 biathlon races:6Kontiolahti(26–29Nov) and6Hochfilzen(4–6Dec), linked to the two existing stages. Two official-organizer source entries and12verified journal entries were created atomically. Existing races/stages were not overwritten. The transaction required both stages to have no verified races, checked dates/sport/scope, locked calendar tables briefly and returned counts. Generated keys are project-owned organizer keys, NOT fabricated official IBU RaceIds.

Sources: Kontiolahti's Finnish/English/German programme pages, Hochfilzen official competition-program.html. IBU corroborates venue/stage windows, but its selected-EventId HTML representation returned Munich/LoopOne rather than the selected winter event and was not used for individual races. No old FLGR proposal or blocked schema migration was retried.

All12 start_time_msk values remain NULL. Raw source clocks do not establish an explicitly verified timezone. Specifically women's sprint Kontiolahti29Nov reads17:15 on Finnish/German pages and17:55 on English pages. No version chosen by majority or fetch recency; not interpreted as cancellation. Hochfilzen training3Dec is not a race. Main LeGrandBornand ticket page still labelled its detailed information2025 in the retrieved version; a preproduction host was not accepted as a final programme.

## Read-only controller
config/biathlon-programmes.json stores reviewed source snapshots, not generated event rows. The new parser checks exact approved URL/path, venue/season, race dates and distinct formats/categories. Raw clocks remain raw; no MSK conversion or DB credentials. One known English typo Spring,women is explicitly bounded to the reviewed Kontiolahti case and reported as a warning, corroborated by Finnish sprint wording. Unknown hosts, unreviewed typos, out-of-window races and duplicate slots fail closed. Gate opening/closing and training do not become races.

The GitHub workflow schedules a review every12hours after merge. A matched baseline with known clock disagreement is reported as matched_with_time_caveats, not as verified start times. A changed/missing source slot or fetch/parser error requires review; missing row never triggers automatic cancellation. Receipts include source URL, fetched time, HTTP status and SHA256. Actual run results must be recorded in PR before any claim that live parsing succeeds. No Telegram notification channel, autonomous applier or durable notification deduplication is added.

## Viewer transparency
/sources separates primary sources from community/social context by source role, not numerical score alone. Registry membership does not imply a working collector. Dated source observations describe retrieved representations, not an always-live outage report.

/changes renders up to40 verified publication records using an allowlisted presentation model. It never dumps raw JSON, operational logs or private proposals. Historical names/source are used when present, otherwise explicitly labelled current-card fallback. Journal time is project detection/publication time, not an invented federation publication timestamp. Twelve new entries do not make the journal a complete archive of prior imports.

/data-health and /api/calendar-quality describe a complete bounded public season snapshot. Per-direction counts distinguish stage-only, stage-with-at-least-one-race, actual cards and known times. Structural warnings cover mismatched stage/date/sport, missing provenance and exact duplicate candidates; they do not prove source truth, detect every semantic duplicate or automatically edit records. Missing detailed programmes are not cancellations. Query failures are not zero counts.

## Unchanged gates
53FLGR candidates stay pending; wsh_review is absent; no new DDL; old privilegedEdgeFunctions and media uploads stay paused. Signup change remains owner-confirmed. No paid plan, private user accounts, credentials or files created. Testing and deployment status are separate from verification of sporting facts. Future automated edits still require properly reviewed transactional application and protected recovery procedures.
