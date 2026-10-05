import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {loadAgentRegistry,getAgent} from './registry.mjs';
import {loadArtifactRegistry,validateArtifact} from './handoff.mjs';
import {MODEL_OUTPUT_SCHEMAS,assertModelSchema} from './model-schemas.mjs';
import {OpenAIResponsesProvider,ModelProviderError} from './model-provider-openai.mjs';

const SPECIALISTS=new Set(['research','fact-check','editorial-writer','visual-director']);

function loadBudgets(root){const cfg=JSON.parse(readFileSync(resolve(root,'config/agents/budgets.json'),'utf8'));if(!cfg?.profiles)throw new Error('MODEL_BUDGET_CONFIG_INVALID');return cfg}
function estimateTokens(value){return Math.ceil(Buffer.byteLength(typeof value==='string'?value:JSON.stringify(value),'utf8')/3)}
function asInputs(inputs){if(!Array.isArray(inputs))throw new Error('MODEL_INPUTS_INVALID');return inputs.map((x,index)=>{if(!x||typeof x!=='object'||Array.isArray(x)||typeof x.type!=='string'||!x.type||!('value' in x))throw new Error(`MODEL_INPUT_INVALID:${index}`);return {type:x.type,ref:x.ref??null,value:structuredClone(x.value)}})}
function valuesOf(inputs,type){return inputs.filter(x=>x.type===type).map(x=>x.value)}
function onlyOne(inputs,type){const values=valuesOf(inputs,type);if(values.length!==1)throw new Error(`MODEL_INPUT_REQUIRED_ONCE:${type}`);return values[0]}
function outputRef(jobId,type,index){return `artifact:${jobId}:${type}:${index}`}
function ensureSubset(values,allowed,code){for(const value of values)if(!allowed.has(value))throw new Error(`${code}:${value}`)}
function addEnum(node,values){const unique=[...new Set(values.filter(value=>typeof value==='string'&&value.length>0))];if(unique.length)node.enum=unique}
function constrainFactReport(reportSchema,packet){
 addEnum(reportSchema.properties.packetId,[packet.packetId]);
 const claimIds=packet.claims.map(claim=>claim.claimId);
 const sourceRefs=packet.sources.flatMap(source=>[source.sourceId,source.url]);
 addEnum(reportSchema.properties.checks.items.properties.claimId,claimIds);
 addEnum(reportSchema.properties.checks.items.properties.sourceRefs.items,sourceRefs);
}

export function buildRuntimeSchema(agentId,job,inputs=[]){
 const base=MODEL_OUTPUT_SCHEMAS[agentId];if(!base)throw new Error(`MODEL_SCHEMA_MISSING:${agentId}`);
 const schema=structuredClone(base);
 if(agentId==='research'){
  const allowed=[...(job?.sourceRefs??[]).filter(ref=>typeof ref==='string'&&ref.startsWith('https://')),...valuesOf(inputs,'source-snapshot').map(snapshot=>snapshot.sourceUrl)];
  addEnum(schema.schema.properties.sources.items.properties.url,allowed);
 }else if(agentId==='fact-check'){
  const packet=onlyOne(inputs,'evidence-packet');
  constrainFactReport(schema.schema.properties.report,packet);
  const approved=schema.schema.properties.approvedEvidence.anyOf.find(candidate=>candidate.type==='object');
  constrainFactReport(approved.properties.report,packet);
  addEnum(approved.properties.packet.properties.packetId,[packet.packetId]);
  addEnum(approved.properties.packet.properties.sources.items.properties.sourceId,packet.sources.map(source=>source.sourceId));
  addEnum(approved.properties.packet.properties.sources.items.properties.url,packet.sources.map(source=>source.url));
  addEnum(approved.properties.packet.properties.claims.items.properties.claimId,packet.claims.map(claim=>claim.claimId));
 }else if(agentId==='editorial-writer'){
  const approved=onlyOne(inputs,'approved-evidence');
  addEnum(schema.schema.properties.claimIds.items,approved.packet.claims.map(claim=>claim.claimId));
  addEnum(schema.schema.properties.sourceRefs.items,approved.packet.sources.flatMap(source=>[source.sourceId,source.url]));
 }else if(agentId==='visual-director'){
  const verified=valuesOf(inputs,'verified-media');
  const aliases=verified.flatMap(media=>[media.mediaId,`media:${media.mediaId}`,...media.sourceRefs]);
  addEnum(schema.schema.properties.media.items.properties.mediaRef,aliases);
 }
 return schema;
}

