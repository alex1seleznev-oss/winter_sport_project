import {loadAgentRegistry,getAgent} from './registry.mjs';
import {loadWorkers,workerForAgent} from './workers.mjs';
import {SupabaseAgentStore} from './store-supabase.mjs';
import {BoundedModelDispatcher,DispatchError} from './dispatch-service.mjs';

const MODEL_MODE='model-runtime';
const PROFILE_ENV={economy:'OPENAI_MODEL_ECONOMY',balanced:'OPENAI_MODEL_BALANCED',expert:'OPENAI_MODEL_EXPERT'};

export function executableModelAgents(registry,workers){
 return registry.agents
  .filter(agent=>{
   const worker=workerForAgent(workers,registry,agent.id);
   return worker.enabled&&worker.mode===MODEL_MODE&&!agent.productionWrite;
  })
  .map(agent=>agent.id);
}

export function modelRuntimeEnvMissing({env=process.env,registry=loadAgentRegistry(),workers}={}){
 const workerConfig=workers??loadWorkers({registry});
 const missing=[];
 for(const key of ['NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','OPENAI_API_KEY'])if(!env[key])missing.push(key);
 if(!env.OPENAI_MODEL){
  const profiles=new Set(executableModelAgents(registry,workerConfig).map(id=>getAgent(registry,id).modelProfile));
  for(const profile of profiles){const key=PROFILE_ENV[profile];if(key&&!env[key])missing.push(key)}
 }
 return [...new Set(missing)];
}

export class BoundedAgentScheduler{
 constructor({registry=loadAgentRegistry(),workers,store,dispatcher}={}){
  this.registry=registry;
  this.workers=workers??loadWorkers({registry});
  this.store=store??new SupabaseAgentStore({registry});
  this.dispatcher=dispatcher??new BoundedModelDispatcher({registry,workers:this.workers,store:this.store});
  this.agentIds=executableModelAgents(this.registry,this.workers);
 }
 async runOnce({workerId='agent-scheduler',candidateLimit=5,leaseSeconds=300}={}){
  if(typeof workerId!=='string'||!workerId||workerId.length>200)throw new Error('SCHEDULER_WORKER_ID_INVALID');
  if(!Number.isInteger(candidateLimit)||candidateLimit<1||candidateLimit>20)throw new Error('SCHEDULER_CANDIDATE_LIMIT_INVALID');
  if(!Number.isInteger(leaseSeconds)||leaseSeconds<60||leaseSeconds>600)throw new Error('SCHEDULER_LEASE_SECONDS_INVALID');
  if(this.agentIds.length===0)return {ok:true,status:'idle',recovered:0,candidateCount:0,skipped:[]};

  const recovered=await this.store.recoverExpired();
  const candidates=await this.store.dispatchCandidates({agentIds:this.agentIds,limit:candidateLimit});
  const skipped=[];
  for(const jobId of candidates){
   try{
    const result=await this.dispatcher.executeOne({jobId,workerId,leaseSeconds});
    return {ok:true,status:'dispatched',recovered,candidateCount:candidates.length,skipped,result};
   }catch(error){
    if(error instanceof DispatchError&&(error.code==='JOB_NOT_DISPATCHABLE'||error.code==='JOB_NOT_FOUND')){
     skipped.push({jobId,reason:error.code});
     continue;
    }
    throw error;
   }
  }
  return {ok:true,status:'idle',recovered,candidateCount:candidates.length,skipped};
 }
}
