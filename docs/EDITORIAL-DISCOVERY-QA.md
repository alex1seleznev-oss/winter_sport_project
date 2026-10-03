# Discovery QA follow-through

Initial candidate6c7cedbe2ddb6dc29750f0860208156d0da45fd5 passed build, puretests,15HTTPchecks and131of132browser scenarios. One mobileWebKit scenario surfaced an access-control pageerror for an in-flight same-search RSC request while moving to the next query. The result itself was correctly rendered; error assertions remain required and are not suppressed.

The new toolbar's intra-document #editorial-data-tools jump unnecessarily used Next Link, enabling routing/prefetch machinery for a location already in this document. Replaced only this jump with native <a href="#editorial-data-tools">. All inter-page links retain ordinary behavior. A separate Chromium/WebKit test now observes same-query RSC requests while hovering/clicking the anchor and waits for network quiescence, verifies scrolling, and requires zero errors. Original failing test remains unchanged.

This removes an unnecessary request source, rather than weakening CSP, treating HTTP errors as success, adding retry flakes or muting WebKit errors. The exact browser/platform result for the fixed head must be inspected before merge. See Next official Link reference: https://nextjs.org/docs/app/api-reference/components/link .
