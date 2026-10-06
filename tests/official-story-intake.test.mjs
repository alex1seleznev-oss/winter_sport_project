import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildIbuKontiolahtiCandidate,extractIbuKontiolahtiEvidence,IBU_KONTIOLAHTI_SOURCE_URL} from '../scripts/agents/official-story-candidate.mjs';

const html=(event='26—29 Nov 2026 Kontiolahti')=>`<!doctype html><html><body><div>Season 2026/2027</div><a href="/calendar?CupLevel=all&EventId=BT2627SWRLCP00&SeasonId=2627">26—29 Nov 2026 Idre Fjaell</a><a href="/calendar?CupLevel=all&EventId=BT2627SWRLCP01&SeasonId=2627">${event}</a><a href="/calendar?CupLevel=all&EventId=BT2627SWRLCP02&SeasonId=2627">04—06 Dec 2026 Hochfilzen</a></body></html>`;

test('extracts only the target IBU event and season',()=>{
  assert.equal(extractIbuKontiolahtiEvidence(html()),'Season 2026/2027. 26—29 Nov 2026 Kontiolahti.');
});

test('candidate is deterministic and contains no publication capability',()=>{
  const a=buildIbuKontiolahtiCandidate({html:html(),observedAt:'2026-10-06T04:20:00Z'});
  const b=buildIbuKontiolahtiCandidate({html:html(),observedAt:'2026-10-06T04:21:00Z'});
  assert.equal(a.storyKey,b.storyKey);
  assert.equal(a.revision,b.revision);
  assert.equal(a.sourceKey,'ibu');
  assert.equal(a.sourceUrl,IBU_KONTIOLAHTI_SOURCE_URL);
  assert.equal(a.namedPersonMedia,false);
  assert.ok(!('publicationAllowed' in a));
  assert.ok(!('calendarMutationAllowed' in a));
  assert.ok(!('sourceFeedId' in a));
});

test('a schedule change creates a new revision',()=>{
  const a=buildIbuKontiolahtiCandidate({html:html(),observedAt:'2026-10-06T04:20:00Z'});
  const b=buildIbuKontiolahtiCandidate({html:html('27—30 Nov 2026 Kontiolahti'),observedAt:'2026-10-06T04:20:00Z'});
  assert.notEqual(a.storyKey,b.storyKey);
  assert.notEqual(a.revision,b.revision);
});

test('missing, wrong-season, ambiguous and bad-date inputs fail closed',()=>{
  assert.throws(()=>extractIbuKontiolahtiEvidence('<html><body>Season 2026/2027</body></html>'),/IBU_EVENT_NOT_FOUND/);
  assert.throws(()=>extractIbuKontiolahtiEvidence(html().replace('Season 2026/2027','Season 2025/2026')),/IBU_SEASON_NOT_FOUND/);
  const ambiguous=html().replace('</body>','<a href="/calendar?EventId=BT2627SWRLCP01&SeasonId=2627">27—30 Nov 2026 Kontiolahti</a></body>');
  assert.throws(()=>extractIbuKontiolahtiEvidence(ambiguous),/IBU_EVENT_AMBIGUOUS/);
  assert.throws(()=>extractIbuKontiolahtiEvidence(html('Kontiolahti 2026')),/IBU_EVENT_DATE_CONTRACT_FAILED/);
});

test('source URL contract is exact enough to prevent source substitution',()=>{
  assert.throws(()=>buildIbuKontiolahtiCandidate({html:html(),observedAt:'2026-10-06T04:20:00Z',sourceUrl:'https://example.com/calendar?EventId=BT2627SWRLCP01&SeasonId=2627'}),/IBU_SOURCE_URL_CONTRACT_FAILED/);
  assert.throws(()=>buildIbuKontiolahtiCandidate({html:html(),observedAt:'2026-10-06T04:20:00Z',sourceUrl:'https://www.biathlonworld.com/calendar?EventId=OTHER&SeasonId=2627'}),/IBU_SOURCE_URL_CONTRACT_FAILED/);
});
