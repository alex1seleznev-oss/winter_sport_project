import {validateJob,appendAudit} from './contracts.mjs';
import {canDispatch} from './router.mjs';

const TRANSITIONS={queued:new Set(['blocked','running','cancelled']),blocked:new Set(['queued','cancelled']),running:new Set(['succeeded','failed','review_required']),failed:new Set(['queued','cancelled']),review_required:new Set(['queued','cancelled']),succeeded:new Set(),cancelled:new Set()};

export class MemoryAgentStore{
 constructor({registry}={}){this.registry=registry;this.jobs=new Map();this.approvals=new Map()}
 add(job){validateJob(job,{agentIds:new Set(this.registry.agents.map(a=>a.id))});if(this.jobs.has(job.jobId))throw new Error('JOB_ALREADY_EXISTS');this.jobs.set(job.jobId,structuredClone(job));return this.get(job.jobId)}
 addMany(jobs){for(const job of jobs)this.add(job);return jobs.map(j=>this.get(j.jobId))}
 get(id){const job=this.jobs.get(id);return job?structuredClone(job):null}
 statusMap(){return new Map([...this.jobs].map(([id,j])=>[id,j.status]))}
 approvalsFor(id){return [...(this.approvals.get(id)??new Set())]}
 approve(id,gate){if(!this.jobs.has(id))throw new Error('JOB_NOT_FOUND');if(!this.approvals.has(id))this.approvals.set(id,new Set());this.approvals.get(id).add(gate);return this.approvalsFor(id)}
 audit(id,event,details={}){const job=this.jobs.get(id);if(!job)throw new Error('JOB_NOT_FOUND');const updated=appendAudit(job,event,details);this.jobs.set(id,updated);return this.get(id)}
 ready(){const statuses=this.statusMap();return [...this.jobs.values()].filter(job=>job.status==='queued'&&canDispatch(job,{registry:this.registry,statusByJobId:statuses,approvals:this.approvalsFor(job.jobId)}).ok).map(job=>structuredClone(job))}
 transition(id,next,event=next){const current=this.jobs.get(id);if(!current)throw new Error('JOB_NOT_FOUND');if(!TRANSITIONS[current.status]?.has(next))throw new Error(`JOB_TRANSITION_INVALID:${current.status}->${next}`);const updated=appendAudit({...current,status:next},event,{from:current.status,to:next});this.jobs.set(id,updated);return this.get(id)}
 start(id){const job=this.jobs.get(id);if(!job)throw new Error('JOB_NOT_FOUND');if(job.status!=='queued')throw new Error('JOB_NOT_QUEUED');const decision=canDispatch(job,{registry:this.registry,statusByJobId:this.statusMap(),approvals:this.approvalsFor(id)});if(!decision.ok)throw new Error(`JOB_NOT_DISPATCHABLE:${decision.reasons.join(',')}`);if(job.attempt>=job.maxAttempts)throw new Error('JOB_ATTEMPTS_EXHAUSTED');const updated=this.transition(id,'running','job-started');updated.attempt+=1;this.jobs.set(id,updated);return this.get(id)}
 succeed(id,outputs=[]){const job=this.jobs.get(id);if(job.status!=='running')throw new Error('JOB_NOT_RUNNING');const updated={...this.transition(id,'succeeded','job-succeeded'),outputs:[...outputs]};this.jobs.set(id,updated);return this.get(id)}
 fail(id,{reviewRequired=false}={}){const job=this.jobs.get(id);if(job.status!=='running')throw new Error('JOB_NOT_RUNNING');return this.transition(id,reviewRequired?'review_required':'failed',reviewRequired?'job-review-required':'job-failed')}
 requeue(id){const job=this.jobs.get(id);if(!['failed','blocked','review_required'].includes(job.status))throw new Error('JOB_NOT_REQUEUEABLE');if(job.attempt>=job.maxAttempts)throw new Error('JOB_ATTEMPTS_EXHAUSTED');return this.transition(id,'queued','job-requeued')}
}
