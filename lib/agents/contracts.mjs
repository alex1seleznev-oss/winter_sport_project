import {randomUUID} from 'node:crypto';

export const JOB_STATUSES=Object.freeze(['queued','blocked','running','succeeded','failed','review_required','cancelled']);
export const CONFIDENCE_LEVELS=Object.freeze(['unknown','low','medium','high','verified']);
const SECRET_KEY=/(?:api[-_]?key|authorization|password|passwd|secret|token|cookie|private[-_]?key)/i;

function plainObject(value){return value!==null&&typeof value==='object'&&!Array.isArray(value)}

export function assertNoSecrets(value,path='payload'){
 if(Array.isArray(value)){value.forEach((item,index)=>assertNoSecrets(item,`${path}[${index}]`));return true}
 if(!plainObject(value))return true;
 for(const [key,item] of Object.entries(value)){
  if(SECRET_KEY.test(key))throw new Error(`SECRET_FIELD_FORBIDDEN:${path}.${key}`);
  assertNoSecrets(item,`${path}.${key}`);
 }
 return true;
}

export function validateRef(value){
 if(typeof value!=='string'||value.length<1||value.length>2048)return false;
 if(/[\u0000-\u001f\u007f]/.test(value))return false;
 if(value.startsWith('https://')){try{const u=new URL(value);return !u.username&&!u.password&&u.hostname.includes('.')}catch{return false}}
 return /^[a-z0-9][a-z0-9._:/@#-]{0,2047}$/i.test(value);
}

export function validateJob(job,{agentIds}={}){
 if(!plainObject(job))throw new Error('JOB_NOT_OBJECT');
 for(const key of ['jobId','type','createdAt','requestedBy','agentId','status'])if(typeof job[key]!=='string'||!job[key])throw new Error(`JOB_FIELD_INVALID:${key}`);
 if(!JOB_STATUSES.includes(job.status))throw new Error('JOB_STATUS_INVALID');
 if(!CONFIDENCE_LEVELS.includes(job.confidence??'unknown'))throw new Error('JOB_CONFIDENCE_INVALID');
 if(agentIds&&!agentIds.has(job.agentId))throw new Error('JOB_AGENT_UNKNOWN');
 if(!Array.isArray(job.inputRefs)||job.inputRefs.some(x=>!validateRef(x)))throw new Error('JOB_INPUT_REFS_INVALID');
 if(!Array.isArray(job.sourceRefs)||job.sourceRefs.some(x=>!validateRef(x)))throw new Error('JOB_SOURCE_REFS_INVALID');
 if(!Array.isArray(job.dependencies)||job.dependencies.some(x=>typeof x!=='string'||!x))throw new Error('JOB_DEPENDENCIES_INVALID');
 if(!Array.isArray(job.auditTrail))throw new Error('JOB_AUDIT_INVALID');
 if(!Number.isInteger(job.attempt)||job.attempt<0)throw new Error('JOB_ATTEMPT_INVALID');
 if(!Number.isInteger(job.maxAttempts)||job.maxAttempts<1||job.maxAttempts>10)throw new Error('JOB_MAX_ATTEMPTS_INVALID');
 assertNoSecrets(job.payload??{});
 return job;
}

export function createJob(input){
 const now=input.createdAt??new Date().toISOString();
 const job={
  jobId:input.jobId??randomUUID(),type:input.type,createdAt:now,requestedBy:input.requestedBy??'system',agentId:input.agentId??'orchestrator',status:input.status??'queued',confidence:input.confidence??'unknown',reviewRequired:Boolean(input.reviewRequired),inputRefs:[...(input.inputRefs??[])],sourceRefs:[...(input.sourceRefs??[])],dependencies:[...(input.dependencies??[])],outputs:[...(input.outputs??[])],auditTrail:[...(input.auditTrail??[]),{at:now,event:'job-created',agentId:input.agentId??'orchestrator'}],attempt:input.attempt??0,maxAttempts:input.maxAttempts??3,payload:input.payload??{}
 };
 return job;
}

export function appendAudit(job,event,details={}){
 const at=new Date().toISOString();
 assertNoSecrets(details,'audit');
 return {...job,auditTrail:[...job.auditTrail,{at,event,...details}]};
}
