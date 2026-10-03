// Only public numeric references, never user profiles or cached race facts.
export const SELECTION_KEY='wsh:my-season:2026-27:v1';
export const SELECTION_SEASON='2026/27';
export const MAX_STAGES=80,MAX_RACES=200;
export const emptySelection=()=>({version:1,season:SELECTION_SEASON,stages:[],races:[]});
export const validId=id=>Number.isSafeInteger(id)&&id>0&&id<1e15;
function checkedIds(value,limit){
 if(!Array.isArray(value)||value.length>limit||value.some(v=>!validId(v)))throw new Error('INVALID_SELECTION_IDS');
 return [...new Set(value)].sort((a,b)=>a-b);
}
export function decodeSelection(raw){
 if(raw===null)return {selection:emptySelection(),error:null};
 try{
  if(typeof raw!=='string'||raw.length>16384)throw new Error('INVALID_SELECTION_SIZE');
  const v=JSON.parse(raw);
  if(!v||v.version!==1||v.season!==SELECTION_SEASON||Object.keys(v).some(k=>!['version','season','stages','races'].includes(k)))throw new Error('INVALID_SELECTION_VERSION');
  return {selection:{version:1,season:SELECTION_SEASON,stages:checkedIds(v.stages,MAX_STAGES),races:checkedIds(v.races,MAX_RACES)},error:null};
 }catch{return {selection:emptySelection(),error:'invalid_saved_selection'}}
}
export function toggleSelection(selection,kind,id){
 if(!['stage','race'].includes(kind)||!validId(id))throw new Error('INVALID_SELECTION_ACTION');
 const clean=decodeSelection(JSON.stringify(selection));if(clean.error)throw new Error('INVALID_SELECTION');
 const key=kind==='stage'?'stages':'races',limit=kind==='stage'?MAX_STAGES:MAX_RACES;
 const current=clean.selection[key],has=current.includes(id);
 if(!has&&current.length>=limit)throw new Error('SELECTION_LIMIT');
 return {...clean.selection,[key]:has?current.filter(v=>v!==id):[...current,id].sort((a,b)=>a-b)};
}
export function projectSelection(selection,models){
 const wantedStages=new Set(selection.stages),wantedRaces=new Set(selection.races);
 const stages=models.filter(m=>wantedStages.has(m.competition.id));
 const availableStageIds=new Set(models.map(m=>m.competition.id));
 const all=new Map();for(const m of models)for(const r of m.races)all.set(r.id,r);
 const selected=new Map();
 for(const m of stages)for(const r of m.races)selected.set(r.id,r);
 for(const id of wantedRaces)if(all.has(id))selected.set(id,all.get(id));
 return {stages,races:[...selected.values()].sort((a,b)=>(a.event_date||'').localeCompare(b.event_date||'')||(a.start_time_msk||'99').localeCompare(b.start_time_msk||'99')||a.id-b.id),missingStages:[...wantedStages].filter(id=>!availableStageIds.has(id)),missingRaces:[...wantedRaces].filter(id=>!all.has(id))};
}
export function parseSelectionExport(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==1||!Object.hasOwn(value,'ids'))throw new Error('INVALID_EXPORT_REQUEST');
 const ids=checkedIds(value.ids,MAX_RACES);if(!ids.length)throw new Error('EMPTY_EXPORT');return ids;
}
