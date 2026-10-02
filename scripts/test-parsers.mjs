// Read-only live control. Historical data verifies the parser; it is never imported into 2026/27.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {parseFisDocument} from './lib/parse-fis.mjs';
import {fetchOfficialHtml} from './lib/fetch-official.mjs';
const sourceUrl='https://www.fis-ski.com/DB/general/results.html?raceid=49485&seasoncode=2026&sector=CC&sectorcode=CC';
mkdirSync('artifacts',{recursive:true});
try{
 const {html,...provenance}=await fetchOfficialHtml(sourceUrl);
 const parsed=parseFisDocument(html,{sourceUrl,expected:{raceId:'49485',season:'2026',eventDate:'2025-12-13',gender:'men',discipline:'Sprint Qualification Free'}});
 assert.ok(parsed.counts.finished>=20,'Historical control returned too few finishers');
 assert.equal(parsed.rows[0].fis_code,'3190323','Control winner identity changed: review source');
 assert.equal(parsed.rows[0].finish_time_seconds,139.83,'Control time changed: review source');
 const report={ok:true,mode:'historical_live_contract',imported:false,provenance,metadata:parsed.metadata,counts:parsed.counts};
 writeFileSync('artifacts/fis-live-contract.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(error){const report={ok:false,mode:'historical_live_contract',sourceUrl,imported:false,error:error.code||error.message,checkedAt:new Date().toISOString()};writeFileSync('artifacts/fis-live-contract.json',JSON.stringify(report,null,2));console.error(JSON.stringify(report));process.exitCode=1}
