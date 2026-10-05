import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {BoundedAgentScheduler,modelRuntimeEnvMissing,loadSchedulerWorkers} from '../lib/agents/scheduler-service.mjs';
import {DispatchError} from '../lib/agents/dispatch-service.mjs';
import {loadAgentRegistry} from '../lib/agents/registry.mjs';
import {loadWorkers} from '../lib/agents/workers.mjs';

class FakeStore{
 constructor(candidates=[],recovered=0){this.candidates=candidates;this.recovered=recovered;this.calls=[]}
 async recoverExpired(){this.calls.push({op:'recover'});return this.recovered}
 async dispatchCandidates(args){this.calls.push({op:'candidates',args});return [...this.candidates]}
}

class FakeDispatcher{
 constructor(handler){this.handler=handler;this.calls=[]}
 async executeOne(args){this.calls.push(args);return this.handler(args,this.calls.length-1)}
}

function schedulerWith({candidates=[],recovered=0,handler=async({jobId})=>({ok:true,jobId,status:'succeeded'})}={}){
 const registry=loadAgentRegistry();const workers=loadWorkers({registry});const store=new FakeStore(candidates,recovered);const dispatcher=new FakeDispatcher(handler);
 const scheduler=new BoundedAgentScheduler({registry,workers,store,dispatcher});
 return {scheduler,store,dispatcher};
}

test('runtime readiness requires Supabase, OpenAI and model bindings',()=>{
 const registry=loadAgentRegistry();const workers=loadWorkers({registry});
 const missing=modelRuntimeEnvMissing({env:{NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co'},registry,workers});
 assert.ok(missing.includes('SUPABASE_SERVICE_ROLE_KEY'));
 assert.ok(missing.includes('OPENAI_API_KEY'));
 assert.ok(missing.includes('OPENAI_MODEL_BALANCED'));
 assert.ok(missing.includes('OPENAI_MODEL_EXPERT'));
 const ready=modelRuntimeEnvMissing({env:{NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'secret',OPENAI_API_KEY:'secret',OPENAI_MODEL:'model'},registry,workers});
 assert.deepEqual(ready,[]);
});

test('scheduler worker loading does not require GitHub workflow files in serverless bundle',()=>{
 const registry=loadAgentRegistry();
 const root=mkdtempSync(join(tmpdir(),'agent-scheduler-workers-'));
 mkdirSync(join(root,'config','agents'),{recursive:true});
 writeFileSync(join(root,'config','agents','workers.json'),readFileSync(new URL('../config/agents/workers.json',import.meta.url),'utf8'));
 const workers=loadSchedulerWorkers({root,registry});
 assert.equal(workers.workers['media-watch'].mode,'github-action');
 assert.equal(workers.workers.research.mode,'model-runtime');
 assert.equal(workers.workers.publisher.enabled,false);
});

test('scheduler asks only for enabled non-production model workers and dispatches one job',async()=>{
 const {scheduler,store,dispatcher}=schedulerWith({candidates:['10000000-0000-4000-8000-000000000001'],recovered:2});
 const result=await scheduler.runOnce({workerId:'scheduler-ci',candidateLimit:4,leaseSeconds:300});
 assert.equal(result.status,'dispatched');
 assert.equal(result.recovered,2);
 assert.equal(dispatcher.calls.length,1);
 const request=store.calls.find(call=>call.op==='candidates').args;
 assert.deepEqual(new Set(request.agentIds),new Set(['research','fact-check','editorial-writer','visual-director']));
 assert.equal(request.limit,4);
});

test('scheduler skips a claim race and tries the next bounded candidate',async()=>{
 const ids=['10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002'];
 const {scheduler,dispatcher}=schedulerWith({candidates:ids,handler:async({jobId},index)=>{
  if(index===0)throw new DispatchError('JOB_NOT_DISPATCHABLE',{status:409});
  return {ok:true,jobId,status:'succeeded'};
 }});
 const result=await scheduler.runOnce({workerId:'scheduler-ci'});
 assert.equal(result.status,'dispatched');
 assert.equal(result.result.jobId,ids[1]);
 assert.deepEqual(result.skipped,[{jobId:ids[0],reason:'JOB_NOT_DISPATCHABLE'}]);
 assert.equal(dispatcher.calls.length,2);
});

test('scheduler returns idle without executing when no ready jobs exist',async()=>{
 const {scheduler,dispatcher}=schedulerWith({candidates:[],recovered:1});
 const result=await scheduler.runOnce({workerId:'scheduler-ci'});
 assert.deepEqual(result,{ok:true,status:'idle',recovered:1,candidateCount:0,skipped:[]});
 assert.equal(dispatcher.calls.length,0);
});

test('scheduler propagates non-race dispatch failures',async()=>{
 const {scheduler}=schedulerWith({candidates:['10000000-0000-4000-8000-000000000001'],handler:async()=>{throw new DispatchError('MODEL_HTTP_500',{status:503,retryable:true})}});
 await assert.rejects(()=>scheduler.runOnce({workerId:'scheduler-ci'}),error=>error.code==='MODEL_HTTP_500'&&error.retryable===true);
});
