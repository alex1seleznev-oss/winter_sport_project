import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {loadAgentRegistry,getAgent} from './registry.mjs';
import {loadWorkers,workerForAgent} from './workers.mjs';
import {loadArtifactRegistry,validateArtifact} from './handoff.mjs';
import {SupabaseAgentStore} from './store-supabase.mjs';
import {dependencyArtifacts,DispatchError,safeDispatchErrorCode} from './dispatch-service.mjs';

const QA_MODE='deterministic-qa';

function onlyOne(inputs,type){
 const values=inputs.filter(item=>item.type===type);
 if(values.length!==1)throw new Error(`QA_INPUT_REQUIRED_ONCE:${type}`);
 return values[0];
}
function optionalOne(inputs,type){
 const values=inputs.filter(item=>item.type===type);
 if(values.length>1)throw new Error(`QA_INPUT_AT_MOST_ONCE:${type}`);
 return values[0]??null;
}
function artifactRef(jobId,type,index){return `artifact:${jobId}:${type}:${index}`}
function uniq(values){return [...new Set(values)]}
function releaseRevision(inputs){
 const material=inputs
  .map(item=>({type:item.type,ref:item.ref??null,value:item.value}))
  .sort((a,b)=>`${a.type}:${a.ref??''}`.localeCompare(`${b.type}:${b.ref??''}`));
 return `sha256:${createHash('sha256').update(JSON.stringify(material)).digest('hex')}`;
}
function check(name,ok,note=''){return {name,status:ok?'pass':'fail',note}}
function qaResult(job,checks,artifactRegistry,{releaseCandidate=null}={}){
 const passed=checks.every(item=>item.status==='pass');
 const qaReport={reportId:`qa:${job.jobId}`,passed,checks};
 validateArtifact('qa-report',qaReport,{artifactRegistry});
 const qaRef=artifactRef(job.jobId,'qa-report',0);
 const artifacts=[{type:'qa-report',ref:qaRef,value:qaReport}];
 if(!passed||!releaseCandidate)return {reviewRequired:!passed,artifacts,outputs:[qaRef],qaReport,releaseCandidate:null};
 validateArtifact('release-candidate',releaseCandidate,{artifactRegistry});
 const releaseRef=artifactRef(job.jobId,'release-candidate',1);
 artifacts.push({type:'release-candidate',ref:releaseRef,value:releaseCandidate});
 return {reviewRequired:false,artifacts,outputs:[qaRef,releaseRef],qaReport,releaseCandidate};
}

export function evaluateReleaseQa({job,inputs,artifactRegistry=loadArtifactRegistry()}={}){
 if(!job||job.agentId!=='qa')throw new Error('QA_JOB_INVALID');
 if(!Array.isArray(inputs))throw new Error('QA_INPUTS_INVALID');

 const draftArtifact=onlyOne(inputs,'article-draft');
 const reportArtifact=onlyOne(inputs,'fact-check-report');
 const approvedArtifact=onlyOne(inputs,'approved-evidence');
 const visualArtifact=optionalOne(inputs,'visual-package');
 validateArtifact('article-draft',draftArtifact.value,{artifactRegistry});
 validateArtifact('fact-check-report',reportArtifact.value,{artifactRegistry});
 validateArtifact('approved-evidence',approvedArtifact.value,{artifactRegistry});
 if(visualArtifact)validateArtifact('visual-package',visualArtifact.value,{artifactRegistry});

 const draft=draftArtifact.value,report=reportArtifact.value,approved=approvedArtifact.value,visual=visualArtifact?.value??null;
 const allowedClaims=new Set(approved.packet.claims.map(item=>item.claimId));
 const allowedSources=new Set(approved.packet.sources.flatMap(item=>[item.sourceId,item.url]));
 const checks=[
  check('fact-check-passed',report.decision==='pass','Fact Check must pass before release.'),
  check('approved-evidence-report-match',isDeepStrictEqual(approved.report,report),'Approved evidence must embed the exact Fact Check report.'),
  check('draft-has-approved-claims',draft.claimIds.length>0&&draft.claimIds.every(id=>allowedClaims.has(id)),'Every draft claim must come from approved evidence.'),
  check('draft-sources-approved',draft.sourceRefs.length>0&&draft.sourceRefs.every(ref=>allowedSources.has(ref)),'Every draft source reference must be approved.'),
  check('evidence-has-sources',approved.packet.sources.length>0,'A releasable article requires at least one evidence source.'),
  check('visual-draft-match',!visual||visual.draftId===draft.draftId,'Visual package must target the same draft.'),
  check('named-person-media-gate',job.payload?.namedPersonMedia!==true||Boolean(visual),'Named-person releases require a visual package.')
 ];
 const releaseCandidate=checks.every(item=>item.status==='pass')?{
  releaseId:`release:${job.jobId}`,
  revision:releaseRevision(inputs),
  artifactRefs:uniq([...inputs.map(item=>item.ref).filter(Boolean),artifactRef(job.jobId,'qa-report',0)]),
  approvals:['fact-check-passed','qa-passed']
 }:null;
 return qaResult(job,checks,artifactRegistry,{releaseCandidate});
}

