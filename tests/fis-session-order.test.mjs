import {test} from 'node:test';import assert from 'node:assert/strict';
import {filterViewerRaces,compareProgrammeRaces} from '../lib/viewer.mjs';
import {catalogueModels,groupProgramme} from '../lib/stage-catalog.mjs';
const final={id:6,competition_id:12,event_date:'2026-11-28',start_time_msk:null,sport:'cross_country',scope:'international',gender:'men',discipline:'Sprint Final Classic',status:'scheduled',source_url:'https://www.fis-ski.com/DB/general/event-details.html?eventid=63002&seasoncode=2027&sectorcode=CC',verified_at:'2026-10-03T19:40:00Z',series:'FIS World Cup',location:'Ruka'};
const qualification={...final,id:200,discipline:'Sprint Qualification Classic'};
test('a later inserted qualification appears before the preserved final in calendar and stage programme',()=>{
 const original=[final,qualification];
 assert.deepEqual(filterViewerRaces(original,{q:''}).map(r=>r.id),[200,6]);
 assert.deepEqual(original.map(r=>r.id),[6,200]);
 const stage={id:12,sport:'cross_country',scope:'international',start_date:'2026-11-27',end_date:'2026-11-29'};
 assert.deepEqual(catalogueModels([stage],original)[0].races.map(r=>r.id),[200,6]);
 assert.deepEqual(groupProgramme(original)[0].races.map(r=>r.id),[200,6]);
 assert.equal(qualification.start_time_msk,null);assert.equal(final.start_time_msk,null);
});
test('published dates and clocks override phase order; deterministic stage grouping avoids comparator cycles',()=>{
 const timedFinal={...final,start_time_msk:'12:00:00'},timedQualification={...qualification,start_time_msk:'13:00:00'};
 assert.deepEqual([timedQualification,timedFinal].sort(compareProgrammeRaces).map(r=>r.id),[6,200]);
 const otherStage={...final,id:7,competition_id:13};
 const expected=[200,6,7];
 for(const input of [[final,otherStage,qualification],[qualification,final,otherStage],[otherStage,qualification,final]])assert.deepEqual([...input].sort(compareProgrammeRaces).map(r=>r.id),expected);
 const nextDay={...qualification,id:201,event_date:'2026-11-29'};
 assert.deepEqual([nextDay,final].sort(compareProgrammeRaces).map(r=>r.id),[6,201]);
});
