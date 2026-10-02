// LIVE upstream contract, separate from deterministic unit tests. A failure is not a successful empty import.
import {parseFisResults} from './lib/parse-fis.mjs';
const url='https://www.fis-ski.com/DB/general/results.html?raceid=49485&seasoncode=2026&sector=CC&sectorcode=CC';
const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{'user-agent':'WinterSportsHub/1.1 source-contract-check'}});
if(!response.ok)throw new Error(`FIS_HTTP_UNAVAILABLE status=${response.status}; no parsing or writes attempted`);
const html=await response.text();
if(!/official results/i.test(html))throw new Error('FIS_DOCUMENT_CONTRACT_MISMATCH: expected results document, got another page; no data written');
const rows=parseFisResults(html);
if(rows.length<20)throw new Error(`FIS_PARSER_CONTRACT_FAILED rows=${rows.length}; historical control fixture, not current season results`);
console.log(JSON.stringify({mode:'live_contract',url,rows:rows.length,passed:true,imported:false}));
