// Read-only semantic contract monitor. Never imports or publishes sports data.
import {mkdirSync,writeFileSync} from 'node:fs';
import {load} from 'cheerio';
import {fetchOfficialHtml,describeSourceError} from './lib/fetch-official.mjs';
import {parseFlgrCalendar,parseFlgrCompetition,FLGR_PARSER_VERSION} from './lib/parse-flgr.mjs';
mkdirSync('artifacts',{recursive:true});
const calendarUrl='https://flgr-results.ru/calendar';
let currentUrl=calendarUrl,lastDocument=null;
try{
 const {html,...calendarProvenance}=await fetchOfficialHtml(calendarUrl);
 lastDocument={html,provenance:calendarProvenance};
 const stages=parseFlgrCalendar(html).filter(s=>s.start_date>='2026-10-01'&&s.start_date<='2027-05-31');
 if(stages.length<5)throw new Error('FLGR_2627_STAGE_COVERAGE_LOW');
 const details=[];
 for(const stage of stages.slice(0,12)){
   currentUrl='https://flgr-results.ru/results/'+stage.event_id;
   lastDocument=null;
   const {html:detailHtml,...provenance}=await fetchOfficialHtml(currentUrl);
   lastDocument={html:detailHtml,provenance};
   const parsed=parseFlgrCompetition(detailHtml,{sourceUrl:currentUrl});
   details.push({stage,provenance,metadata:parsed.metadata,counts:parsed.counts,raceCodes:parsed.competitionRows.map(r=>({code:r.code,date:r.date,status:r.status,change_note:r.change_note}))});
 }
 const report={ok:true,mode:'semantic_contract_read_only',parserVersion:FLGR_PARSER_VERSION,imported:false,calendarProvenance,stageCount:stages.length,stages:details};
 writeFileSync('artifacts/flgr-official-contract.json',JSON.stringify(report,null,2));console.log(JSON.stringify({ok:true,stageCount:stages.length,checked:details.length,parserVersion:FLGR_PARSER_VERSION,imported:false},null,2));
}catch(error){
 const report={ok:false,mode:'semantic_contract_read_only',parserVersion:FLGR_PARSER_VERSION,imported:false,checkedAt:new Date().toISOString(),sourceUrl:currentUrl,error:error.code||error.message,failure:describeSourceError(error)};
 if(lastDocument){
   const $=load(lastDocument.html);$('script,style,noscript,template').remove();
   const rows=$('tr').toArray().slice(0,60).map(tr=>({cells:$(tr).find('th,td').toArray().map(td=>$(td).text().replace(/\s+/gu,' ').trim()),links:$(tr).find('a[href]').toArray().map(a=>({text:$(a).text().trim(),href:$(a).attr('href')}))}));
   writeFileSync('artifacts/flgr-failed-document-dom.json',JSON.stringify({provenance:lastDocument.provenance,heading:$('h1').first().text(),rows},null,2));
 }
 writeFileSync('artifacts/flgr-official-contract.json',JSON.stringify(report,null,2));console.error(JSON.stringify(report));process.exitCode=1;
}
