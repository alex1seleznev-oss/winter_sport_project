import {loadAgentRegistry,getAgent} from './registry.mjs';
import {loadWorkers,workerForAgent} from './workers.mjs';
import {SupabaseAgentStore} from './store-supabase.mjs';

export class DurableAgentRuntime{
 constructor({registry=loadAgentRegistry(),workers,store}={}){this.registry=registry;this.workers=workers??loadWorkers({registry});this.store=store??new SupabaseAgentStore({registry})}
 async enqueue(job,options){return this.store.add(job,options)}
 async enqueueMany(jobs,options){return this.store.addMany(jobs,options)}
 async describe(jobId){const job=await this.store.get(jobId);if(!job)throw new Error('JOB_NOT_FOUND');const agent=getAgent(this.registry,job.agentId);const worker=workerForAgent(this.workers,this.registry,job.agentId);return {jobId:job.jobId,type:job.type,agentId:job.agentId,status:job.status,modelProfile:agent.modelProfile,skills:[...agent.skills],worker:structuredClone(worker),dependencies:[...job.dependencies],approvals:await this.store.approvalsFor(job.jobId),attempt:job.attempt,maxAttempts:job.maxAttempts,leaseOwner:job.leaseOwner,leaseToken:job.leaseToken,leaseExpiresAt:job.leaseExpiresAt}}
 async claim(jobId,{workerId,leaseSeconds=120}={}){const current=await this.store.get(jobId,{withAudit:false});if(!current)throw new Error('JOB_NOT_FOUND');const worker=workerForAgent(this.workers,this.registry,current.agentId);if(!worker.enabled)throw new Error(`WORKER_DISABLED:${current.agentId}`);const claimed=await this.store.start(jobId,{workerId,leaseSeconds});if(!claimed)throw new Error('JOB_NOT_DISPATCHABLE');return this.describe(jobId)}
 async heartbeat(jobId,options){return this.store.heartbeat(jobId,options)}
 async complete(jobId,outputs=[],options={}){return this.store.succeed(jobId,outputs,options)}
 async fail(jobId,options={}){return this.store.fail(jobId,options)}
 async requeue(jobId,options={}){return this.store.requeue(jobId,options)}
 async approve(jobId,gate,options={}){return this.store.approve(jobId,gate,options)}
 async recoverExpired(){return this.store.recoverExpired()}
}
