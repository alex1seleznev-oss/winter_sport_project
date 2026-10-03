# Reading library and article tools

Based on MAIN359092a8328ccc2851855a30a94d12af1c45d665. This is a reader-experience release, not an article/data/source publisher. Existing14verifiedarticle bodies, source manifests, databases, sports schedules, review restrictions and storage-upload gates are untouched.

## Reader flow
Save from a published article card or its page; open /reading-list via magazine toolbar, article tools, footer or MySeason. Manually mark a saved version read or unread; filter status and sport. A changed body hash displays NewVersion instead of calling the replacement read. Reading or scrolling does not create history or infer completion. A missing/withdrawn article remains an opaque saved reference, without displaying title or link from local data. Only getEditorial's independently validated published projection can supply reader-card metadata. No full article bodies are passed to the saved page's client list, cached for offline use, or sent back to a server.

The current article also offers larger body text (page-local, no preference write), native share with clean same-originarticleURL, clipboard fallback/manual URL and browser print. Cancellation of sharing is not reported as success. Print CSS is restricted to an opened editorial article; navigation, controls and related cards hidden, source links retained. This does not claim PDFgeneration or physicalprinter validation.

## Local data boundary
Separate key wsh.reading-list.v1 contains version1/items with only slug/bodyhash/readboolean/savedAt.100record/40000UTF16codeunit cap. No title, excerpt, fulltext, profile, trackingIDs or externalURLs. Validation rejects unexpected fields, invalid/future dates, duplicate IDs, malformed hashes and wrongschema. Corrupt bytes are preserved until a user explicitly confirms reset; no silent overwrite. Quota/security errors do not claim a persistent save. Reset removes only this key, not MySeason or unrelated data. No migrations, signup, remote APIwrites or new paid service.

Storage is origin/browser-specific, not cloud sync. Shared-device users can see the list; clearing browser data/incognito can lose it. This is not encrypted private storage. Explicit actions only. Cross-tab events refresh readers; mutations reread latest before writing. Sequential changes preserve prior saves; simultaneous writes across independently scheduled tabs can still conflict because localStorage is not transactional. We do not claim atomic multi-device or simultaneous-tab merges.

External-store subscribe/getServerSnapshot keeps hydration deterministic and avoids a new root client provider. No browser APIs on server render. Safe HTML/Markdown/source verification remains upstream. /reading-list is noindex and intentionally absent from sitemap; personal bookmark state never goes in URL.

## Checks required before release
Unit cases: strict schema, idempotence,100limit, exactversion acknowledgement, nonmutation, malformed/hostilecontent, missingrecord handling, no side effects inprojection. Browser cases: reloading, manualreadfilters,newversionfixture,unknownreference,corruptstore/confirmedreset,quota/securitydenial,realcross-tab event,cap,sharecancel/fallback,fontsize/printCSS,noJS andnomutationrequests. Fault injection uses isolatedbrowser state only, never productionDB. Existing134browser scenarios andall3CSVexports must keep passing; final numbers and actual screenshots go inPR after execution.

Reference docs consulted2026-10-03:
- https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
- https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event
- https://nextjs.org/docs/app/getting-started/server-and-client-components
- https://www.w3.org/WAI/ARIA/apg/patterns/button/
- https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA22
