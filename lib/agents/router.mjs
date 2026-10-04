import {appendAudit,validateJob} from './contracts.mjs';
import {getAgent} from './registry.mjs';

const ROUTES=Object.freeze([
 ['source.','media-watch'],['media.discover','photo-scout'],['media.curate','media-curator'],['research.','research'],['fact.','fact-check'],['editorial.','editorial-writer'],['visual.','visual-director'],['qa.','qa'],['publish.','publisher'],['orchestrate.','orchestrator']
]);

export function agentForJobType(type){
 if(typeof type!=='string'||!type)throw new Error('JOB_TYPE_INVALID');
 const match=ROUTES.find(([prefix])=>type.startsWith(prefix));
 if(!match)throw new Error(`NO_AGENT_ROUTE:${type}`);
 return match[1];
}

export function routeJob(job,registry){
 const ids=new Set(registry.agents.map(a=>a.id));validateJob(job,{agentIds:ids});
 const agentId=agentForJobType(job.type);const agent=getAgent(registry,agentId);
 const routed={...job,agentId,maxAttempts:Math.min(job.maxAttempts,agent.maxAttempts),status:'queued'};
 return appendAudit(routed,'job-routed',{from:job.agentId,to:agentId,type:job.type});
}

export function dependenciesSatisfied(job,statusByJobId){
 return job.dependencies.every(id=>statusByJobId.get(id)==='succeeded');
}

export function requiredGates(job,registry){
 if(job.type.startsWith('publish.'))return [...registry.gates.articlePublication];
 if(job.type.startsWith('visual.')&&job.payload?.namedPersonMedia===true)return [...registry.gates.namedPersonMedia];
 return [];
}

export function canDispatch(job,{registry,statusByJobId=new Map(),approvals=[]}={}){
 const reasons=[];
 if(!dependenciesSatisfied(job,statusByJobId))reasons.push('DEPENDENCIES_NOT_SATISFIED');
 for(const gate of requiredGates(job,registry))if(!approvals.includes(gate))reasons.push(`GATE_MISSING:${gate}`);
 if(job.attempt>=job.maxAttempts)reasons.push('ATTEMPTS_EXHAUSTED');
 return {ok:reasons.length===0,reasons};
}

export function assertToolAllowed(agent,skill,registry){
 if(!(agent.skills??[]).includes(skill))throw new Error(`SKILL_NOT_ALLOWED:${agent.id}:${skill}`);
 if((registry.skillConfig.productionMutationSkills??[]).includes(skill)&&agent.id!=='publisher')throw new Error(`PRODUCTION_SKILL_FORBIDDEN:${agent.id}`);
 return true;
}
