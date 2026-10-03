// Pure reviewed-plan builder: no credentials, network calls or database mutations.
export const FIS_SESSION_REVIEW_VERSION='fis-session-review/1.0.0';
function phase(label){
 if(!/Sprint/i.test(label))return 'other';
 return (/Team Sprint/i.test(label)?'team-':'')+(/Qualification/i.test(label)?'qualification':'final');
}
const slot=(date,gender,label)=>[date,gender,phase(label)].join('|');
function split(label){
 const match=label.match(/^(\d+(?:\.\d+)?(?:x\d+(?:\.\d+)?)?)km\s+(.+)$/);
 if(!match)throw new Error('FIS_SESSION_DISTANCE_NOT_PUBLISHED');
 return {distance:match[1]+' km',discipline:match[2]};
}
export function buildFisSessionPlan({stages,competitions,events}){
 const proposals=[],coverage=[],seen=new Set();
 for(const stage of stages){
  if(!stage.provenance?.documentSha256?.match(/^[a-f0-9]{64}$/)||!stage.provenance.fetchedAt||stage.provenance.sourceUrl!==stage.sourceUrl||stage.provenance.httpStatus!==200||stage.provenance.tlsVerified!==true)throw new Error('FIS_SESSION_EVIDENCE_REQUIRED');
  const parents=competitions.filter(c=>c.external_key===stage.competitionKey);
  if(parents.length!==1)throw new Error('FIS_SESSION_PARENT_AMBIGUOUS');
  const parent=parents[0];
  if(parent.sport!=='cross_country'||parent.scope!=='international')throw new Error('FIS_SESSION_PARENT_SCOPE');
  const current=events.filter(e=>e.competition_id===parent.id);
  const slots=new Map();
  for(const event of current){const key=slot(event.event_date,event.gender,event.discipline);if(slots.has(key))throw new Error('FIS_SESSION_DATABASE_DUPLICATE_SLOT');slots.set(key,event);}
  const sourceSlots=new Set();
  for(const row of stage.rows){
   const key=slot(row.date,row.gender,row.event);
   if(sourceSlots.has(key)||seen.has(row.codex))throw new Error('FIS_SESSION_SOURCE_DUPLICATE_IDENTITY');
   sourceSlots.add(key);seen.add(row.codex);
   const existing=slots.get(key);
   if(phase(row.event)==='other'){
    if(!existing)throw new Error('FIS_SESSION_UNRELATED_MISSING_ROW');
    continue;
   }
   if(row.cancelled||row.localTime)throw new Error('FIS_SESSION_SEPARATE_STATUS_OR_TIME_REVIEW');
   if(!existing&&!/Qualification/.test(row.event))throw new Error('FIS_SESSION_FINAL_MISSING');
   const final=slots.get(slot(row.date,row.gender,row.event.replace('Qualification ','')));
   if(!final)throw new Error('FIS_SESSION_FINAL_MISSING');
   if(!['scheduled','tentative'].includes(final.status))throw new Error('FIS_SESSION_FINAL_REVIEW_REQUIRED');
   const {discipline,distance}=split(row.event);
   const marker='FIS 2026/27: Codex '+row.codex+', race ID '+row.raceId+'.';
   const sourceLabel='Официальное название FIS: '+row.event+'.';
   const note=marker+' '+sourceLabel+' https://www.fis-ski.com/DB/general/results.html?sectorcode=CC&raceid='+row.raceId+' Точное время старта FIS пока не опубликовано; программа может измениться.';
   const notes=existing?.notes?.includes(marker)?existing.notes:[existing?.notes,note].filter(Boolean).join('\n');
   const value={external_key:existing?.external_key||'fis-2027-cc-codex-'+row.codex,competition_id:parent.id,event_date:row.date,start_time_msk:existing?.start_time_msk??null,sport:'cross_country',scope:'international',gender:row.gender,series:parent.series,location:parent.location,country:parent.country,discipline,distance,stage:final.stage,status:existing?.status||final.status,source_url:stage.sourceUrl,source_feed_id:2,source_updated_at:null,source_confidence:5,notes};
   const changed=!existing||Object.entries(value).some(([key,value])=>existing[key]!==value);
   if(changed)proposals.push({operation:existing?'update':'insert',previous:existing||null,value,evidence:{sourceUrl:stage.sourceUrl,fetchedAt:stage.provenance.fetchedAt,documentSha256:stage.provenance.documentSha256,sourceAuthority:5,sourcePublishedAt:null,codex:row.codex,raceId:row.raceId,sourceLabel:row.event},dedupeKey:'fis-session-review-2027-'+row.codex});
  }
  if(current.some(e=>!sourceSlots.has(slot(e.event_date,e.gender,e.discipline))))throw new Error('FIS_SESSION_UNEXPECTED_DATABASE_ROW');
  coverage.push({competitionKey:stage.competitionKey,sourceRows:stage.rows.length,databaseRows:current.length});
 }
 return {parserVersion:FIS_SESSION_REVIEW_VERSION,sourceRows:coverage.reduce((n,c)=>n+c.sourceRows,0),insertions:proposals.filter(p=>p.operation==='insert').length,updates:proposals.filter(p=>p.operation==='update').length,proposals,coverage};
}
