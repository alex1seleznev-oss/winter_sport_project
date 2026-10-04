import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const REGISTRY_PATH='config/agents/registry.json';
const SKILLS_PATH='config/agents/skills.json';

export function loadAgentRegistry({root=process.cwd()}={}){
 const registry=JSON.parse(readFileSync(resolve(root,REGISTRY_PATH),'utf8'));
 const skillConfig=JSON.parse(readFileSync(resolve(root,SKILLS_PATH),'utf8'));
 assertRegistry(registry,skillConfig);
 const skills=new Map(Object.entries(skillConfig.skills));
 return {...registry,skillConfig,agents:registry.agents.map(agent=>({...agent,skills:skills.get(agent.id)??[]}))};
}

export function assertRegistry(registry,skillConfig){
 if(!registry||registry.version<1||!Array.isArray(registry.agents)||registry.agents.length<1)throw new Error('AGENT_REGISTRY_INVALID');
 const ids=new Set();let publisherCount=0;
 for(const agent of registry.agents){
  if(!agent.id||ids.has(agent.id))throw new Error('AGENT_ID_INVALID_OR_DUPLICATE');ids.add(agent.id);
  if(typeof agent.productionWrite!=='boolean'||typeof agent.reviewWrite!=='boolean')throw new Error(`AGENT_PERMISSION_INVALID:${agent.id}`);
  if(!['economy','balanced','expert','deterministic'].includes(agent.modelProfile))throw new Error(`AGENT_MODEL_PROFILE_INVALID:${agent.id}`);
  if(!Number.isInteger(agent.maxAttempts)||agent.maxAttempts<1||agent.maxAttempts>10)throw new Error(`AGENT_RETRY_INVALID:${agent.id}`);
  if(agent.productionWrite){publisherCount++;if(agent.id!=='publisher')throw new Error(`NON_PUBLISHER_PRODUCTION_WRITE:${agent.id}`)}
  if(!Array.isArray(skillConfig.skills?.[agent.id]))throw new Error(`AGENT_SKILLS_MISSING:${agent.id}`);
 }
 if(publisherCount!==1)throw new Error('PUBLISHER_COUNT_INVALID');
 for(const skill of skillConfig.productionMutationSkills??[]){
  const owners=registry.agents.filter(a=>(skillConfig.skills[a.id]??[]).includes(skill));
  if(owners.length!==1||owners[0].id!=='publisher')throw new Error(`PRODUCTION_SKILL_OWNER_INVALID:${skill}`);
 }
 const expected=['identity-reviewed','rights-reviewed'];for(const gate of expected)if(!registry.gates?.namedPersonMedia?.includes(gate))throw new Error(`MEDIA_GATE_MISSING:${gate}`);
 for(const gate of ['fact-check-passed','qa-passed'])if(!registry.gates?.articlePublication?.includes(gate))throw new Error(`PUBLICATION_GATE_MISSING:${gate}`);
 return true;
}

export function getAgent(registry,id){const agent=registry.agents.find(a=>a.id===id);if(!agent)throw new Error(`AGENT_NOT_FOUND:${id}`);return agent}
