import {createJob,validateJob} from '../../lib/agents/contracts.mjs';
import {loadAgentRegistry} from '../../lib/agents/registry.mjs';
import {routeJob,canDispatch} from '../../lib/agents/router.mjs';

const type=process.argv[2]||'research.topic';
const registry=loadAgentRegistry();
const initial=createJob({type,requestedBy:'cli-dry-run',agentId:'orchestrator',payload:{dryRun:true},inputRefs:['project:dry-run']});
const routed=routeJob(initial,registry);validateJob(routed,{agentIds:new Set(registry.agents.map(a=>a.id))});
const decision=canDispatch(routed,{registry,statusByJobId:new Map(),approvals:[]});
console.log(JSON.stringify({dryRun:true,agent:routed.agentId,modelProfile:registry.agents.find(a=>a.id===routed.agentId)?.modelProfile,skills:registry.agents.find(a=>a.id===routed.agentId)?.skills,decision,job:routed},null,2));
