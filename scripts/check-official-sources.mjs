// Reachability/document diagnostics only, without secrets or database mutations.
import {mkdirSync,writeFileSync} from 'node:fs';
import {fetchOfficialHtml} from './lib/fetch-official.mjs';
const sources=[['IBU','https://www.biathlonworld.com/calendar?CupLevel=1&SeasonId=2627'],['FIS','https://www.fis-ski.com/DB/cross-country/calendar-results.html?categorycode=WC&seasoncode=2027&sectorcode=CC'],['СБР','https://biathlonrus.com/'],['ФЛГР','https://flgr.ru/'],['FLGR Results','https://flgr-results.ru/calendar']];
const checks=await Promise.all(sources.map(async([name,url])=>{try{const {html,...provenance}=await fetchOfficialHtml(url);return {name,...provenance,reachable:true,parsedSchedule:false,imported:false}}catch(error){return {name,url,reachable:false,error:error.message,imported:false}}}));
const report={checkedAt:new Date().toISOString(),mode:'read_only_document_health',ok:checks.every(c=>c.reachable),privilegedPipelines:'paused_pending_review',checks};
mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/official-source-health.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.ok)process.exitCode=1;
