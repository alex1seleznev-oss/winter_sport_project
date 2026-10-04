import {loadAgentRegistry} from '../../lib/agents/registry.mjs';
import {buildEditorialPipeline,buildPhotoPipeline,assertPipeline} from '../../lib/agents/pipelines.mjs';

const registry=loadAgentRegistry();const mode=process.argv[2]||'editorial';
const graph=mode==='photo'?buildPhotoPipeline({registry,athleteRef:'athlete:dry-run'}):buildEditorialPipeline({registry,eventRef:'event:dry-run',sourceRefs:['https://example.org/dry-run'],namedPersonMedia:true});
const summary=assertPipeline(graph);
console.log(JSON.stringify({dryRun:true,mode,summary,jobs:graph.map(j=>({jobId:j.jobId,type:j.type,agentId:j.agentId,dependencies:j.dependencies,modelProfile:registry.agents.find(a=>a.id===j.agentId)?.modelProfile}))},null,2));
