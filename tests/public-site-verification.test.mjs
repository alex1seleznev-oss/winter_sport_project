import {test} from 'node:test';import assert from 'node:assert/strict';import {inspectPage} from '../scripts/verify-public-site.mjs';
const html='<title>Sports</title><link rel="canonical" href="https://example.org/calendar"><meta name="robots" content="index, follow"><h1>Calendar</h1><img alt="Athlete" src="/real.webp">';
test('launch check accepts an indexable page with its exact canonical',()=>assert.deepEqual(inspectPage(html,'https://example.org/calendar').errors,[]));
test('launch check catches wrong domain, noindex and missing image descriptions',()=>{
 const errors=inspectPage(html.replace('https://example.org/calendar','https://old.example.org/calendar').replace('index, follow','noindex, follow').replace('alt="Athlete"',''),'https://example.org/calendar').errors;
 assert.deepEqual(errors,['CANONICAL_MISMATCH','SITEMAP_PAGE_NOINDEX','IMAGE_ALT_MISSING']);
});
