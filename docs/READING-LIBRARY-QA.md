# Reader release QA follow-through

Initial candidate9aeb72c8497d22f007ac4d5b919676dd6f760d2e built and passed deterministic/HTTP/source checks. Browser artifact11278385678 from37134002268 contains153passed and3unexpected outcomes, zero retries/skips. ZIP SHAca1b01ae1e0c04878310825cb880c7342b65bc962f1c021e4a9f6a62d359aaf8 was checked before reading the report.

Two failures exposed that the no-JS saved page did not include the intended client-component noscript text in the observed rendered region. Fixed the real server-snapshot fallback: it now explicitly explains the JavaScript requirement and provides a normal article link, rather than indefinitely saying the list is loading. The original two no-JS tests remain unchanged.

One WebKit scenario recorded access-control errors for speculative RSC requests to the homepage and the saved article during navigation/reload. Disable speculative Link prefetch on article cards, local-library article links and site navigation while in editorial/library routes. This prevents unused article bodies from being downloaded when only saving or filtering; actual user-click navigation remains enabled. It does not weaken CSP, TLS, assertions or retry settings. A new Chromium/WebKit scenario observes the exact target requests during hover/save/list navigation, requires none, then follows an explicit click. Original failing scenario is retained. The exact internal cause of WebKit wording is not inferred from this symptom alone.

Desktop print-layout and mobile library screenshots of the first candidate were visually inspected; all print/size/storage/quota/denial/version/limit/cross-tab tests passed in that run. Final candidate screenshots/counts still require a fresh check. Print validation is browser CSS media emulation plus calling a stubbed print method, not a physical printer or generated PDF.

Direct Vercel connector inspection was attempted: deployment lookup returned404 and project deployment listing returned403(permission denied). No alternate protected-access route or share-token generation attempted. GitHub checks can report the Vercel integration status; do not describe that as a direct authenticated Vercel runtime audit.
