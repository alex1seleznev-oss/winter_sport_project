// Public read-only reconciliation. Never reads private change_proposals or creates users.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {supabase} from '../lib/supabase.ts';
import {fetchOfficialHtml} from './lib/fetch-official.mjs';
import {parseFlgrCompetition} from './lib/parse-flgr.mjs';
import {buildReconciliation,raceShape} from './lib/reconcile-flgr.mjs';
const baseline=JSON.parse(readFileSync(new URL('../config/flgr-programme-baseline.json',import.meta.url),'utf8'));
mkdirSync('artifacts',{recursive:true});
const [{data:events,error:ee},{data:competitions,error:ce}]=await Promise.all([supabase.from('events').select('id,external_key,competition_id,event_date,sport,scope,gender,discipline,distance,status,source_url,updated_at').eq('sport','cross_country').eq('scope','russia').gte('event_date','2026-10-01').lte('event_date','2027-05-31').order('id'),supabase.from('competitions').select('id,external_key,start_date,end_date,status,source_url,updated_at').eq('sport','cross_country').eq('scope','russia').order('id')]);
if(ee||ce||!events||!competitions)throw new Error('PUBLIC_CALENDAR_READ_FAILED');
const reconciliation=buildReconciliation(baseline,competitions,events);
const urls=[...new Set(events.map(e=>e.source_url).filter(u=>/^https:\/\/(?:www\.|fis\.|data\.)?flgr-results\.ru\/results\/\d+$/.test(u||'')))];
const sources=[];
for(const databaseUrl of urls){try{
 const id=new URL(databaseUrl).pathname.match(/^\/results\/(\d+)$/)?.[1];const url=`https://www.flgr-results.ru/results/${id}`;
 const {html,...receipt}=await fetchOfficialHtml(url);const parsed=parseFlgrCompetition(html,{sourceUrl:url});
 const checks=events.filter(e=>e.source_url===databaseUrl).map(e=>{const code=e.external_key.match(/^flgr-2627-(\d+)$/)?.[1];const rows=parsed.competitionRows.filter(r=>r.code===code);const row=rows[0];const gender=row?.gender==='female'?'women':row?.gender==='male'?'men':row?.gender;return {eventId:e.id,code,rowCount:rows.length,dateMatches:row?.date===e.event_date,statusMatches:row?.status===e.status,genderMatches:gender===e.gender,dbShape:raceShape(e.discipline,e.distance),sourceText:row?.text??null}});
 sources.push({databaseUrl,receipt,counts:parsed.counts,checks,identityStatusChecksPass:checks.every(c=>c.rowCount===1&&c.dateMatches&&c.statusMatches&&c.genderMatches)});
}catch(error){sources.push({databaseUrl,error:error.code||error.message,networkCause:error.cause?.code||null,networkMessage:error.cause?.message||null,identityStatusChecksPass:false})}}
const report={checkedAt:new Date().toISOString(),...reconciliation,sources,publicEventCount:events.length,allSourceIdentityChecksPass:sources.length>0&&sources.every(s=>s.identityStatusChecksPass),databaseWrites:0,privateQueueRead:false,scope:'Database matching is advisory until official source identity checks pass; source failure never means cancelled races'};
writeFileSync('artifacts/flgr-reconciliation.json',JSON.stringify(report,null,2));const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
writeFileSync('artifacts/flgr-reconciliation.csv','\ufeff'+[['slot','stage','date','gender','decision','matching_ids','other_cancelled_ids'],...report.decisions.map(d=>[d.candidateKey,d.stage,d.date,d.gender,d.decision,d.matchingEventIds.join(';'),d.unrelatedCancelledIds.join(';')])].map(r=>r.map(quote).join(',')).join('\r\n'));
console.log(JSON.stringify({candidateCount:report.candidateCount,counts:report.counts,sourceChecks:report.allSourceIdentityChecksPass,databaseDigest:report.databaseDigest,databaseWrites:0,sourceErrors:sources.filter(s=>!s.identityStatusChecksPass).map(s=>({url:s.databaseUrl,error:s.error,cause:s.networkCause}))},null,2));
if(!report.allSourceIdentityChecksPass)process.exitCode=1;
