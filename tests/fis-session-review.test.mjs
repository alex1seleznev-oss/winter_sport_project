import {test} from 'node:test';import assert from 'node:assert/strict';
import {buildFisSessionPlan} from '../scripts/lib/reconcile-fis-sessions.mjs';
const parent={id:12,external_key:'fis-wc-2627-ruka',sport:'cross_country',scope:'international',series:'World Cup',location:'Ruka',country:'FIN'};
const sourceUrl='https://www.fis-ski.com/DB/general/event-details.html?eventid=63002&seasoncode=2027&sectorcode=CC';
const final={id:6,competition_id:12,external_key:'stable-old-key',event_date:'2026-11-28',gender:'men',discipline:'Sprint C',distance:null,status:'scheduled',stage:'Ruka',notes:'Original note',start_time_msk:null};
const rows=[{date:'2026-11-28',gender:'men',event:'1.2km Sprint Qualification Classic',codex:'0003',raceId:'52087',localTime:null,cancelled:false},{date:'2026-11-28',gender:'men',event:'1.2km Sprint Final Classic',codex:'0004',raceId:'52088',localTime:null,cancelled:false}];
const stage={competitionKey:parent.external_key,sourceUrl,rows,provenance:{sourceUrl,fetchedAt:'2026-10-03T19:40:00Z',documentSha256:'a'.repeat(64),httpStatus:200,tlsVerified:true}};
const plan=(stages=[stage],events=[final],competitions=[parent])=>buildFisSessionPlan({stages,events,competitions});
test('qualification insertion and final correction preserve final ID/key and original notes',()=>{
 const p=plan();assert.equal(p.insertions,1);assert.equal(p.updates,1);
 const added=p.proposals.find(p=>p.operation==='insert'),updated=p.proposals.find(p=>p.operation==='update');
 assert.equal(added.value.external_key,'fis-2027-cc-codex-0003');assert.equal(added.value.start_time_msk,null);assert.equal(added.value.source_updated_at,null);
 assert.equal(updated.previous.id,6);assert.equal(updated.value.external_key,'stable-old-key');assert.match(updated.value.notes,/Original note/);assert.equal(updated.value.discipline,'Sprint Final Classic');
});
test('rebuilding a reviewed plan after application produces no duplicated or repeated mutations',()=>{
 const first=plan();const applied=first.proposals.map((p,index)=>({...p.previous,...p.value,id:p.previous?.id||200+index}));
 const second=plan([stage],applied);assert.equal(second.insertions,0);assert.equal(second.updates,0);
});
test('duplicate current slot, source identity or ambiguous parent aborts the entire plan',()=>{
 assert.throws(()=>plan([stage],[final,{...final,id:7}]),/DATABASE_DUPLICATE/);
 assert.throws(()=>plan([{...stage,rows:[...rows,rows[0]]}]),/SOURCE_DUPLICATE/);
 assert.throws(()=>plan([stage],[final],[parent,parent]),/PARENT_AMBIGUOUS/);
});
test('missing final, extra current entry, cancelled row or newly published clock needs separate review',()=>{
 assert.throws(()=>plan([stage],[]),/FINAL_MISSING/);
 assert.throws(()=>plan([stage],[final,{...final,id:7,event_date:'2026-11-29'}]),/UNEXPECTED_DATABASE/);
 for(const override of [{cancelled:true},{localTime:'12:30'}])assert.throws(()=>plan([{...stage,rows:[{...rows[0],...override},rows[1]]}]),/SEPARATE_STATUS_OR_TIME/);
});
test('uncaptured evidence and a different sport/scope cannot authorize a calendar plan',()=>{
 assert.throws(()=>plan([{...stage,provenance:{}}]),/EVIDENCE_REQUIRED/);
 assert.throws(()=>plan([stage],[final],[{...parent,sport:'biathlon'}]),/PARENT_SCOPE/);
});
