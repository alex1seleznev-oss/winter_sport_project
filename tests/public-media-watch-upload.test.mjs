import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hash,delta} from '../scripts/media-watch/model.mjs';
import {intakeBatches} from '../scripts/media-watch/intake-batches.mjs';

function packet(count=1){
 const receipt={sha256:'a'.repeat(64),fetchedAt:'2026-10-13T10:00:00Z',httpStatus:200};
 const evidence='Synthetic review-only sports source evidence';
 const items=Array.from({length:count},(_,n)=>({sourceKey:'sample',sourceUrl:'https://example.org/',url:`https://example.org/story/${n}`,title:'TEST',verificationStatus:'unverified',calendarMutationAllowed:false,contentHash:hash(evidence),evidence,evidenceHash:hash(evidence),evidenceTruncated:false,mediaOnly:false,revision:hash(String(n)),receipt}));
 const p={schemaVersion:2,parserVersion:'v1',configHash:'cfg',calendarWrites:0,databaseWrites:0,publishedFacts:0,items,sources:[{key:'sample',status:'parsed',receipt}]};
 p.packetHash=hash({items:p.items,sources:p.sources});p.delta=delta(null,p);return p;
}
test('cold-start collector delta resolves every exact observation',()=>{const p=packet(138);assert.deepEqual(intakeBatches(p).map(b=>b.length),[100,38]);assert.deepEqual(intakeBatches(p).flat(),p.items)});
test('warm baseline selects new and changed current revisions, never receipts only',()=>{
 const old=packet(2),next=packet(3);next.items[0]={...next.items[0],revision:hash('changed')};next.packetHash=hash({items:next.items,sources:next.sources});next.delta=delta(old,next);
 assert.deepEqual(intakeBatches(next).flat().map(i=>i.url),[next.items[2].url,next.items[0].url]);
 old.delta=delta(old,old);assert.deepEqual(intakeBatches(old),[]);
});
test('missing revisions, old string contracts, duplicates and tampered packets fail closed',()=>{
 const p=packet();p.delta.newReferences[0].revision=hash('missing');assert.throws(()=>intakeBatches(p),/MISMATCH/);
 const q=packet();q.delta.newReferences=['sample|https://example.org/story/0'];assert.throws(()=>intakeBatches(q),/INVALID/);
 const r=packet();r.delta.changedReferences=r.delta.newReferences;assert.throws(()=>intakeBatches(r),/DUPLICATE/);
 const t=packet();t.items[0].evidence='tampered';assert.throws(()=>intakeBatches(t),/HASH/);
});
test('full bounded intake preserves all 500 records and each request remains at most 100',()=>{const batches=intakeBatches(packet(500));assert.equal(batches.flat().length,500);assert.ok(batches.every(b=>b.length<=100))});
test('legacy successful no-delta reports cannot hide observations never acknowledged by intake',()=>{
 const old=packet(138),next={...old,intakeContractVersion:1};next.delta=delta(old,next);
 assert.equal(next.delta.baselineAvailable,false);assert.equal(intakeBatches(next).flat().length,138);
 assert.match(readFileSync(new URL('../scripts/media-watch/previous.py',import.meta.url),'utf8'),/packet\.get\('intakeContractVersion'\)!=1/);
});
test('failed uploads cannot become the trusted baseline',()=>{assert.match(readFileSync(new URL('../scripts/media-watch/previous.py',import.meta.url),'utf8'),/run\.get\('conclusion'\)!='success'/)});
