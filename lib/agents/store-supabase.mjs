import {createClient} from '@supabase/supabase-js';
import {loadAgentRegistry} from './registry.mjs';
import {validateJob} from './contracts.mjs';

function fail(error,op){
 const code=error?.code??'UNKNOWN';const message=error?.message??String(error);
 const e=new Error(`AGENT_DB_${op}:${code}:${message}`);e.cause=error;throw e;
}
function first(data){return Array.isArray(data)?(data[0]??null):(data??null)}
function rowToJob(row,auditTrail=[]){
 if(!row)return null;
 return {jobId:row.id,type:row.job_type,createdAt:row.created_at,requestedBy:row.requested_by,agentId:row.agent_id,status:row.status,
  confidence:row.confidence,reviewRequired:Boolean(row.review_required),inputRefs:row.input_refs??[],sourceRefs:row.source_refs??[],dependencies:row.dependencies??[],
  outputs:row.outputs??[],auditTrail,attempt:row.attempt,maxAttempts:row.max_attempts,payload:row.payload??{},availableAt:row.available_at,
  leaseOwner:row.lease_owner??null,leaseToken:row.lease_token??null,leaseExpiresAt:row.lease_expires_at??null,heartbeatAt:row.heartbeat_at??null,
  startedAt:row.started_at??null,completedAt:row.completed_at??null,updatedAt:row.updated_at};
}
function auditToJobEvent(row){return {at:row.created_at,event:row.event_type,agentId:row.agent_id,...(row.details??{})}}

export function createAgentSupabaseClient({url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY}={}){
 if(!url)throw new Error('AGENT_SUPABASE_URL_MISSING');if(!key)throw new Error('AGENT_SUPABASE_SERVICE_ROLE_KEY_MISSING');
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}

export class SupabaseAgentStore{
 constructor({client=createAgentSupabaseClient(),registry=loadAgentRegistry()}={}){this.client=client;this.registry=registry}
 validate(job){validateJob(job,{agentIds:new Set(this.registry.agents.map(a=>a.id))});return job}
 async rpc(name,args){const {data,error}=await this.client.rpc(name,args);if(error)fail(error,name.toUpperCase());return data}
 async add(job,{idempotencyKey=`job:${job.jobId}`}={}){this.validate(job);const data=await this.rpc('agent_enqueue_job',{p_job:job,p_idempotency_key:idempotencyKey});return this.get(data)}
 async addMany(jobs,{idempotencyPrefix='job'}={}){const out=[];for(const job of jobs)out.push(await this.add(job,{idempotencyKey:`${idempotencyPrefix}:${job.jobId}`}));return out}
 async get(id,{withAudit=true}={}){
  const q=this.client.from('agent_jobs').select('*').eq('id',id).maybeSingle();const {data,error}=await q;if(error)fail(error,'GET_JOB');if(!data)return null;
  let audit=[];if(withAudit){const r=await this.client.from('agent_audit_events').select('agent_id,event_type,details,created_at').eq('job_id',id).order('created_at',{ascending:true}).order('id',{ascending:true});if(r.error)fail(r.error,'GET_AUDIT');audit=(r.data??[]).map(auditToJobEvent)}
  return rowToJob(data,audit);
 }
 async approvalsFor(id){
  const {data,error}=await this.client.from('agent_approvals').select('gate,decision,decided_at,id').eq('job_id',id).order('decided_at',{ascending:false}).order('id',{ascending:false});if(error)fail(error,'GET_APPROVALS');
  const latest=new Map();for(const row of data??[])if(!latest.has(row.gate))latest.set(row.gate,row.decision);return [...latest].filter(([,decision])=>decision==='approved').map(([gate])=>gate);
 }
 async start(id,{workerId,leaseSeconds=120}={}){if(!workerId)throw new Error('AGENT_WORKER_ID_REQUIRED');const data=await this.rpc('agent_claim_job',{p_job_id:id,p_worker_id:workerId,p_lease_seconds:leaseSeconds});const row=first(data);return row?rowToJob(row):null}
 async heartbeat(id,{workerId,leaseToken,leaseSeconds=120}={}){const data=await this.rpc('agent_heartbeat_job',{p_job_id:id,p_worker_id:workerId,p_lease_token:leaseToken,p_lease_seconds:leaseSeconds});const row=first(data);if(!row)throw new Error('AGENT_LEASE_NOT_OWNED');return rowToJob(row)}
 async succeed(id,outputs=[],{workerId,leaseToken,artifacts=[],run=null}={}){const data=await this.rpc('agent_complete_job',{p_job_id:id,p_worker_id:workerId,p_lease_token:leaseToken,p_outputs:outputs,p_artifacts:artifacts,p_run:run});const row=first(data);if(!row)throw new Error('AGENT_COMPLETE_FAILED');return rowToJob(row)}
 async review(id,outputs=[],{workerId,leaseToken,artifacts=[],run=null,reason='model-review-required'}={}){const data=await this.rpc('agent_review_job',{p_job_id:id,p_worker_id:workerId,p_lease_token:leaseToken,p_outputs:outputs,p_artifacts:artifacts,p_run:run,p_reason:reason});const row=first(data);if(!row)throw new Error('AGENT_REVIEW_FAILED');return rowToJob(row)}
 async fail(id,{workerId,leaseToken,reviewRequired=false,errorCode=null}={}){const data=await this.rpc('agent_fail_job',{p_job_id:id,p_worker_id:workerId,p_lease_token:leaseToken,p_review_required:reviewRequired,p_error_code:errorCode});const row=first(data);if(!row)throw new Error('AGENT_FAIL_FAILED');return rowToJob(row)}
 async requeue(id,{availableAt=new Date().toISOString()}={}){const data=await this.rpc('agent_requeue_job',{p_job_id:id,p_available_at:availableAt});const row=first(data);if(!row)throw new Error('AGENT_REQUEUE_FAILED');return rowToJob(row)}
 async approve(id,gate,{decision='approved',evidenceRefs=[],decidedBy='system'}={}){await this.rpc('agent_record_approval',{p_job_id:id,p_gate:gate,p_decision:decision,p_evidence_refs:evidenceRefs,p_decided_by:decidedBy});return this.approvalsFor(id)}
 async recoverExpired(){return this.rpc('agent_recover_expired_leases',{})}
 async dispatchCandidates({agentIds=[],limit=5}={}){
  if(!Array.isArray(agentIds)||agentIds.length===0||agentIds.some(id=>typeof id!=='string'||!id))throw new Error('AGENT_DISPATCH_AGENT_IDS_INVALID');
  if(!Number.isInteger(limit)||limit<1||limit>20)throw new Error('AGENT_DISPATCH_LIMIT_INVALID');
  const data=await this.rpc('agent_dispatch_candidates',{p_agent_ids:agentIds,p_limit:limit});
  return (Array.isArray(data)?data:[]).map(row=>typeof row==='string'?row:row?.job_id).filter(id=>typeof id==='string'&&id.length>0);
 }
 async artifactsForJob(id){const {data,error}=await this.client.from('agent_artifacts').select('artifact_type,artifact_ref,payload,metadata,created_at').eq('job_id',id).order('created_at',{ascending:true});if(error)fail(error,'GET_ARTIFACTS');return (data??[]).map(x=>({type:x.artifact_type,ref:x.artifact_ref,value:x.payload,metadata:x.metadata??{}}))}
}
