import {createHash} from 'node:crypto';
export const RECONCILIATION_VERSION='flgr-slots/1.0.0';
const normalize=v=>String(v??'').normalize('NFKC').toLowerCase().replace(/ё/g,'е').replace(/[-–—]/g,' ').replace(/\s+/g,' ').trim();
export function fingerprint(value){const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')}
export function raceShape(text,distance=null){
 const s=normalize(text);const is=regexp=>regexp.test(s);
 const format=is(/командн.*спринт/)?'team_sprint':is(/спринт/)?'sprint':is(/скиатлон/)?'skiathlon':is(/персьют|преследован/)?'pursuit':is(/эстафет/)?'relay':is(/масс?\s*старт/)?'mass_start':is(/стиль|(?:^|[^а-я])(?:кл|св)(?:$|[^а-я])/)?'distance':'unknown';
 const style=format==='skiathlon'?'mixed':is(/классич|(?:^|[^а-я])кл(?:$|[^а-я])/)?'classic':is(/свободн|(?:^|[^а-я])св(?:$|[^а-я])/)?'free':'unknown';
 const phase=is(/квалиф|квал\./)?'qualification':is(/финал/)?'final':'unspecified';
 const km=distance===null?null:Number(String(distance).replace(',','.').match(/\d+(?:\.\d+)?/)?.[0]??NaN);
 return {format,style,phase,distanceKm:Number.isFinite(km)?km:null};
}
export function expandProgramme(baseline,competitions){
 const stages=new Map(competitions.map(c=>[c.external_key,c]));
 return baseline.rows.flatMap(([stage,date,description])=>{
  const c=stages.get('flgr-2627-cup-'+stage);if(!c)throw new Error('RECONCILIATION_STAGE_MISSING_'+stage);
  if(date<c.start_date||date>c.end_date)throw new Error('RECONCILIATION_STAGE_DATE_CONFLICT_'+stage);
  const paired=description.match(/(?:^|[^\d])(\d+)\s*\/\s*(\d+)\s*км/i);
  const distance=paired&&paired[1]===paired[2]?paired[1]+' км':null;
  const genders=/смешанная эстафета/i.test(description)?['mixed']:['women','men'];
  return genders.map(gender=>({key:`${stage}|${date}|${gender}`,stage,competitionId:c.id,date,gender,description,distance,sourceUrl:baseline.sourceUrl,certainty:baseline.certainty}));
 });
}
function compatible(a,b){return a.format!=='unknown'&&b.format===a.format&&a.style!=='unknown'&&a.style===b.style&&(a.distanceKm===null||b.distanceKm===null||a.distanceKm===b.distanceKm)}
export function reconcileCandidate(candidate,events){
 const slot=events.filter(e=>e.competition_id===candidate.competitionId&&e.event_date===candidate.date&&e.gender===candidate.gender&&e.sport==='cross_country'&&e.scope==='russia');
 const shape=raceShape(candidate.description,candidate.distance);
 const matches=slot.filter(e=>compatible(shape,raceShape(e.discipline,e.distance)));
 const active=matches.filter(e=>e.status!=='cancelled');
 let decision='missing_detailed_programme';
 if(active.length){const phases=new Set(active.map(e=>raceShape(e.discipline,e.distance).phase));decision=active.length===1?'covered_by_existing':phases.has('qualification')&&phases.has('final')&&active.length===2?'covered_by_sessions':'ambiguous_overlap';}
 else if(matches.length)decision='matching_record_cancelled_review';else if(slot.length)decision='different_format_same_slot';
 const stageEvents=events.filter(e=>e.competition_id===candidate.competitionId);
 return {candidateKey:candidate.key,stage:candidate.stage,date:candidate.date,gender:candidate.gender,decision,matchingEventIds:matches.map(e=>e.id),sameSlotEventIds:slot.map(e=>e.id),unrelatedCancelledIds:slot.filter(e=>e.status==='cancelled'&&!matches.includes(e)).map(e=>e.id),stageHasDetails:stageEvents.length>0,mayCreate:false,reviewReason:decision.startsWith('covered_')?'Do not add another generic race':decision==='missing_detailed_programme'?'No match is not publication approval':'Official programme versions and formats require human review'};
}
export function buildReconciliation(baseline,competitions,events){
 const candidates=expandProgramme(baseline,competitions);const decisions=candidates.map(c=>reconcileCandidate(c,events));
 const relevantStages=competitions.filter(c=>c.external_key.startsWith('flgr-2627-cup-')).sort((a,b)=>a.id-b.id);
 const relevantEvents=events.filter(e=>relevantStages.some(c=>c.id===e.competition_id)).sort((a,b)=>a.id-b.id);
 return {version:RECONCILIATION_VERSION,baselineDigest:fingerprint(baseline),databaseDigest:fingerprint({competitions:relevantStages,events:relevantEvents}),candidateCount:candidates.length,decisions,counts:decisions.reduce((acc,d)=>(acc[d.decision]=(acc[d.decision]||0)+1,acc),{}),mayApply:false};
}
