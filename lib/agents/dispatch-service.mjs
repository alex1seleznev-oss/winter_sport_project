import {loadAgentRegistry,getAgent} from './registry.mjs';
import {loadWorkers,workerForAgent} from './workers.mjs';
import {SupabaseAgentStore} from './store-supabase.mjs';
import {ModelRuntimeAdapter} from './model-runtime.mjs';

const MODEL_MODE='model-runtime';
const INFRASTRUCTURE_CODES=new Set([
 'MODEL_PROVIDER_NOT_CONFIGURED',
 'MODEL_PROVIDER_FETCH_UNAVAILABLE',
 'AGENT_SUPABASE_URL_MISSING',
 'AGENT_SUPABASE_SERVICE_ROLE_KEY_MISSING'
]);

export class DispatchError extends Error{
 constructor(code,{status=500,retryable=false,jobStatus=null,cause=null}={}){super(code,{cause});this.name='DispatchError';this.code=code;this.status=status;this.retryable=retryable;this.jobStatus=jobStatus}
}

export function safeDispatchErrorCode(error){
 const raw=typeof error?.code==='string'?error.code:typeof error?.message==='string'?error.message:'DISPATCH_FAILED';
 const head=raw.split(':',1)[0].trim().toUpperCase();
 return /^[A-Z0-9_]{3,120}$/.test(head)?head:'DISPATCH_FAILED';
}

function runRecord(result){
 const trace=result.trace??{};
 return {
  runId:result.runId,
  modelProfile:trace.modelProfile??null,
  model:trace.model??null,
  responseId:trace.responseId??null,
  startedAt:trace.startedAt,
  completedAt:trace.completedAt,
  usage:trace.usage??{},
  metadata:{
   inputTokensEstimated:trace.inputTokensEstimated??null,
   outputTokensEstimated:trace.outputTokensEstimated??null,
   outputTypes:Array.isArray(trace.outputTypes)?trace.outputTypes:[]
  }
 };
}

function retryDelayMs(attempt){return Math.min(300000,15000*Math.max(1,2**Math.max(0,attempt-1)))}
function infrastructureFailure(code){return INFRASTRUCTURE_CODES.has(code)||code.startsWith('MODEL_FOR_PROFILE_NOT_CONFIGURED')||code.startsWith('AGENT_DB_')}

export async function dependencyArtifacts(store,job){
 const inputs=[];
 for(const dependencyId of job.dependencies??[]){
  const artifacts=await store.artifactsForJob(dependencyId);
  for(const artifact of artifacts)inputs.push(artifact);
 }
 return inputs;
}

export class BoundedModelDispatcher{
 constructor({registry=loadAgentRegistry(),workers,store,modelAdapter}={}){
  this.registry=registry;
  // Vercel serverless bundles do not include GitHub workflow files because they are
  // not runtime dependencies. Structural worker validation still runs here; path
  // existence remains enforced by normal repository/CI validation.
  this.workers=workers??loadWorkers({registry,validatePaths:false});
  this.store=store??new SupabaseAgentStore({registry});
  this.modelAdapter=modelAdapter??new ModelRuntimeAdapter({registry});
 }
 async executeOne({jobId,workerId,leaseSeconds=300}){
  if(typeof jobId!=='string'||!jobId)throw new DispatchError('JOB_ID_REQUIRED',{status:400});
  if(typeof workerId!=='string'||!workerId||workerId.length>200)throw new DispatchError('WORKER_ID_INVALID',{status:500});
  if(!Number.isInteger(leaseSeconds)||leaseSeconds<60||leaseSeconds>600)throw new DispatchError('LEASE_SECONDS_INVALID',{status:500});

  const pending=await this.store.get(jobId,{withAudit:false});
  if(!pending)throw new DispatchError('JOB_NOT_FOUND',{status:404});
  const agent=getAgent(this.registry,pending.agentId);
  const worker=workerForAgent(this.workers,this.registry,pending.agentId);
  if(!worker.enabled)throw new DispatchError('WORKER_DISABLED',{status:409});
  if(worker.mode!==MODEL_MODE||agent.productionWrite)throw new DispatchError('DISPATCH_MODE_FORBIDDEN',{status:403});

  let claimed=null;
  try{
   claimed=await this.store.start(jobId,{workerId,leaseSeconds});
   if(!claimed)throw new DispatchError('JOB_NOT_DISPATCHABLE',{status:409});
   if(!claimed.leaseToken)throw new DispatchError('LEASE_TOKEN_MISSING',{status:500});

   const inputs=await dependencyArtifacts(this.store,claimed);
   const result=await this.modelAdapter.execute({job:claimed,inputs});
   const artifacts=result.artifacts??[];
   const outputs=artifacts.map(artifact=>artifact.ref);
   const persistence={workerId,leaseToken:claimed.leaseToken,artifacts,run:runRecord(result)};
   const finalJob=result.reviewRequired
    ? await this.store.review(jobId,outputs,{...persistence,reason:'model-review-required'})
    : await this.store.succeed(jobId,outputs,persistence);

   return {ok:true,jobId,agentId:claimed.agentId,status:finalJob.status,artifactRefs:outputs,runId:result.runId,reviewRequired:Boolean(result.reviewRequired)};
  }catch(error){
   if(error instanceof DispatchError&&(!claimed||error.code==='JOB_NOT_DISPATCHABLE'))throw error;
   const code=safeDispatchErrorCode(error);
   const retryable=Boolean(error?.retryable);
   let jobStatus=claimed?.status??null;
   if(claimed?.leaseToken){
    try{
     const shouldReview=!retryable&&!infrastructureFailure(code);
     const failed=await this.store.fail(jobId,{workerId,leaseToken:claimed.leaseToken,reviewRequired:shouldReview,errorCode:code});
     jobStatus=failed.status;
     if(retryable&&failed.attempt<failed.maxAttempts){
      const availableAt=new Date(Date.now()+retryDelayMs(failed.attempt)).toISOString();
      const requeued=await this.store.requeue(jobId,{availableAt});
      jobStatus=requeued.status;
     }
    }catch{
     // Do not replace the bounded public error with persistence details. A stale or
     // expired lease is recoverable by the database lease-recovery path.
    }
   }
   const status=retryable||infrastructureFailure(code)?503:422;
   throw new DispatchError(code,{status,retryable,jobStatus,cause:error});
  }
 }
}
