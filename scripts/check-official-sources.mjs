// Reachability/document diagnostics only, without secrets or database mutations.
import {mkdirSync,writeFileSync} from 'node:fs';
import {fetchOfficialHtml} from './lib/fetch-official.mjs';

const sources=[
  ['IBU',['https://www.biathlonworld.com/calendar?CupLevel=1&SeasonId=2627']],
  ['FIS',['https://www.fis-ski.com/DB/cross-country/calendar-results.html?categorycode=WC&seasoncode=2027&sectorcode=CC']],
  ['СБР',['https://biathlonrus.com/']],
  ['ФЛГР',['https://flgr.ru/']],
  ['FLGR Results',['https://flgr-results.ru/calendar','https://www.flgr-results.ru/calendar']]
];

async function probe(name,urls){
  const attempts=[];
  for(const url of urls){
    try{
      const {html,...provenance}=await fetchOfficialHtml(url);
      return {name,canonicalUrl:urls[0],transportUrl:provenance.sourceUrl,fallbackUsed:url!==urls[0],...provenance,reachable:true,parsedSchedule:false,imported:false};
    }catch(error){
      attempts.push({url,error:error?.message||String(error),causeCode:error?.cause?.code||null,cause:error?.cause?.message||null});
    }
  }
  return {name,canonicalUrl:urls[0],reachable:false,attempts,imported:false};
}

const checks=await Promise.all(sources.map(([name,urls])=>probe(name,urls)));
const report={checkedAt:new Date().toISOString(),mode:'read_only_document_health',ok:checks.every(c=>c.reachable),privilegedPipelines:'paused_pending_review',checks};
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/official-source-health.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(!report.ok)process.exitCode=1;
