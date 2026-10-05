import test from 'node:test';
import assert from 'node:assert/strict';
import {BoundedModelDispatcher,DispatchError,safeDispatchErrorCode} from '../lib/agents/dispatch-service.mjs';

const jobId='10000000-0000-4000-8000-000000000050';
const dependencyId='10000000-0000-4000-8000-000000000049';
const leaseToken='30000000-0000-4000-8000-000000000050';

function queuedJob(overrides={}){
 return {
  jobId,type:'research.story',createdAt:'2026-10-05T07:00:00Z',requestedBy:'test',agentId:'research',status:'queued',confidence:'unknown',reviewRequired:false,
  inputRefs:[],sourceRefs:['https://example.com/source'],dependencies:[dependencyId],outputs:[],auditTrail:[],attempt:0,maxAttempts:2,payload:{topic:'test'},
  availableAt:'2026-10-05T07:00:00Z',leaseOwner:null,leaseToken:null,leaseExpiresAt:null,heartbeatAt:null,startedAt:null,completedAt:null,updatedAt:'2026-10-05T07:00:00Z',...overrides
 };
}

class FakeStore{
 constructor(){this.calls=[];this.job=queuedJob()}
 async get(id){this.calls.push(['get',id]);return id===jobId?this.job:null}
 async start(id,{workerId,leaseSeconds}){this.calls.push(['start',id,workerId,leaseSeconds]);return queuedJob({status:'running',attempt:1,leaseOwner:workerId,leaseToken,leaseExpiresAt:'2099-01-01T00:00:00Z'})}
 async artifactsForJob(id){this.calls.push(['artifacts',id]);return [{type:'source-snapshot',ref:`artifact:${id}:source`,value:{sourceUrl:'https://example.com/source',capturedAt:'2026-10-05T07:00:00Z',content:'test'},metadata:{}}]}
 async succeed(id,outputs,options){this.calls.push(['succeed',id,outputs,options]);return queuedJob({status:'succeeded',attempt:1,outputs,completedAt:'2026-10-05T07:00:02Z'})}
 async review(id,outputs,options){this.calls.push(['review',id,outputs,options]);return queuedJob({status:'review_required',attempt:1,reviewRequired:true,outputs,completedAt:'2026-10-05T07:00:02Z'})}
 async fail(id,options){this.calls.push(['fail',id,options]);return queuedJob({status:options.reviewRequired?'review_required':'failed',attempt:1,reviewRequired:options.reviewRequired})}
 async requeue(id,{availableAt}){this.calls.push(['requeue',id,availableAt]);return queuedJob({status:'queued',attempt:1,availableAt})}
}

function modelResult({reviewRequired=false}={}){
 return {
  runId:'20000000-0000-4000-8000-000000000050',
  reviewRequired,
  artifacts:[{type:'evidence-packet',ref:'artifact:dispatch:evidence',value:{packetId:'dispatch-packet'},metadata:{}}],
  trace:{modelProfile:'balanced',model:'test-model',responseId:'resp-test',startedAt:'2026-10-05T07:00:01Z',completedAt:'2026-10-05T07:00:02Z',inputTokensEstimated:10,outputTokensEstimated:5,usage:{inputTokens:9,outputTokens:4},outputTypes:['evidence-packet']}
 };
}

test('dispatcher claims one job, loads dependency artifacts and persists successful output',async()=>{
 const store=new FakeStore();
 const modelAdapter={execute:async({job,inputs})=>{assert.equal(job.status,'running');assert.equal(inputs.length,1);return modelResult()}};
 const dispatcher=new BoundedModelDispatcher({store,modelAdapter});
 const result=await dispatcher.executeOne({jobId,workerId:'test-worker',leaseSeconds:120});
 assert.equal(result.status,'succeeded');
 assert.equal(result.reviewRequired,false);
 assert.deepEqual(result.artifactRefs,['artifact:dispatch:evidence']);
 assert.equal(store.calls.some(call=>call[0]==='artifacts'&&call[1]===dependencyId),true);
 const success=store.calls.find(call=>call[0]==='succeed');
 assert.equal(success[3].leaseToken,leaseToken);
 assert.equal(success[3].run.runId,'20000000-0000-4000-8000-000000000050');
});

test('dispatcher persists model outputs when human review is required',async()=>{
 const store=new FakeStore();
 const dispatcher=new BoundedModelDispatcher({store,modelAdapter:{execute:async()=>modelResult({reviewRequired:true})}});
 const result=await dispatcher.executeOne({jobId,workerId:'test-worker',leaseSeconds:120});
 assert.equal(result.status,'review_required');
 assert.equal(result.reviewRequired,true);
 assert.equal(store.calls.some(call=>call[0]==='review'),true);
 assert.equal(store.calls.some(call=>call[0]==='succeed'),false);
});

test('retryable model failures fail the active lease then requeue with bounded public error',async()=>{
 const store=new FakeStore();
 const providerError=Object.assign(new Error('MODEL_HTTP_429'),{code:'MODEL_HTTP_429',retryable:true});
 const dispatcher=new BoundedModelDispatcher({store,modelAdapter:{execute:async()=>{throw providerError}}});
 await assert.rejects(
  dispatcher.executeOne({jobId,workerId:'test-worker',leaseSeconds:120}),
  error=>error instanceof DispatchError&&error.status===503&&error.retryable===true&&error.code==='MODEL_HTTP_429'&&error.jobStatus==='queued'
 );
 const failed=store.calls.find(call=>call[0]==='fail');
 assert.equal(failed[2].reviewRequired,false);
 assert.equal(store.calls.some(call=>call[0]==='requeue'),true);
});

test('non-model workers are never dispatched through the model endpoint',async()=>{
 const store=new FakeStore();store.job=queuedJob({agentId:'publisher',type:'publish.article',dependencies:[]});
 const dispatcher=new BoundedModelDispatcher({store,modelAdapter:{execute:async()=>modelResult()}});
 await assert.rejects(dispatcher.executeOne({jobId,workerId:'test-worker',leaseSeconds:120}),error=>error instanceof DispatchError&&error.code==='WORKER_DISABLED'&&error.status===409);
 assert.equal(store.calls.some(call=>call[0]==='start'),false);
});

test('public error codes are normalized and never expose database detail',()=>{
 assert.equal(safeDispatchErrorCode({message:'AGENT_DB_GET_JOB:42501:secret detail'}),'AGENT_DB_GET_JOB');
 assert.equal(safeDispatchErrorCode({message:'lowercase free form detail'}),'DISPATCH_FAILED');
});
