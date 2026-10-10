# Reader release — 10 October 2026

Design settings: variance 6, motion 4, density 3. Preserve the existing dark ice-blue sports publication identity. Photography is authentic and unchanged; the cover uses one image with credited provenance. The reader-facing navigation exposes six useful destinations; operational architecture stays on its direct URL.

## Agents and useful output

The live official-story chain completed research, fact check, writing and deterministic QA on 10 October. QA job `8b1c3945-c864-4f42-8dca-67352a9e115c`, fact job `65b8c4bb-da18-4e7e-bf8a-710657c297f7`, writer job `af5c64fb-8bf2-4568-b76a-1195484e0a21`. Its release revision is `sha256:a24b22c2937a053b8ea0c3334ed0b29259da302323d3aa800caa9617525bd528`.

The model produced a short brief about the IBU event window, 23–29 November. Editorial review expanded it into `kontiolahti-dates-2026`, using the organiser's race programme, 26–29 November, checked on 10 October. The expanded text has its own reviewed manifest checksum; the earlier automated QA approval covers the original brief, not this later expansion. Calendar dates were not mutated from the event-window evidence.

Future handoff: `node scripts/agents/export-reviewed-release.mjs <qa-job-id>` exports an exact draft/evidence package after replaying current QA and comparing its revision to the persisted release. Credentials are server-only environment variables. Exports stay private, never gain publication or calendar-write permission, and are ready for editorial review. The publisher remains explicitly disabled.

QA now requires a distinct supported check for every used claim and ties each check to that claim's sources. Unresolved conflicts, unrelated evidence, guessed internal routes and empty named-person visual packages block release. Writer instructions distinguish event dates, competition days and start times.

## Presentation and SEO

Global palette, type scale and focus treatments unify all public templates. Fullscreen cover, calendar, stages, guides, article cards and reading pages share the same visual language. Small-screen contents collapse; article text can be enlarged and printed. Reading progress uses scoped GSAP/ScrollTrigger, transform-only rendering and cleanup. Animations never alter athlete photographs.

Canonical metadata includes social previews. A local generated Open Graph image and icon avoid external tracking. The photo archive's inherited noindex was removed. Legacy analytics and intelligence routes redirect to useful public destinations. Missing athlete profiles return 404. Broadcast links are validated HTTPS and failures differ from an empty catalogue.

Production robots/sitemap were available during audit. The connected Search Console account exposes only a different website; search-engine submission/index coverage for Winter Sports Hub cannot be confirmed in this session.

## Validation before deployment

353 deterministic tests passed, including missing-claim checks, source substitution, unresolved conflicts, invented links and revision tampering. Production build and HTTP/API regression checks passed. Today's persisted release replayed with all 10 current checks passing and an unchanged revision. Browser CI and live production checks are required before declaring the release complete.
