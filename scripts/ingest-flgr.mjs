// Read-only semantic contract monitor for the official FLGR Results calendar.
// It never writes sports data. The scheduled Winter Sports Sync process performs reviewed comparisons.
import {mkdirSync,writeFileSync} from 'node:fs';
import {fetchOfficialHtmlFirstAvailable} from './lib/fetch-official.mjs';
import {parseFlgrCalendar,parseFlgrCompetition,FLGR_PARSER_VERSION} from './lib/parse-flgr.mjs';
mkdirSync('artifacts',{recursive:true});
const officialHosts=['flgr-results.ru','www.flgr-results.ru'];
const candidates=path=>officialHosts.map(host=>'https://'+host+path);
try{
 const {html,...calendarProvenance}=await fetchOfficialHtmlFirstAvailable(candidates('/calendar'));
 const stages=parseFlgrCalendar(html).filter(s=>s.start_date>='2026-10-01'&&s.start_date<='2027-05-31');
 if(stages.length<5)throw new Error('FLGR_2627_STAGE_COVERAGE_LOW');
 const details=[];
 for(const stage of stages.slice(0,12)){
   const {html:detailHtml,...provenance}=await fetchOfficialHtmlFirstAvailable(candidates('/results/'+stage.event_id));
   const parsed=parseFlgrCompetition(detailHtml,{sourceUrl:provenance.sourceUrl});
   details.push({stage,provenance,metadata:parsed.metadata,counts:parsed.counts,raceCodes:parsed.competitionRows.map(r=>({code:r.code,date:r.date,status:r.status,change_note:r.change_note}))});
 }
 const report={ok:true,mode:'semantic_contract_read_only',parserVersion:FLGR_PARSER_VERSION,imported:false,calendarProvenance,stageCount:stages.length,stages:details};
 writeFileSync('artifacts/flgr-official-contract.json',JSON.stringify(report,null,2));console.log(JSON.stringify({ok:true,stageCount:stages.length,checked:details.length,parserVersion:FLGR_PARSER_VERSION,calendarSource:calendarProvenance.sourceUrl,fallbackUsed:calendarProvenance.fallbackUsed,imported:false},null,2));
}catch(error){
 const report={ok:false,mode:'semantic_contract_read_only',parserVersion:FLGR_PARSER_VERSION,imported:false,checkedAt:new Date().toISOString(),error:error.code||error.message,attemptedSourceUrls:error.attemptedSourceUrls||null};
 writeFileSync('artifacts/flgr-official-contract.json',JSON.stringify(report,null,2));console.error(JSON.stringify(report));process.exitCode=1;
}