export class ModelRuntimeAdapter{
 constructor({root=process.cwd(),registry,artifactRegistry,budgets,provider}={}){
  this.root=root;this.registry=registry??loadAgentRegistry({root});this.artifactRegistry=artifactRegistry??loadArtifactRegistry({root});this.budgets=budgets??loadBudgets(root);this.provider=provider??new OpenAIResponsesProvider();
 }
 validateInputs(agent,inputs){
  for(const input of inputs){if(this.artifactRegistry.types[input.type])validateArtifact(input.type,input.value,{artifactRegistry:this.artifactRegistry})}
  if(agent.id==='fact-check')onlyOne(inputs,'evidence-packet');
  if(agent.id==='editorial-writer')onlyOne(inputs,'approved-evidence');
  if(agent.id==='visual-director')onlyOne(inputs,'article-draft');
 }
 instructions(agent){return readFileSync(resolve(this.root,agent.promptPath),'utf8')}
 artifact(type,value,job,index){validateArtifact(type,value,{artifactRegistry:this.artifactRegistry});return {type,ref:outputRef(job.jobId,type,index),value:structuredClone(value)}}
 enforceResearch(job,inputs,packet){
  const allowed=new Set((job.sourceRefs??[]).filter(x=>typeof x==='string'&&x.startsWith('https://')));
  for(const snapshot of valuesOf(inputs,'source-snapshot'))allowed.add(snapshot.sourceUrl);
  for(const source of packet.sources)if(!allowed.has(source.url))throw new Error(`RESEARCH_SOURCE_NOT_PROVIDED:${source.url}`);
  return [this.artifact('evidence-packet',packet,job,0)];
 }
 enforceFactCheck(job,inputs,bundle){
  if(!bundle||typeof bundle!=='object'||Array.isArray(bundle))throw new Error('FACT_BUNDLE_INVALID');
  const packet=onlyOne(inputs,'evidence-packet');const report=bundle.report;
  validateArtifact('fact-check-report',report,{artifactRegistry:this.artifactRegistry});
  if(report.packetId!==packet.packetId)throw new Error('FACT_REPORT_PACKET_MISMATCH');
  const claimIds=new Set(packet.claims.map(c=>c.claimId));const checked=new Set();
  const sourceRefs=new Set(packet.sources.flatMap(s=>[s.sourceId,s.url]));
  for(const check of report.checks){
   if(!claimIds.has(check.claimId))throw new Error(`FACT_CHECK_UNKNOWN_CLAIM:${check.claimId}`);
   if(checked.has(check.claimId))throw new Error(`FACT_CHECK_DUPLICATE_CLAIM:${check.claimId}`);checked.add(check.claimId);
   ensureSubset(check.sourceRefs,sourceRefs,'FACT_CHECK_SOURCE_NOT_IN_PACKET');
   if(check.decision==='supported'&&check.sourceRefs.length===0)throw new Error(`FACT_CHECK_SUPPORTED_WITHOUT_SOURCE:${check.claimId}`);
  }
  if(checked.size!==claimIds.size)throw new Error('FACT_CHECK_INCOMPLETE');
  const artifacts=[this.artifact('fact-check-report',report,job,0)];
  if(report.decision==='pass'){
   if(!bundle.approvedEvidence)throw new Error('FACT_PASS_WITHOUT_APPROVED_EVIDENCE');
   if(!isDeepStrictEqual(bundle.approvedEvidence.packet,packet))throw new Error('FACT_APPROVED_EVIDENCE_MUTATED_PACKET');
   if(!isDeepStrictEqual(bundle.approvedEvidence.report,report))throw new Error('FACT_APPROVED_EVIDENCE_REPORT_MISMATCH');
   artifacts.push(this.artifact('approved-evidence',bundle.approvedEvidence,job,1));
   return {artifacts,reviewRequired:false};
  }
  if(bundle.approvedEvidence!==null)throw new Error('FACT_NONPASS_WITH_APPROVED_EVIDENCE');
  return {artifacts,reviewRequired:true};
 }
 enforceWriter(job,inputs,draft){
  const approved=onlyOne(inputs,'approved-evidence');
  const claimIds=new Set(approved.packet.claims.map(c=>c.claimId));const sourceRefs=new Set(approved.packet.sources.flatMap(s=>[s.sourceId,s.url]));
  ensureSubset(draft.claimIds,claimIds,'DRAFT_CLAIM_NOT_APPROVED');ensureSubset(draft.sourceRefs,sourceRefs,'DRAFT_SOURCE_NOT_APPROVED');
  return [this.artifact('article-draft',draft,job,0)];
 }
 enforceVisual(job,inputs,pkg){
  const draft=onlyOne(inputs,'article-draft');if(pkg.draftId!==draft.draftId)throw new Error('VISUAL_DRAFT_MISMATCH');
  const verified=valuesOf(inputs,'verified-media');const aliases=new Map();
  for(const media of verified){for(const alias of [media.mediaId,`media:${media.mediaId}`,...media.sourceRefs])aliases.set(alias,media)}
  if(pkg.media.length>0&&job.payload?.namedPersonMedia!==true)throw new Error('VISUAL_PERSON_MEDIA_WITHOUT_NAMED_PERSON_GATE');
  if(pkg.media.length>0&&!pkg.namedPersonMedia)throw new Error('VISUAL_PERSON_MEDIA_FLAG_REQUIRED');
  for(const item of pkg.media){const source=aliases.get(item.mediaRef);if(!source)throw new Error(`VISUAL_MEDIA_NOT_VERIFIED:${item.mediaRef}`);if(!item.identityReviewed||!item.rightsReviewed)throw new Error(`VISUAL_MEDIA_APPROVALS_MISSING:${item.mediaRef}`);if(item.credit!==source.credit)throw new Error(`VISUAL_MEDIA_CREDIT_MISMATCH:${item.mediaRef}`)}
  if(pkg.namedPersonMedia&&pkg.media.length===0)throw new Error('VISUAL_NAMED_PERSON_FLAG_WITHOUT_MEDIA');
  return [this.artifact('visual-package',pkg,job,0)];
 }
 async execute({job,inputs=[]}){
  if(!job||typeof job!=='object')throw new Error('MODEL_JOB_INVALID');
  const agent=getAgent(this.registry,job.agentId);if(!SPECIALISTS.has(agent.id))throw new Error(`MODEL_AGENT_NOT_EXECUTABLE:${agent.id}`);if(agent.productionWrite)throw new Error(`MODEL_AGENT_PRODUCTION_WRITE_FORBIDDEN:${agent.id}`);
  const normalized=asInputs(inputs);this.validateInputs(agent,normalized);
  const budget=this.budgets.profiles[agent.modelProfile];if(!budget||budget.maxOutputTokens<1)throw new Error(`MODEL_BUDGET_MISSING:${agent.modelProfile}`);
  const instructions=this.instructions(agent);const input={job:{jobId:job.jobId,type:job.type,payload:job.payload??{},sourceRefs:job.sourceRefs??[],inputRefs:job.inputRefs??[]},artifacts:normalized};
  const estimatedInputTokens=estimateTokens(instructions)+estimateTokens(input);if(estimatedInputTokens>budget.maxInputTokens)throw new Error(`MODEL_INPUT_BUDGET_EXCEEDED:${estimatedInputTokens}>${budget.maxInputTokens}`);
  const schema=buildRuntimeSchema(agent.id,job,normalized);
  const runId=randomUUID(),startedAt=new Date().toISOString();const controller=new AbortController();let timer;
  const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new ModelProviderError('MODEL_REQUEST_TIMEOUT',{retryable:true}))},budget.timeoutMs)});
  let response;
  try{response=await Promise.race([this.provider.invoke({modelProfile:agent.modelProfile,instructions,input,schema,maxOutputTokens:budget.maxOutputTokens,signal:controller.signal,metadata:{run_id:runId,job_id:job.jobId,agent_id:agent.id}}),timeout])}finally{clearTimeout(timer)}
  if(response?.usage?.inputTokens!=null&&response.usage.inputTokens>budget.maxInputTokens)throw new Error(`MODEL_REPORTED_INPUT_BUDGET_EXCEEDED:${response.usage.inputTokens}>${budget.maxInputTokens}`);
  if(response?.usage?.outputTokens!=null&&response.usage.outputTokens>budget.maxOutputTokens)throw new Error(`MODEL_OUTPUT_BUDGET_EXCEEDED:${response.usage.outputTokens}>${budget.maxOutputTokens}`);
  assertModelSchema(response?.output,schema.schema);
  const estimatedOutputTokens=estimateTokens(response?.output??{});if(estimatedOutputTokens>budget.maxOutputTokens)throw new Error(`MODEL_OUTPUT_BUDGET_EXCEEDED_ESTIMATE:${estimatedOutputTokens}>${budget.maxOutputTokens}`);
  let artifacts,reviewRequired=false;
  if(agent.id==='research')artifacts=this.enforceResearch(job,normalized,response.output);
  else if(agent.id==='fact-check'){const checked=this.enforceFactCheck(job,normalized,response.output);artifacts=checked.artifacts;reviewRequired=checked.reviewRequired}
  else if(agent.id==='editorial-writer')artifacts=this.enforceWriter(job,normalized,response.output);
  else artifacts=this.enforceVisual(job,normalized,response.output);
  const completedAt=new Date().toISOString();
  return {runId,jobId:job.jobId,agentId:agent.id,status:reviewRequired?'review_required':'completed',reviewRequired,artifacts,trace:{runId,jobId:job.jobId,agentId:agent.id,modelProfile:agent.modelProfile,model:response?.model??null,responseId:response?.responseId??null,startedAt,completedAt,inputTokensEstimated:estimatedInputTokens,outputTokensEstimated:estimatedOutputTokens,usage:response?.usage??null,outputTypes:artifacts.map(a=>a.type)}};
 }
}
