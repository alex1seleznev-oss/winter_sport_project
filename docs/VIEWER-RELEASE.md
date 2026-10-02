# Viewer release — 02.10.2026

Scope: user-facing features without activating blocked data writers. GitHub winter_sport_project only; public read client for Supabase wmiypacyraepljalppub. No DDL, no users, no new storage, no paid services.

## Features

Six original Russian-language guides in content/guides.json, separate from database articles. Each has a stable slug, fixed publication/review dates, visible sources and related guides. /guides and six detail pages are linked from navigation, media, race detail and sitemap. Content is plain structured text rendered by React, no arbitrary HTML/MDX execution. Historical rule-file edition is explicitly named; do not treat a catalog label as proof of the downloaded file edition. No copyrighted federation photos, logos or broadcast videos copied.

Calendar adds gender, status and bounded textual search. Presentation translations preserve the original label and never update federation data in Supabase. Search matches literal tokens, not SQL expressions. Filter pages canonicalize to the main calendar and are noindex. Coverage numbers describe the current DB selection, not verified completeness of a federation's season. Legacy /race-center list redirects to /calendar; individual IDs remain stable.

/api/calendar.ics publishes only existing source-linked, checked records. Supported parameters: sport, scope, gender, competition; event as a standalone parameter. Date/format/state are not inferred from the subscription URL. Feed contains a complete bounded selection (up to1000); over-limit/incomplete/error responses fail503, not a successful truncated feed. Unpublished individual IDs return404. Unknown/duplicate parameters return400. StableUID, CRLF, UTF8-byte folding, escaped text, explicit UTC for known MSK times, date-only markers for unknown times, cancellation status and deterministic ETag. No alarm, attendee, organizer invitation, fabricated duration or private credentials. A file download is a snapshot, not a promise of push notifications.

Native Apple/Google/Outlook subscription refresh and cancellation behavior are external-client responsibilities. Our automated tests validate server output and browser UI only; successful tests do not certify synchronization in each external account. The first version has no persistent monotonic SEQUENCE ledger, so any client requiring sequence-based update semantics needs independent interoperability testing. ETag and stableUID change correctly on content changes, but source publication timestamps are not invented.

## Safety boundaries unchanged

Prior blocked53-proposal publication and blocked wsh_review migration are not retried. Existing source-read failures remain unresolved; no TLS validation bypass. Email signup disabled is owner-confirmed, not verified by this release. Old privilegedEdgeFunctions and media uploads remain paused. Existing first FLGR programme controller remains scoped/read-only; six other new roles remain disabled.

## Sources checked for content/design

IBU Competition Formats and Rules Overview; FIS ICR supplied by catalog (actual file icr-crosscountry-2025_clean.pdf, not claimed2026 edition); FIS Abbreviations; RFC5545; Apple support102301. Technical behavior is covered by domain/API/browser regression tests. Test-file existence alone is not successful execution: see actual PR/Actions artifacts.
