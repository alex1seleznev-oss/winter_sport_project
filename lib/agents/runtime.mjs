import {loadAgentRegistry,getAgent} from './registry.mjs';
import {loadWorkers,workerForAgent} from './workers.mjs';
import {MemoryAgentStore} from './store-memory.mjs';

export class AgentRuntime{
 constructor({registry=loadAgentRegistry(),workers,store}={}){
  this.registry=registry;this.workers=workers??loadWorkers({registry});this.store=store??new MemoryAgentStore({registry});
 }
 enqueue(job){return this.store.add(job)}
 enqueueMany(jobs){return this.store.addMany(jobs)}
 planReady(){return this.store.ready().map(job=>this.describe(job.jobId))}
 describe(jobId){
  const job=this.store.get(jobId);if(!job)throw new Error('JOB_NOT_FOUND');const agent=getAgent(this.registry,job.agentId);const worker=workerForAgent(this.workers,this.registry,job.agentId);
  return {jobId:job.jobId,type:job.type,agentId:job.agentId,status:job.status,modelProfile:agent.modelProfile,skills:[...agent.skills],worker:structuredClone(worker),dependencies:[...job.dependencies],approvals:this.store.approvalsFor(job.jobId)};
 }
 claim(jobId){
  const job=this.store.get(jobId);if(!job)throw new Error('JOB_NOT_FOUND');const worker=workerForAgent(this.workers,this.registry,job.agentId);if(!worker.enabled)throw new Error(`WORKER_DISABLED:${job.agentId}`);this.store.start(jobId);return this.describe(jobId);
 }
 complete(jobId,outputs=[]){return this.store.succeed(jobId,outputs)}
 fail(jobId,options={}){return this.store.fail(jobId,options)}
 approve(jobId,gate){return this.store.approve(jobId,gate)}
 descriptor(jobId){
  const plan=this.describe(jobId),w=plan.worker;
  if(w.mode==='github-action')return {...plan,dispatch:{kind:'github-action',workflow:w.workflow,entrypoint:w.entrypoint,phase:w.phase??null}};
  if(w.mode==='local-command')return {...plan,dispatch:{kind:'local-command',commands:[...w.commands]}};
  if(w.mode==='internal')return {...plan,dispatch:{kind:'internal'}};
  if(w.mode==='model-runtime')return {...plan,dispatch:{kind:'model-runtime',enabled:w.enabled}};
  if(w.mode==='deterministic-publisher')return {...plan,dispatch:{kind:'deterministic-publisher',enabled:w.enabled}};
  throw new Error(`WORKER_MODE_UNSUPPORTED:${w.mode}`);
 }
}
