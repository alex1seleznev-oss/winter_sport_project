import {loadAgentRegistry,getAgent} from './registry.mjs';
import {loadWorkers,workerForAgent} from './workers.mjs';
import {SupabaseAgentStore} from './store-supabase.mjs';
import {BoundedModelDispatcher,DispatchError} from './dispatch-service.mjs';
import {BoundedQaDispatcher} from './qa-runtime.mjs';

export class BoundedAgentDispatcher{
 constructor({registry=loadAgentRegistry(),workers,store,modelDispatcher,qaDispatcher}={}){
  this.registry=registry;
  this.workers=workers??loadWorkers({registry,validatePaths:false});
  this.store=store??new SupabaseAgentStore({registry});
  this.modelDispatcher=modelDispatcher??new BoundedModelDispatcher({registry,workers:this.workers,store:this.store});
  this.qaDispatcher=qaDispatcher??new BoundedQaDispatcher({registry,workers:this.workers,store:this.store});
 }
 async executeOne(args){
  const pending=await this.store.get(args?.jobId,{withAudit:false});
  if(!pending)throw new DispatchError('JOB_NOT_FOUND',{status:404});
  const agent=getAgent(this.registry,pending.agentId);
  const worker=workerForAgent(this.workers,this.registry,pending.agentId);
  if(!worker.enabled)throw new DispatchError('WORKER_DISABLED',{status:409});
  if(agent.productionWrite)throw new DispatchError('DISPATCH_MODE_FORBIDDEN',{status:403});
  if(worker.mode==='model-runtime')return this.modelDispatcher.executeOne(args);
  if(worker.mode==='deterministic-qa')return this.qaDispatcher.executeOne(args);
  throw new DispatchError('DISPATCH_MODE_FORBIDDEN',{status:403});
 }
}
