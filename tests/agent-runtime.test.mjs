import test from 'node:test';import assert from 'node:assert/strict';
import {AgentRuntime} from '../lib/agents/runtime.mjs';
import {loadAgentRegistry} from '../lib/agents/registry.mjs';
import {createJob} from '../lib/agents/contracts.mjs';
import {routeJob} from '../lib/agents/router.mjs';
import {buildEditorialPipeline} from '../lib/agents/pipelines.mjs';

const registry=loadAgentRegistry();

test('runtime exposes existing Media Watch as a bounded GitHub Action worker',()=>{const runtime=new AgentRuntime({registry});const job=routeJob(createJob({type:'source.collect',agentId:'orchestrator',inputRefs:['source:official']}),registry);runtime.enqueue(job);const d=runtime.descriptor(job.jobId);assert.equal(d.dispatch.kind,'github-action');assert.equal(d.dispatch.workflow,'.github/workflows/public-media-watch.yml');assert.equal(runtime.claim(job.jobId).status,'running')});
test('model specialists are enabled through the guarded model runtime adapter',()=>{const runtime=new AgentRuntime({registry});const graph=buildEditorialPipeline({registry,eventRef:'event:runtime'});runtime.enqueueMany(graph);const research=graph[0];const d=runtime.descriptor(research.jobId);assert.equal(d.dispatch.kind,'model-runtime');assert.equal(d.dispatch.enabled,true);assert.equal(runtime.claim(research.jobId).status,'running')});
test('QA has deterministic command descriptor and no model budget',()=>{const runtime=new AgentRuntime({registry});const job=routeJob(createJob({type:'qa.release',agentId:'orchestrator',inputRefs:['release:test']}),registry);runtime.enqueue(job);const d=runtime.descriptor(job.jobId);assert.equal(d.dispatch.kind,'local-command');assert.ok(d.dispatch.commands.includes('npm test'));assert.equal(d.modelProfile,'deterministic')});
test('publisher stays disabled even after publication gates are approved',()=>{const runtime=new AgentRuntime({registry});const job=routeJob(createJob({type:'publish.release',agentId:'orchestrator',inputRefs:['release:test']}),registry);runtime.enqueue(job);runtime.approve(job.jobId,'fact-check-passed');runtime.approve(job.jobId,'qa-passed');assert.equal(runtime.planReady()[0].agentId,'publisher');assert.throws(()=>runtime.claim(job.jobId),/WORKER_DISABLED:publisher/)});
