# My Season / mobile experience — 2026-10-03

## Scope and boundaries

A user-facing release for winter_sport_project only, based on fresh main e31fe9148740135cb416279307c75ca6f091a154 so the independently applied FLGR canonical-host fix is preserved. No Supabase mutations, new migrations, accounts, paid services, photo publication or blocked-operation retry.

Homepage reuses one bounded catalogue snapshot for featured stage, four sport/scope entry points, next races and upcoming stage cards. Cancelled/completed records are not advertised as upcoming. A later date is labelled later, not today/live. Dates and amounts come from the published DB, no race clock, athlete portrait or unlicensed photo is invented. Blue winter palette and premium stage components retained.

## Local selection

Root client context stores only version, season and public numeric stage/race IDs under wsh:my-season:2026-27:v1. First visit reads but does not create a localStorage record. Persistence occurs on explicit Save/Remove. No server account/profile is created, no hidden network write occurs when bookmarking. Limits:80stageIDs and200explicitRaceIDs; raw storage16KiB. Wrong schema/season, arbitrary keys, invalid numbers and corrupt JSON are rejected. Only this storage key is cleared; not other origin data.

Browser state is initialized after hydration, no per-user SSR module global. Storage events update other tabs. Latest state is read before a local toggle; simultaneous writes in multiple tabs still have last-write-wins behavior and are NOT a transactional sync system. Blocked/quota-limited storage gives memory-only state with a visible warning. Browser reset, private browsing and changing origin/device may lose the selection; no backup or cross-device sync promised.

/my-season resolves selectedIDs against fresh published server data on page load/Refresh. No cached race status/time is stored locally. Saving a stage expands its currently published race rows, deduplicated against individually saved races. Cancellations remain visible and can be filtered. Unresolved references are retained as unavailable, never implicitly marked cancelled or silently deleted. Removing an explicit race bookmark does not exclude a race inherited from a saved stage; UI says so. When data queries fail, bookmarks remain and export is disabled.

## Explicit export

POST /api/my-season.ics accepts only {ids:number[]} after4KiB stream-bound JSON validation, max200references. Uses anonymous public calendar access; no service key. All requested records must be in the published seasonal snapshot or409is returned without a partial successful file. No arbitrary URL/SQL accepted. Files preserve the existing UID/time/date-only/cancellation rules; no reminder/invitation/attendee inserted. Responses no-store. Client sends selectedIDs only after explicit export, omits credentials, receives a Blob and releases its temporary objectURL. User gets a one-time download, not an automatically updating subscription. Native calendar-provider behavior remains untested.

## Navigation and sharing

Mobile bottom navigation uses safe-area padding and >=44px controls, active-area matching includes stage/race details. Desktop has active navigation and contextual hints via Next useLinkStatus. Inline loading indication avoids reintroducing the streaming-boundary soft404 regression. Extra links remain in the mobile menu. Native sharing passes only the fixed same-origin entity path; cancellation stays cancellation, clipboard/manual-field fallbacks do not invent successful delivery. No external API key or social widget.

## Research and test requirements

Primary docs reviewed: https://react.dev/reference/react/useSyncExternalStore (SSR snapshot consistency; implementation uses local React context/state instead), https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage , https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event , https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share , https://nextjs.org/docs/app/api-reference/functions/use-link-status , https://nextjs.org/docs/app/api-reference/components/link .

Tests cover bounded storage, stage+race dedup, missing/cancelled semantics, export refusal, fresh-visitor/no-write behavior, blocked storage, tabs, explicit clear, actual file download, active navigation and share fallback. Existing build/HTTP/browser/source/replay suites remain required. Test existence is not a claim of passed execution; exact SHA, runs and inspected artifacts go into PR after verification.

Prior limitations remain: official calendar completeness and MSK clocks not solved here,53FLGRproposals pending,review-schema not installed,real production backup restore not verified,photos await rights review,legacy privileged writers and media uploads paused. Legal operator/provider readiness not certified by this local-only feature.
