import {mkdirSync,writeFileSync} from 'node:fs';
import {fetchOfficialHtml} from './lib/fetch-official.mjs';
import {parseFisEventDetail,summarizeFisSessions,FIS_EVENT_DETAIL_VERSION} from './lib/parse-fis-event-detail.mjs';

const stages=[
 ['Ruka',63002,8],['Trondheim',63003,8],['Davos',63004,10],['Les Rousses',63001,8],
 ['Oberstdorf',63005,4],['Val di Fiemme',63006,8],['Engadin',63007,7],['Toblach',63008,8],
 ['Lahti',63009,8],['Oslo',63010,2],['Drammen',63011,4],['Ulricehamn',63012,8]
];
mkdirSync('artifacts',{recursive:true});
const checks=[];
for(const [venue,eventid,expectedRows] of stages){
 const url=`https://www.fis-ski.com/DB/general/event-details.html?eventid=${eventid}&seasoncode=2027&sectorcode=CC`;
 try{
  const {html,...provenance}=await fetchOfficialHtml(url);
  const parsed=parseFisEventDetail(html,{sourceUrl:url});
  const summary=summarizeFisSessions(parsed);
  checks.push({venue,eventid,expectedRows,...summary,ok:summary.rows===expectedRows,provenance});
 }catch(error){checks.push({venue,eventid,expectedRows,ok:false,error:error.message});}
}
const report={checkedAt:new Date().toISOString(),parserVersion:FIS_EVENT_DETAIL_VERSION,scope:'official FIS 2026/27 event-detail session structure; read-only',checks,requiresAttention:checks.some(x=>!x.ok),databaseWrites:0};
writeFileSync('artifacts/fis-event-details.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(report.requiresAttention)process.exitCode=1;
