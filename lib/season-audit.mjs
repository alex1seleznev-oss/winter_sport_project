import {validDate,safeHttpsUrl} from './domain.mjs';
const normalized=v=>String(v??'').normalize('NFKC').toLowerCase().replaceAll('ё','е').replace(/[–—]/g,'-').replace(/\s+/g,' ').trim();
export function auditSeason(races,competitions){
 const index=new Map(competitions.map(c=>[c.id,c]));const identities=new Map();const issues=[];
 for(const r of races){
  if(!safeHttpsUrl(r.source_url)||!r.verified_at)issues.push({code:'missing_provenance',eventId:r.id});
  if(!validDate(r.event_date))issues.push({code:'invalid_date',eventId:r.id});
  const c=index.get(r.competition_id);
  if(!c)issues.push({code:'stage_not_in_snapshot',eventId:r.id});
  else if(r.sport!==c.sport||r.scope!==c.scope||r.event_date<c.start_date||r.event_date>c.end_date)issues.push({code:'stage_mismatch',eventId:r.id});
  const key=JSON.stringify([r.competition_id,r.sport,r.scope,r.event_date,r.gender,normalized(r.discipline),normalized(r.distance)]);
  if(identities.has(key))issues.push({code:'possible_duplicate',eventId:r.id,relatedEventId:identities.get(key)});else identities.set(key,r.id);
 }
 const groups=[];
 for(const sport of ['biathlon','cross_country'])for(const scope of ['international','russia']){
  const events=races.filter(r=>r.sport===sport&&r.scope===scope),stages=competitions.filter(c=>c.sport===sport&&c.scope===scope);
  const populated=stages.filter(c=>events.some(r=>r.competition_id===c.id));
  groups.push({sport,scope,stages:stages.length,stagesWithRaces:populated.length,stageOnly:stages.length-populated.length,races:events.length,withTime:events.filter(r=>r.start_time_msk!==null).length,cancelled:events.filter(r=>r.status==='cancelled').length,tentative:events.filter(r=>r.status==='tentative'||r.status==='provisional').length});
 }
 return {season:'2026/27',groups,totals:{stages:competitions.length,races:races.length,withTime:races.filter(r=>r.start_time_msk!==null).length,structuralWarnings:issues.length},issues,scope:'Structural checks of published DB snapshot only; not current federation verification or complete-season certification'};
}
export function sourceRole(kind){return ['official_calendar','official_results','federation','official_organizer'].includes(kind)?'primary':'context'}