export function evaluateMediaQa({job,inputs,artifactRegistry=loadArtifactRegistry()}={}){
 if(!job||job.agentId!=='qa')throw new Error('QA_JOB_INVALID');
 const visualArtifact=onlyOne(inputs,'visual-package');
 validateArtifact('visual-package',visualArtifact.value,{artifactRegistry});
 const visual=visualArtifact.value;
 const checks=[
  check('visual-package-valid',true,'Visual package passed structural validation.'),
  check('named-person-media-present',!visual.namedPersonMedia||visual.media.length>0,'Named-person package must contain reviewed media.'),
  check('named-person-identity-rights',!visual.namedPersonMedia||visual.media.every(item=>item.identityReviewed&&item.rightsReviewed),'Every named-person asset requires identity and rights review.')
 ];
 return qaResult(job,checks,artifactRegistry);
}

export function evaluateQa({job,inputs,artifactRegistry=loadArtifactRegistry()}={}){
 if(job?.type==='qa.release')return evaluateReleaseQa({job,inputs,artifactRegistry});
 if(job?.type==='qa.media-review')return evaluateMediaQa({job,inputs,artifactRegistry});
 throw new Error(`QA_JOB_TYPE_UNSUPPORTED:${job?.type??'unknown'}`);
}

export class BoundedQaDispatcher{
 constructor({registry=loadAgentRegistry(),workers,store,artifactRegistry}={}){
  this.registry=registry;
  this.workers=workers??loadWorkers({registry,validatePaths:false});
  this.store=store??new SupabaseAgentStore({registry});
  this.artifactRegistry=artifactRegistry??loadArtifactRegistry();
 }
 async executeOne({jobId,workerId,leaseSeconds=300}){
  if(typeof jobId!=='string'||!jobId)throw new DispatchError('JOB_ID_REQUIRED',{status:400});
  if(typeof workerId!=='string'||!workerId||workerId.length>200)throw new DispatchError('WORKER_ID_INVALID',{status:500});
  const pending=await this.store.get(jobId,{withAudit:false});
  if(!pending)throw new DispatchError('JOB_NOT_FOUND',{status:404});
  const agent=getAgent(this.registry,pending.agentId);
  const worker=workerForAgent(this.workers,this.registry,pending.agentId);
  if(!worker.enabled)throw new DispatchError('WORKER_DISABLED',{status:409});
  if(agent.id!=='qa'||worker.mode!==QA_MODE||agent.productionWrite)throw new DispatchError('DISPATCH_MODE_FORBIDDEN',{status:403});

  let claimed=null;
  try{
   claimed=await this.store.start(jobId,{workerId,leaseSeconds});
   if(!claimed)throw new DispatchError('JOB_NOT_DISPATCHABLE',{status:409});
   const inputs=await dependencyArtifacts(this.store,claimed);
   const result=evaluateQa({job:claimed,inputs,artifactRegistry:this.artifactRegistry});
   const persistence={workerId,leaseToken:claimed.leaseToken,artifacts:result.artifacts,run:null};
   const finalJob=result.reviewRequired
    ? await this.store.review(jobId,result.outputs,{...persistence,reason:'qa-failed'})
    : await this.store.succeed(jobId,result.outputs,persistence);
   return {ok:true,jobId,agentId:'qa',status:finalJob.status,artifactRefs:result.outputs,reviewRequired:result.reviewRequired};
  }catch(error){
   if(error instanceof DispatchError&&(!claimed||error.code==='JOB_NOT_DISPATCHABLE'))throw error;
   const code=safeDispatchErrorCode(error);
   let jobStatus=claimed?.status??null;
   if(claimed?.leaseToken){
    try{jobStatus=(await this.store.fail(jobId,{workerId,leaseToken:claimed.leaseToken,reviewRequired:true,errorCode:code})).status}catch{}
   }
   throw new DispatchError(code,{status:code.startsWith('AGENT_DB_')?503:422,retryable:code.startsWith('AGENT_DB_'),jobStatus,cause:error});
  }
 }
}
