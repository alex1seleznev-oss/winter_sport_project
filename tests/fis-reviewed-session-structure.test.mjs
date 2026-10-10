import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectedFisSessionRows,validateFisSessionReviews} from '../scripts/lib/fis-reviewed-session-structure.mjs';

const baseline=JSON.parse(readFileSync(new URL('../data/fis-event-sessions-2627.json',import.meta.url),'utf8'));
const reviews=JSON.parse(readFileSync(new URL('../data/fis-event-session-reviews-2627.json',import.meta.url),'utf8'));
const davos=baseline.stages.find(stage=>stage.eventId==='63004');

test('Davos reviewed override is bound to exact official source and stable identities',()=>{
  validateFisSessionReviews(reviews,baseline.stages);
  const review=reviews.events['63004'];
  assert.equal(review.competitionKey,'fis-wc-2627-davos');
  assert.equal(review.sourceUrl,davos.sourceUrl);
  assert.equal(review.rows.length,10);
  assert.equal(new Set(review.rows.map(row=>row.codex)).size,10);
  assert.equal(new Set(review.rows.map(row=>row.raceId)).size,10);
  assert.deepEqual([...review.rows.map(row=>row.codex)].sort(),[...davos.rows.map(row=>row.codex)].sort());
  assert.deepEqual([...review.rows.map(row=>row.raceId)].sort(),[...davos.rows.map(row=>row.raceId)].sort());
});

test('Davos review records the official 11/12/13 December programme change',()=>{
  const {rows,review}=expectedFisSessionRows(davos,validateFisSessionReviews(reviews,baseline.stages));
  assert.ok(review);
  assert.deepEqual([...new Set(rows.filter(row=>row.event.includes('Team Sprint')).map(row=>row.date))],['2026-12-11']);
  assert.deepEqual([...new Set(rows.filter(row=>row.event.includes('Sprint')&&!row.event.includes('Team Sprint')).map(row=>row.date))],['2026-12-12']);
  assert.deepEqual([...new Set(rows.filter(row=>row.event.includes('5km Heat')).map(row=>row.date))],['2026-12-13']);
});

test('unreviewed identity or source changes still fail closed',()=>{
  const badSource=structuredClone(reviews);
  badSource.events['63004'].sourceUrl='https://example.com/fake';
  assert.throws(()=>validateFisSessionReviews(badSource,baseline.stages),/FIS_REVIEW_SOURCE_MISMATCH/);

  const badIdentity=structuredClone(reviews);
  badIdentity.events['63004'].rows[0].raceId='999999';
  assert.throws(()=>validateFisSessionReviews(badIdentity,baseline.stages),/FIS_REVIEW_IDENTITY_CHANGE_REQUIRES_BASELINE_REVIEW/);
});
