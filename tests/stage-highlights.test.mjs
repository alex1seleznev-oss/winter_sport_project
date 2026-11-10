import {test} from 'node:test';
import assert from 'node:assert/strict';
import {highlightForStage,verifiedStageHighlight,reviewedStageHighlights} from '../lib/stage-highlights.mjs';

test('previous-season videos are mapped to correct verified stages',()=>{
 assert.equal(reviewedStageHighlights.length,2);
 assert.equal(highlightForStage('ibu-wc-2627-kontiolahti','biathlon')?.youtubeId,'JOYjBiJP67M');
 assert.equal(highlightForStage('ibu-wc-2627-hochfilzen','biathlon')?.youtubeId,'KTYjAJBKC9A');
 assert.equal(highlightForStage('ibu-wc-2627-kontiolahti','cross_country'),null);
 assert.equal(highlightForStage('unverified-stage','biathlon'),null);
 assert.equal(new Set(reviewedStageHighlights.map(v=>v.competitionKey)).size,reviewedStageHighlights.length);
 assert.ok(reviewedStageHighlights.every(v=>verifiedStageHighlight(v)===v));
});
test('reject unverified hosts, fabricated IDs and wrong seasons',()=>{
 const valid=reviewedStageHighlights[0];
 for(const patch of [{sourceUrl:'https://other.example/video'},{youtubeId:'wrong'},{season:'2026/27'},{publisher:'Other channel'},{competitionKey:'../unsafe'},{eventYear:2027}])
  assert.equal(verifiedStageHighlight({...valid,...patch}),null);
});
