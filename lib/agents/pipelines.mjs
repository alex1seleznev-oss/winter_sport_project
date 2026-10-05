import {createJob} from './contracts.mjs';
import {routeJob} from './router.mjs';

function routed(registry,input){return routeJob(createJob(input),registry)}

export function buildEditorialPipeline({registry,eventRef,sourceRefs=[],requestedBy='orchestrator',namedPersonMedia=false}){
 const research=routed(registry,{type:'research.story',requestedBy,agentId:'orchestrator',inputRefs:[eventRef],sourceRefs,payload:{eventRef}});
 const fact=routed(registry,{type:'fact.story',requestedBy,agentId:'orchestrator',inputRefs:[`job:${research.jobId}`],sourceRefs,dependencies:[research.jobId],payload:{eventRef}});
 const draft=routed(registry,{type:'editorial.article',requestedBy,agentId:'orchestrator',inputRefs:[`job:${fact.jobId}`],sourceRefs,dependencies:[fact.jobId],payload:{eventRef}});
 const visual=routed(registry,{type:'visual.article',requestedBy,agentId:'orchestrator',inputRefs:[`job:${draft.jobId}`],sourceRefs,dependencies:[draft.jobId,fact.jobId],payload:{eventRef,namedPersonMedia}});
 const qa=routed(registry,{type:'qa.release',requestedBy,agentId:'orchestrator',inputRefs:[`job:${fact.jobId}`,`job:${draft.jobId}`,`job:${visual.jobId}`],sourceRefs,dependencies:[fact.jobId,draft.jobId,visual.jobId],payload:{eventRef,namedPersonMedia}});
 const publish=routed(registry,{type:'publish.release',requestedBy,agentId:'orchestrator',inputRefs:[`job:${qa.jobId}`,`job:${fact.jobId}`],sourceRefs,dependencies:[qa.jobId,fact.jobId],payload:{eventRef}});
 return [research,fact,draft,visual,qa,publish];
}

export function buildPhotoPipeline({registry,athleteRef,sourceRefs=[],requestedBy='orchestrator'}){
 const scout=routed(registry,{type:'media.discover.athlete',requestedBy,agentId:'orchestrator',inputRefs:[athleteRef],sourceRefs,payload:{athleteRef}});
 const curate=routed(registry,{type:'media.curate.athlete',requestedBy,agentId:'orchestrator',inputRefs:[`job:${scout.jobId}`],sourceRefs,dependencies:[scout.jobId],payload:{athleteRef}});
 const visual=routed(registry,{type:'visual.media-review',requestedBy,agentId:'orchestrator',inputRefs:[`job:${curate.jobId}`],sourceRefs,dependencies:[curate.jobId],payload:{athleteRef,namedPersonMedia:true}});
 const qa=routed(registry,{type:'qa.media-review',requestedBy,agentId:'orchestrator',inputRefs:[`job:${visual.jobId}`],sourceRefs,dependencies:[visual.jobId],payload:{athleteRef}});
 return [scout,curate,visual,qa];
}

export function assertPipeline(graph,{maxJobs=24,maxDepth=8}={}){
 if(!Array.isArray(graph)||graph.length===0||graph.length>maxJobs)throw new Error('PIPELINE_SIZE_INVALID');
 const ids=new Set(graph.map(j=>j.jobId));if(ids.size!==graph.length)throw new Error('PIPELINE_JOB_ID_DUPLICATE');
 const byId=new Map(graph.map(j=>[j.jobId,j]));
 for(const job of graph)for(const dep of job.dependencies)if(!byId.has(dep))throw new Error(`PIPELINE_EXTERNAL_DEPENDENCY:${dep}`);
 const visiting=new Set(),done=new Set();let observedDepth=0;
 function visit(id,depth){if(depth>maxDepth)throw new Error('PIPELINE_DEPTH_EXCEEDED');observedDepth=Math.max(observedDepth,depth);if(done.has(id))return;if(visiting.has(id))throw new Error('PIPELINE_CYCLE');visiting.add(id);for(const dep of byId.get(id).dependencies)visit(dep,depth+1);visiting.delete(id);done.add(id)}
 for(const id of ids)visit(id,1);
 return {jobs:graph.length,depth:observedDepth};
}
