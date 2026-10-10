import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {fetchOfficialHtml,describeSourceError} from './lib/fetch-official.mjs';
import {parseFisEventDetail,summarizeFisSessions,FIS_EVENT_DETAIL_VERSION} from './lib/parse-fis-event-detail.mjs';
import {applyReviewedFisOverrides} from './lib/apply-fis-session-overrides.mjs';

const baseline=JSON.parse(readFileSync(new URL('../data/fis-event-sessions-2627.json',import.meta.url),'utf8'));
const reviewedOverrides=JSON.parse(readFileSync(new URL('../data/fis-event-session-overrides-2627.json',import.meta.url),'utf8'));
mkdirSync('artifacts',{recursive:true});
const checks=[];
for(const rawStage of baseline.stages){
 const stage=applyReviewedFisOverrides(rawStage,reviewedOverrides);
 let provenance;
 try{
  const fetched=await fetchOfficialHtml(stage.sourceUrl);
  const {html,...metadata}=fetched;provenance=metadata;
  writeFileSync('artifacts/fis-event-'+stage.eventId+'.html',html);
  const parsed=parseFisEventDetail(html,{sourceUrl:stage.sourceUrl,expected:stage});
  const sort=rows=>[...rows].sort((a,b)=>a.codex.localeCompare(b.codex));
  const matchesBaseline=isDeepStrictEqual(sort(parsed.rows),sort(stage.rows));
  checks.push({venue:stage.venue,eventId:stage.eventId,competitionKey:stage.competitionKey,...summarizeFisSessions(parsed),ok:matchesBaseline,rows:parsed.rows,provenance,
   ...(stage.reviewOverride?{reviewOverride:stage.reviewOverride}:{}),
   ...(matchesBaseline?{}:{error:'FIS_EVENT_REVIEWED_STRUCTURE_CHANGED',expectedRows:stage.rows})});
 }catch(error){checks.push({venue:stage.venue,eventId:stage.eventId,competitionKey:stage.competitionKey,ok:false,error:error.message,failure:describeSourceError(error),...(provenance?{provenance}:{}),...(stage.reviewOverride?{reviewOverride:stage.reviewOverride}:{})});}
}
const rows=checks.flatMap(check=>check.rows||[]);
const duplicateIdentity=new Set(rows.map(row=>row.codex)).size!==rows.length||new Set(rows.map(row=>row.raceId)).size!==rows.length;
const report={checkedAt:new Date().toISOString(),parserVersion:FIS_EVENT_DETAIL_VERSION,scope:'official FIS 2026/27 WC and Tour de Ski sessions; read-only source comparison, not database publication',checks,
 totals:{stages:checks.length,rows:rows.length,qualification:rows.filter(row=>row.event.includes('Qualification')).length},duplicateIdentity,requiresAttention:duplicateIdentity||checks.some(check=>!check.ok),databaseWrites:0};
writeFileSync('artifacts/fis-event-details.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(report.requiresAttention)process.exitCode=1;
