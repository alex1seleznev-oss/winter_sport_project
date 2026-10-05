import test from 'node:test';import assert from 'node:assert/strict';
import {ModelRuntimeAdapter} from '../lib/agents/model-runtime.mjs';
import {OpenAIResponsesProvider} from '../lib/agents/model-provider-openai.mjs';
import {AgentRuntime} from '../lib/agents/runtime.mjs';
import {loadAgentRegistry} from '../lib/agents/registry.mjs';
import {createJob} from '../lib/agents/contracts.mjs';
import {routeJob} from '../lib/agents/router.mjs';

const registry=loadAgentRegistry();
const observedAt='2026-10-04T18:00:00.000Z';
const url='https://example.org/results';
const packet={packetId:'packet:1',topic:'World Cup result',createdAt:observedAt,sources:[{sourceId:'source:1',kind:'official',url,publishedAt:null,observedAt}],claims:[{claimId:'claim:1',text:'Athlete A won.',kind:'fact',confidence:'high',sourceIds:['source:1'],mutable:false}],conflicts:[]};
const report={reportId:'report:1',packetId:'packet:1',decision:'pass',checks:[{claimId:'claim:1',decision:'supported',sourceRefs:[url],note:'Official result.'}]};
const approved={packet,report};

class FakeProvider{constructor(output){this.output=output;this.calls=[]}async invoke(request){this.calls.push(request);return {output:structuredClone(this.output),model:'fake-model',responseId:'resp:1',usage:{inputTokens:100,outputTokens:50,totalTokens:150}}}}
function job(type,payload={},sourceRefs=[]){return routeJob(createJob({type,agentId:'orchestrator',payload,sourceRefs,inputRefs:['event:test']}),registry)}

test('research executes with a bounded structured output and cannot invent an unsupplied source URL',async()=>{
 const provider=new FakeProvider(packet);const adapter=new ModelRuntimeAdapter({registry,provider});const research=job('research.story',{},[url]);
 const result=await adapter.execute({job:research,inputs:[]});assert.equal(result.status,'completed');assert.equal(result.artifacts[0].type,'evidence-packet');assert.equal(provider.calls[0].schema.name,'evidence_packet');
 const badProvider=new FakeProvider({...packet,sources:[{...packet.sources[0],url:'https://unapproved.example.net/story'}]});
 await assert.rejects(()=>new ModelRuntimeAdapter({registry,provider:badProvider}).execute({job:research,inputs:[]}),/MODEL_SCHEMA_ENUM_INVALID|RESEARCH_SOURCE_NOT_PROVIDED/);
});

test('fact checker covers every claim and only emits approved evidence on pass',async()=>{
 const provider=new FakeProvider({report,approvedEvidence:approved});const adapter=new ModelRuntimeAdapter({registry,provider});const fact=job('fact.story');
 const pass=await adapter.execute({job:fact,inputs:[{type:'evidence-packet',value:packet}]});assert.deepEqual(pass.artifacts.map(a=>a.type),['fact-check-report','approved-evidence']);assert.equal(pass.reviewRequired,false);
 const block={...report,reportId:'report:2',decision:'block',checks:[{...report.checks[0],decision:'conflicted'}]};const blocked=await new ModelRuntimeAdapter({registry,provider:new FakeProvider({report:block,approvedEvidence:null})}).execute({job:fact,inputs:[{type:'evidence-packet',value:packet}]});assert.equal(blocked.reviewRequired,true);assert.deepEqual(blocked.artifacts.map(a=>a.type),['fact-check-report']);
});

test('editorial writer cannot attach unapproved claims or evidence',async()=>{
 const draft={draftId:'draft:1',title:'Result',dek:'Verified result.',body:'Athlete A won.',claimIds:['claim:404'],sourceRefs:[url],seo:{title:'Result',description:'Verified result.'},internalLinks:[]};
 const adapter=new ModelRuntimeAdapter({registry,provider:new FakeProvider(draft)});await assert.rejects(()=>adapter.execute({job:job('editorial.article'),inputs:[{type:'approved-evidence',value:approved}]}),/MODEL_SCHEMA_ENUM_INVALID|DRAFT_CLAIM_NOT_APPROVED/);
});

test('visual director can only use media present in verified-media inputs and cannot bypass named-person gates',async()=>{
 const draft={draftId:'draft:1',title:'Result',dek:'Verified result.',body:'Athlete A won.',claimIds:['claim:1'],sourceRefs:[url],seo:{title:'Result',description:'Verified result.'},internalLinks:[]};
 const media={mediaId:'photo:1',athleteRef:'athlete:a',identityReviewed:true,rightsReviewed:true,approvals:['identity-reviewed','rights-reviewed'],sourceRefs:['https://example.org/photo.jpg'],credit:'Example / Photographer'};
 const pkg={packageId:'visual:1',draftId:'draft:1',namedPersonMedia:true,media:[{mediaRef:'media:photo:1',identityReviewed:true,rightsReviewed:true,credit:media.credit}]};
 const adapter=new ModelRuntimeAdapter({registry,provider:new FakeProvider(pkg)});
 await assert.rejects(()=>adapter.execute({job:job('visual.article',{namedPersonMedia:false}),inputs:[{type:'article-draft',value:draft},{type:'verified-media',value:media}]}),/VISUAL_PERSON_MEDIA_WITHOUT_NAMED_PERSON_GATE/);
});

test('AgentRuntime executes an enabled model worker and records only bounded run metadata in audit',async()=>{
 const research=job('research.story',{},[url]);const adapter=new ModelRuntimeAdapter({registry,provider:new FakeProvider(packet)});const runtime=new AgentRuntime({registry,modelRuntime:adapter});runtime.enqueue(research);
 const result=await runtime.executeModel(research.jobId);assert.equal(result.job.status,'succeeded');assert.equal(result.job.outputs.length,1);const audit=result.job.auditTrail.find(x=>x.event==='model-run-completed');assert.equal(audit.agentId,'research');assert.equal(audit.model,'fake-model');assert.ok(!('output' in audit));
});

test('OpenAI Responses provider uses strict text.format schema without storing responses',async()=>{
 let requestBody=null;const fetchImpl=async(_url,options)=>{requestBody=JSON.parse(options.body);return {ok:true,status:200,json:async()=>({id:'resp_test',model:'model-test',status:'completed',output:[{type:'message',content:[{type:'output_text',text:'{"ok":true}'}]}],usage:{input_tokens:5,output_tokens:3,total_tokens:8}})}};
 const provider=new OpenAIResponsesProvider({apiKey:'test-key',models:{balanced:'model-test'},fetchImpl});const response=await provider.invoke({modelProfile:'balanced',instructions:'Return JSON.',input:{x:1},schema:{name:'test_schema',schema:{type:'object',additionalProperties:false,properties:{ok:{type:'boolean'}},required:['ok']}},maxOutputTokens:100,metadata:{job_id:'job:1'}});
 assert.deepEqual(response.output,{ok:true});assert.equal(requestBody.store,false);assert.equal(requestBody.text.format.type,'json_schema');assert.equal(requestBody.text.format.strict,true);assert.equal(requestBody.model,'model-test');assert.equal(JSON.stringify(requestBody).includes('test-key'),false);
});
