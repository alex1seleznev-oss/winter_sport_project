import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildIbuKontiolahtiCandidate,extractIbuKontiolahtiEvidence,IBU_KONTIOLAHTI_SOURCE_URL} from '../scripts/agents/official-story-candidate.mjs';

const events=(overrides={})=>[
  {EventId:'BT2627SWRLCP00',ShortDescription:'Idre Fjaell',StartDate:'2026-11-26T00:00:00Z',EndDate:'2026-11-29T00:00:00Z'},
  {EventId:'BT2627SWRLCP01',ShortDescription:'Kontiolahti',StartDate:'2026-11-26T00:00:00Z',EndDate:'2026-11-29T00:00:00Z',...overrides},
  {EventId:'BT2627SWRLCP02',ShortDescription:'Hochfilzen',StartDate:'2026-12-04T00:00:00Z',EndDate:'2026-12-06T00:00:00Z'}
];

test('extracts only the exact target IBU Datacenter event',()=>{
  assert.equal(extractIbuKontiolahtiEvidence(events()),'IBU Datacenter event BT2627SWRLCP01. Venue: Kontiolahti. Start: 2026-11-26. End: 2026-11-29.');
});

test('candidate is deterministic and contains no publication capability',()=>{
  const a=buildIbuKontiolahtiCandidate({events:events(),observedAt:'2026-10-06T04:20:00Z'});
  const b=buildIbuKontiolahtiCandidate({events:events(),observedAt:'2026-10-06T04:21:00Z'});
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
  const a=buildIbuKontiolahtiCandidate({events:events(),observedAt:'2026-10-06T04:20:00Z'});
  const b=buildIbuKontiolahtiCandidate({events:events({StartDate:'2026-11-27T00:00:00Z',EndDate:'2026-11-30T00:00:00Z'}),observedAt:'2026-10-06T04:20:00Z'});
  assert.notEqual(a.storyKey,b.storyKey);
  assert.notEqual(a.revision,b.revision);
});

test('missing, ambiguous, substituted venue and invalid dates fail closed',()=>{
  assert.throws(()=>extractIbuKontiolahtiEvidence(events().filter((e)=>e.EventId!=='BT2627SWRLCP01')),/IBU_EVENT_NOT_FOUND/);
  assert.throws(()=>extractIbuKontiolahtiEvidence([...events(),events()[1]]),/IBU_EVENT_AMBIGUOUS/);
  assert.throws(()=>extractIbuKontiolahtiEvidence(events({ShortDescription:'Oberhof'})),/IBU_EVENT_VENUE_CONTRACT_FAILED/);
  assert.throws(()=>extractIbuKontiolahtiEvidence(events({StartDate:'bad'})),/IBU_EVENT_START_DATE_INVALID/);
  assert.throws(()=>extractIbuKontiolahtiEvidence(events({StartDate:'2027-06-01T00:00:00Z',EndDate:'2027-06-02T00:00:00Z'})),/IBU_EVENT_SEASON_WINDOW_INVALID/);
});

test('source URL contract prevents host, season, level and endpoint substitution',()=>{
  assert.throws(()=>buildIbuKontiolahtiCandidate({events:events(),observedAt:'2026-10-06T04:20:00Z',sourceUrl:'https://example.com/modules/sportapi/api/Events?SeasonId=2627&Level=1'}),/IBU_API_URL_NOT_ALLOWED/);
  assert.throws(()=>buildIbuKontiolahtiCandidate({events:events(),observedAt:'2026-10-06T04:20:00Z',sourceUrl:'https://biathlonresults.com/modules/sportapi/api/Events?SeasonId=2526&Level=1'}),/IBU_API_SCOPE_DENIED/);
});

test('legacy .NET date values remain readable without weakening the event contract',()=>{
  const start=Date.parse('2026-11-26T00:00:00Z');
  const end=Date.parse('2026-11-29T00:00:00Z');
  assert.equal(extractIbuKontiolahtiEvidence(events({StartDate:`/Date(${start})/`,EndDate:`/Date(${end})/`})),'IBU Datacenter event BT2627SWRLCP01. Venue: Kontiolahti. Start: 2026-11-26. End: 2026-11-29.');
});
