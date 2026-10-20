import test from 'node:test';import assert from 'node:assert/strict';
import {readOperationsSnapshot} from '../lib/agents/operations.mjs';
function fake({fail=false,ready=0,count=0}={}){
 const reads=[];return {reads,client:{
  from(table){const q={select(columns,opts){reads.push({table,columns,opts});return q},in(){return Promise.resolve(fail?{error:{message:'private-error'}}:{count})},not(){return q},order(){return q},limit(){return Promise.resolve({data:[{completed_at:'2026-10-10T06:50:00Z'}]})}};return q},
  rpc(name,args){reads.push({name,args});return Promise.resolve({data:Array.from({length:ready},(_,i)=>({job_id:'private-job-'+i}))})}
 }};
}
test('operations separate review backlogs from ready work and never expose job IDs',async()=>{
 const {client,reads}=fake({count:12,ready:0});const snapshot=await readOperationsSnapshot(client,{now:new Date('2026-10-20T17:00:00Z')});
 assert.equal(snapshot.available,true);assert.equal(snapshot.readyCandidates,0);assert.equal(snapshot.counts.review,12);
 assert.equal(snapshot.state,'attention');assert.equal(JSON.stringify(snapshot).includes('private-job'),false);
 assert.ok(reads.filter(x=>x.opts).every(x=>x.columns==='id'&&x.opts.head===true&&x.opts.count==='exact'));
 assert.equal(reads.find(x=>x.name).args.p_agent_ids.includes('publisher'),false);
});
test('telemetry failure is unknown rather than a successful empty queue',async()=>{
 const {client}=fake({fail:true});const result=await readOperationsSnapshot(client);
 assert.equal(result.available,false);assert.equal(result.counts,null);assert.equal(result.state,'unknown');
 assert.equal(JSON.stringify(result).includes('private-error'),false);
});
test('bounded candidate count is marked as capped and an idle result is explicit',async()=>{
 const {client}=fake({ready:20});const capped=await readOperationsSnapshot(client);assert.equal(capped.readyCapped,true);assert.equal(capped.state,'ready');
 assert.equal((await readOperationsSnapshot(fake().client)).state,'idle');
});
