import {existsSync,readFileSync} from 'node:fs';import {resolve} from 'node:path';

export function loadSkillCatalog({root=process.cwd()}={}){
 const cfg=JSON.parse(readFileSync(resolve(root,'config/agents/skill-catalog.json'),'utf8'));
 const allowlists=JSON.parse(readFileSync(resolve(root,'config/agents/skills.json'),'utf8'));
 assertSkillCatalog(cfg,{root,allowlists});return cfg;
}

export function assertSkillCatalog(cfg,{root=process.cwd(),allowlists}={}){
 if(!cfg||cfg.version<1||!Array.isArray(cfg.skills))throw new Error('SKILL_CATALOG_INVALID');
 const ids=new Set();
 for(const skill of cfg.skills){
  if(!skill.id||ids.has(skill.id))throw new Error('SKILL_CATALOG_ID_INVALID');ids.add(skill.id);
  if(!['project','official-sdk','reviewed-open-source'].includes(skill.origin))throw new Error(`SKILL_ORIGIN_INVALID:${skill.id}`);
  if(!['active','contract-only','disabled'].includes(skill.status))throw new Error(`SKILL_STATUS_INVALID:${skill.id}`);
  if(!skill.implementation||!skill.risk||!skill.review)throw new Error(`SKILL_METADATA_MISSING:${skill.id}`);
  const [scheme,value='']=skill.implementation.split(':',2);
  if(!['project','command','disabled','external'].includes(scheme))throw new Error(`SKILL_IMPLEMENTATION_SCHEME_INVALID:${skill.id}`);
  if(scheme==='project'&&!existsSync(resolve(root,value)))throw new Error(`SKILL_IMPLEMENTATION_MISSING:${skill.id}`);
  if(skill.status==='active'&&scheme==='disabled')throw new Error(`ACTIVE_SKILL_DISABLED:${skill.id}`);
  if(skill.status==='disabled'&&scheme!=='disabled')throw new Error(`DISABLED_SKILL_HAS_IMPLEMENTATION:${skill.id}`);
 }
 if(allowlists){
  const allowed=new Set(Object.values(allowlists.skills??{}).flat());
  for(const id of allowed)if(!ids.has(id))throw new Error(`ALLOWLIST_SKILL_UNCATALOGED:${id}`);
  for(const id of ids)if(!allowed.has(id))throw new Error(`CATALOG_SKILL_UNUSED:${id}`);
  for(const id of allowlists.productionMutationSkills??[]){const item=cfg.skills.find(s=>s.id===id);if(!item||item.status!=='disabled')throw new Error(`PRODUCTION_SKILL_MUST_START_DISABLED:${id}`)}
 }
 return true;
}
export function catalogEntry(cfg,id){return cfg.skills.find(s=>s.id===id)??null}
