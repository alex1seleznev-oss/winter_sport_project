// First controller: official FLGR programme only. No database or publication credentials.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {parseFlgrProgramme,compareProgramme,PROGRAMME_PARSER_VERSION} from './lib/flgr-programme.mjs';
import {fetchOfficialHtml} from './lib/fetch-official.mjs';
const baseline=JSON.parse(readFileSync(new URL('../config/flgr-programme-baseline.json',import.meta.url),'utf8'));
mkdirSync('artifacts',{recursive:true});
try{
 const {html,...provenance}=await fetchOfficialHtml(baseline.sourceUrl);
 const observed=parseFlgrProgramme(html);const diff=compareProgramme(baseline,observed);
 const report={ok:true,checkedAt:new Date().toISOString(),scope:'FLGR official provisional programme; compares reviewed baseline, not live database',provenance,parserVersion:PROGRAMME_PARSER_VERSION,programmeSlots:observed.rows.length,...diff,databaseWrites:0,publicationWrites:0,queueDestination:'review artifact; database staging requires trusted operator'};
 writeFileSync('artifacts/programme-controller.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({ok:true,slots:observed.rows.length,changes:diff.changes.length,fingerprint:diff.fingerprint,databaseWrites:0}));
 if(diff.requiresAttention){console.error('VERIFIED_SOURCE_DIFF_REQUIRES_REVIEW: see immutable artifact; no calendar changes applied');process.exitCode=1}
}catch(e){writeFileSync('artifacts/programme-controller.json',JSON.stringify({ok:false,sourceUrl:baseline.sourceUrl,parserVersion:PROGRAMME_PARSER_VERSION,error:e.message,checkedAt:new Date().toISOString(),databaseWrites:0,publicationWrites:0},null,2));console.error(e.message);process.exitCode=1}
