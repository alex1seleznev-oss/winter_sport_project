import test from 'node:test';
import assert from 'node:assert/strict';
import {SupabaseAgentStore} from '../lib/agents/store-supabase.mjs';
import {createJob} from '../lib/agents/contracts.mjs';
import {loadAgentRegistry} from '../lib/agents/registry.mjs';
import {routeJob} from '../lib/agents/router.mjs';

function dbRow(job,overrides={}){return {id:job.jobId,job_type:job.type,agent_id:job.agentId,status:job.status,requested_by:job.requestedBy,confidence:job.confidence,review_required:job.reviewRequired,attempt:job.attempt,max_attempts:job.maxAttempts,input_refs:job.inputRefs,source_refs:job.sourceRefs,dependencies:job.dependencies,outputs:job.outputs,payload:job.payload,available_at:job.createdAt,lease_owner:null,lease_token:null,lease_expires_at:null,heartbeat_at:null,created_at:job.createdAt,started_at:null,completed_at:null,updated_at:job.createdAt,...overrides}}
class Query{
 constructor(client,table){this.client=client;this.table=table;this.filters={};this.single=false}
 select(){return this} eq(k,v){this.filters[k]=v;return this} order(){return this} maybeSingle(){this.single=true;return this}
 then(resolve,reject){try{const rows=(this.client.tables[this.table]??[]).filter(row=>Object.entries(this.filters).every(([k,v])=>row[k]===v));resolve({data:this.single?(rows[0]??null):rows,error:null})}catch(e){reject(e)}}
}
class FakeClient{
 constructor(){this.calls=[];this.tables={agent_jobs:[],agent_audit_events:[],agent_approvals:[],agent_artifacts:[]};this.rpcResults=new Map()}
 from(table){return new Query(this,table)}
 async rpc(name,args){this.calls.push({name,args});const value=this.rpcResults.get(name);return {data:typeof value==='function'?value(args):value,error:null}}
}

const registry=loadAgentRegistry();
function researchJob(){return routeJob(createJob({type:'research.story',agentId:'orchestrator',inputRefs:['event:test'],sourceRefs:['https://example.com/source']}),registry)}

test('Supabase store enqueues with a stable idempotency key and reconstructs durable jobs',async()=>{const client=new FakeClient(),job=researchJob();client.tables.agent_jobs=[dbRow(job)];client.rpcResults.set('agent_enqueue_job',job.jobId);const store=new SupabaseAgentStore({client,registry});const saved=await store.add(job);assert.equal(saved.jobId,job.jobId);assert.equal(saved.agentId,'research');assert.deepEqual(client.calls[0],{name:'agent_enqueue_job',args:{p_job:job,p_idempotency_key:`job:${job.jobId}`}})});

test('claim, heartbeat and completion keep lease ownership explicit',async()=>{const client=new FakeClient(),job=researchJob(),token='11111111-1111-4111-8111-111111111111';const running=dbRow(job,{status:'running',attempt:1,lease_owner:'worker-a',lease_token:token,lease_expires_at:'2099-01-01T00:00:00Z'});client.rpcResults.set('agent_claim_job',[running]);client.rpcResults.set('agent_heartbeat_job',[running]);client.rpcResults.set('agent_complete_job',[dbRow(job,{status:'succeeded',attempt:1,outputs:['artifact:x'],completed_at:'2099-01-01T00:00:01Z'})]);const store=new SupabaseAgentStore({client,registry});const claimed=await store.start(job.jobId,{workerId:'worker-a'});assert.equal(claimed.leaseToken,token);await store.heartbeat(job.jobId,{workerId:'worker-a',leaseToken:token});const done=await store.succeed(job.jobId,['artifact:x'],{workerId:'worker-a',leaseToken:token,artifacts:[{type:'evidence-packet',ref:'artifact:x',value:{}}]});assert.equal(done.status,'succeeded');assert.equal(client.calls.at(-1).args.p_lease_token,token)});

test('approval reads honor the latest decision per gate',async()=>{const client=new FakeClient(),job=researchJob();client.tables.agent_approvals=[{job_id:job.jobId,gate:'qa-passed',decision:'revoked',decided_at:'2026-10-04T10:02:00Z',id:3},{job_id:job.jobId,gate:'qa-passed',decision:'approved',decided_at:'2026-10-04T10:01:00Z',id:2},{job_id:job.jobId,gate:'fact-check-passed',decision:'approved',decided_at:'2026-10-04T10:00:00Z',id:1}];const store=new SupabaseAgentStore({client,registry});assert.deepEqual(await store.approvalsFor(job.jobId),['fact-check-passed'])});

test('artifact payloads are reconstructed for downstream handoffs',async()=>{const client=new FakeClient(),job=researchJob();client.tables.agent_artifacts=[{job_id:job.jobId,artifact_type:'evidence-packet',artifact_ref:'artifact:1',payload:{packetId:'p1'},metadata:{verified:true},created_at:'2026-10-04T10:00:00Z'}];const store=new SupabaseAgentStore({client,registry});assert.deepEqual(await store.artifactsForJob(job.jobId),[{type:'evidence-packet',ref:'artifact:1',value:{packetId:'p1'},metadata:{verified:true}}])});

test('scheduler candidates are requested through the bounded RPC and normalized to job ids',async()=>{
 const client=new FakeClient();
 const ids=['10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002'];
 client.rpcResults.set('agent_dispatch_candidates',ids.map(job_id=>({job_id})));
 const store=new SupabaseAgentStore({client,registry});
 const result=await store.dispatchCandidates({agentIds:['research','fact-check'],limit:2});
 assert.deepEqual(result,ids);
 assert.deepEqual(client.calls.at(-1),{name:'agent_dispatch_candidates',args:{p_agent_ids:['research','fact-check'],p_limit:2}});
});

test('scheduler candidate lookup rejects empty agent sets and oversized batches locally',async()=>{
 const store=new SupabaseAgentStore({client:new FakeClient(),registry});
 await assert.rejects(()=>store.dispatchCandidates({agentIds:[],limit:1}),/AGENT_DISPATCH_AGENT_IDS_INVALID/);
 await assert.rejects(()=>store.dispatchCandidates({agentIds:['research'],limit:21}),/AGENT_DISPATCH_LIMIT_INVALID/);
});
