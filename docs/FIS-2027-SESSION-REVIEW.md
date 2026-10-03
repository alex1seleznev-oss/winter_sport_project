# FIS WC and Tour de Ski 2026/27: completed session review

Review: `fis-sessions-2027-reviewed-20261003-r1`. Project: Winter Sports Hub (`wmiypacyraepljalppub`).
Applied on 2026-10-03 through the connected SQL tool with the owner's explicit authorization.
This is a reviewed calendar correction, not an enabled automatic publishing worker.

## Verified database outcome

- 22 missing qualification rows inserted; 22 corresponding existing finals corrected from the current official FIS labels, distances and source links.
- Existing final IDs and external keys are preserved. Where final country fields were empty, they now use the verified parent competition country.
- 83 rows across 12 World Cup / Stage World Cup (Tour de Ski) venues; 22 qualifications.
- All 44 reviewed proposals are applied, with 44 complete before/after audit records and exact FIS Codex/race IDs.
- Source authority/confidence remains 5. Source publication time is NULL because the event page does not establish a publication timestamp.
- All 22 new qualification start times are NULL: the source does not publish race clocks. Team captain meeting clocks are not race starts.
- An independent read-back matched all 44 proposals and evidence hashes, found zero remaining corrections, duplicate keys or pending proposals for this package.
- All 83 records and 22 qualifications are visible to the anon read role. All 39 other existing rows in these stages were read back byte-for-value unchanged.
- Ingestion run #19: `verified_change_applied`, items_seen=83, items_written=44.
- Falun, biathlon, Russian calendars, results, broadcasts, existing pending FLGR proposals and publication permissions are outside this correction.

The transaction locked competitions/events/proposals in fixed order, checked complete current parent/race snapshots, source authority, new-key absence and every individual prior row, then wrote records/proposals/audits/run in one commit. A concurrent state change aborts before publication. No DDL, new credentials, RLS changes, migration-based data writes, new SECURITY DEFINER function or paused-writer activation were used.

## Official source evidence

Verified source run: https://github.com/alex1seleznev-oss/winter_sport_project/actions/runs/37149233237
Exact parser/monitor commit: `ed56067f2e466df3a1b2861dc5900800f77d9668`.
Artifact: `11282543807`, `fis-event-detail-evidence`.
ZIP SHA-256: `10aad87a605608a3bc685f447c55a88eedf8a21c7bca7b0aca00a5d7e3c2ff6f`.

The downloaded ZIP and all 12 original HTML bytes were independently hashed and parsed locally. The artifact includes those documents and their retrieval manifest; retention expires 2026-11-02. Hashes and exact source identities also remain in the database and the reviewed repository baseline. A hash is not permanent storage of the original source bytes.

| Source venue | Event ID | Fetched at UTC | Document SHA-256 |
| --- | --- | --- | --- |
| Ruka | 63002 | 2026-10-03T19:48:50.106Z | `41253bd60cb5db6d7552d107e2382846d7aa240ce779ce7bd83f8f9c86b0072f` |
| Trondheim | 63003 | 2026-10-03T19:48:50.856Z | `ace749bd028edc7c5cc7ab36f98478abf99dae14476b95c87e876fe66f2a9640` |
| Davos | 63004 | 2026-10-03T19:48:51.558Z | `af81a523b52c7a0f6ae21bbeaa12b5442732cc00c1adfcecab7543b8788e770a` |
| Les Rousses | 63001 | 2026-10-03T19:48:51.961Z | `23159b180c3d90bb49ccec8be45e9d23b3b76404489d9f92e14b329db05d0db6` |
| Oberstdorf | 63005 | 2026-10-03T19:48:52.632Z | `e498fadf0e52ee13202ff7100cddd1c858dd7c83264f67c9e93ea1dca964d5c7` |
| Val di Fiemme | 63006 | 2026-10-03T19:48:52.882Z | `b16b9ff7cc7cf500f5b0a0cfce6c292c8c6aacd49dd1c8ce3549921d60d59cd6` |
| Engadin | 63007 | 2026-10-03T19:48:53.582Z | `d6882bf0a0bfd05da5c1818aa1a366a24d477b87b18fba443a77cb1e07630ed8` |
| Toblach/Dobbiaco | 63008 | 2026-10-03T19:48:53.986Z | `a52af4bd0a2887cb6608a428d9aa2c26c56cf4b227485ca1d172951777e527e2` |
| Lahti | 63009 | 2026-10-03T19:48:54.679Z | `d262b8e5e19cb8f0f40ff5d08437473c5fbbc128fb8ef6d63a11cee4b97d56c1` |
| Oslo | 63010 | 2026-10-03T19:48:55.352Z | `d9d37511393fc6eff62ea8dede1b1d0ddc9f5b5ce1f00378791372cd56ac5085` |
| Drammen | 63011 | 2026-10-03T19:48:55.578Z | `aa9d03cca76f9ddaa59a0e551861b4c97d0993f3fd8574a46a2a4ac34437e797` |
| Ulricehamn | 63012 | 2026-10-03T19:48:56.269Z | `6cb9c7c6118d26676044cf5e0e6ebacf1204ef078c986535037f19f6c8946e63` |

Every source uses this exact official HTTPS pattern, with its own event ID:
`https://www.fis-ski.com/DB/general/event-details.html?eventid=<ID>&seasoncode=2027&sectorcode=CC`.

The baseline `data/fis-event-sessions-2627.json` preserves all 83 source rows, separate race IDs/Codex, actual dates, genders, styles/distances, empty clocks, timezones and cancellation flags. FIS labels the Davos final team session "Team Sprint Free"; that original label is retained rather than inventing "Final" in the source.

| Stage | Published rows | Qualifications |
| --- | ---: | ---: |
| Ruka | 8 | 2 |
| Trondheim | 8 | 2 |
| Davos | 10 | 4 |
| Les Rousses | 8 | 2 |
| Oberstdorf | 4 | 0 |
| Val di Fiemme | 8 | 2 |
| Engadin | 7 | 2 |
| Toblach | 8 | 2 |
| Lahti | 8 | 2 |
| Oslo | 2 | 0 |
| Drammen | 4 | 2 |
| Ulricehamn | 8 | 2 |

## Parser, monitor and viewer

The old whole-page text regex could omit a malformed row and rejected Tour de Ski because it expected ordinary WC text/category. The replacement uses the actual event table and checks the embedded FIS event/season/sport identity, canonical URLs, every row, real ISO dates, race links, repeated responsive labels/genders, WC/SWC categories, duplicate Codex/race IDs and status/time metadata. No year is inferred from a four-digit Codex.

The scheduled read-only monitor compares the full reviewed structure, not only counts. A changed date, distance/style, phase, gender, race identity, cancellation or published clock raises attention and retains original evidence. It does not query live production data, approve proposals or write to the database. The pure reconciliation helper is used for explicit local review against a separately acquired database snapshot and was verified to produce zero repeated writes after this application.

Viewer labels distinguish ordinary/team qualifications in Russian. For equal or missing clocks, qualifications are listed before finals within a stage; published dates/clocks remain the primary order. This is round order without an invented time.

Local validation: 22 new profile tests pass; 37 pass including existing domain/viewer tests. The actual GitHub source run passed 20 profile tests then all 12 live official sources. Final PR platform checks include the added order tests and four Chromium/WebKit scenarios for the real stage/calendar/race journey and date-only ICS.

Final PR CI and production deployment must be verified on the final commit before calling the code release complete.
