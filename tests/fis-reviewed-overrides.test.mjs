import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyReviewedFisOverrides} from '../scripts/lib/apply-fis-session-overrides.mjs';

const stage={eventId:'63004',rows:[
  {date:'2026-12-11',codex:'0015',raceId:'52101'},
  {date:'2026-12-13',codex:'0021',raceId:'52107'}
]};
const reviewedAt='2026-10-10T06:20:51.793Z';
const evidenceRun='https://github.com/alex1seleznev-oss/winter_sport_project/actions/runs/38030582148';
const review=(changes)=>({reviews:[{eventId:'63004',reviewedAt,evidenceRun,reason:'official reviewed delta',changes}]});

test('reviewed session deltas change only exact codex and race identities',()=>{
  const result=applyReviewedFisOverrides(stage,review([
    {codex:'0015',raceId:'52101',fromDate:'2026-12-11',toDate:'2026-12-13'},
    {codex:'0021',raceId:'52107',fromDate:'2026-12-13',toDate:'2026-12-11'}
  ]));
  assert.equal(result.rows[0].date,'2026-12-13');
  assert.equal(result.rows[1].date,'2026-12-11');
  assert.equal(result.reviewOverride.changeCount,2);
  assert.equal(stage.rows[0].date,'2026-12-11');
});

test('review override rejects stale prior state, wrong identity and duplicates',()=>{
  assert.throws(()=>applyReviewedFisOverrides(stage,review([{codex:'0015',raceId:'52101',fromDate:'2026-12-10',toDate:'2026-12-13'}])),/PRIOR_STATE_MISMATCH/);
  assert.throws(()=>applyReviewedFisOverrides(stage,review([{codex:'0015',raceId:'99999',fromDate:'2026-12-11',toDate:'2026-12-13'}])),/IDENTITY_MISMATCH/);
  const duplicate={codex:'0015',raceId:'52101',fromDate:'2026-12-11',toDate:'2026-12-13'};
  assert.throws(()=>applyReviewedFisOverrides(stage,review([duplicate,duplicate])),/DUPLICATE/);
});

test('unreviewed stages pass through unchanged',()=>{
  assert.equal(applyReviewedFisOverrides(stage,{reviews:[]}),stage);
});
