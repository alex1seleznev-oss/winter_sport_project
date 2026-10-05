import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {getAgent} from './registry.mjs';

const MODES=new Set(['github-action','local-command','internal','model-runtime','deterministic-qa','deterministic-publisher']);

export function loadWorkers({root=process.cwd(),registry,validatePaths=true}={}){
 const cfg=JSON.parse(readFileSync(resolve(root,'config/agents/workers.json'),'utf8'));
 assertWorkers(cfg,{root,registry,validatePaths});return cfg;
}

export function assertWorkers(cfg,{root=process.cwd(),registry,validatePaths=true}={}){
 if(!cfg||cfg.version<1||!cfg.workers)throw new Error('WORKER_CONFIG_INVALID');
 if(registry){
  const agentIds=new Set(registry.agents.map(a=>a.id));
  for(const id of Object.keys(cfg.workers))if(!agentIds.has(id))throw new Error(`WORKER_UNKNOWN_AGENT:${id}`);
  for(const id of agentIds)if(!cfg.workers[id])throw new Error(`WORKER_MISSING:${id}`);
 }
 for(const [id,w] of Object.entries(cfg.workers)){
  if(typeof w.enabled!=='boolean'||!MODES.has(w.mode))throw new Error(`WORKER_INVALID:${id}`);
  if(validatePaths&&w.workflow&&!existsSync(resolve(root,w.workflow)))throw new Error(`WORKER_WORKFLOW_MISSING:${id}`);
  if(validatePaths&&w.entrypoint&&!existsSync(resolve(root,w.entrypoint)))throw new Error(`WORKER_ENTRYPOINT_MISSING:${id}`);
  if(w.mode==='local-command'&&(!Array.isArray(w.commands)||w.commands.length===0))throw new Error(`WORKER_COMMANDS_MISSING:${id}`);
  if(registry&&w.mode==='model-runtime'&&getAgent(registry,id).productionWrite)throw new Error(`MODEL_RUNTIME_PRODUCTION_WRITE_FORBIDDEN:${id}`);
  if(registry&&w.mode==='deterministic-qa'&&getAgent(registry,id).id!=='qa')throw new Error(`DETERMINISTIC_QA_AGENT_INVALID:${id}`);
 }
 if(cfg.workers.publisher?.enabled===true)throw new Error('PUBLISHER_MUST_START_DISABLED');
 return true;
}

export function workerForAgent(cfg,registry,agentId){getAgent(registry,agentId);const worker=cfg.workers[agentId];if(!worker)throw new Error(`WORKER_NOT_FOUND:${agentId}`);return worker}
