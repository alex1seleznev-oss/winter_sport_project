// Explicit source discovery only. No writes until season/event identity and result status are verified.
import {parseFisResults} from './lib/parse-fis.mjs';
const source=process.env.FIS_RESULT_URL;
if(!source){console.log(JSON.stringify({source:'FIS results',mode:'discovery',status:'not_configured',reason:'Explicit FIS_RESULT_URL required; no historical result is substituted',imported:false}));process.exit(0)}
const url=new URL(source);
if(url.protocol!=='https:'||url.hostname!=='www.fis-ski.com'||url.pathname!=='/DB/general/results.html'||!/^\d+$/.test(url.searchParams.get('raceid')||''))throw new Error('FIS_SOURCE_NOT_ALLOWED');
const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{'user-agent':'WinterSportsHub/1.1 discovery'}});
if(!response.ok)throw new Error(`FIS_HTTP_UNAVAILABLE ${response.status}`);
const html=await response.text();const rows=parseFisResults(html);
if(!rows.length)throw new Error('FIS_RESULT_CONTRACT_FAILED: no rows; no writes attempted');
console.log(JSON.stringify({source:'FIS',url:url.href,mode:'discovery',rows:rows.length,seasonVerification:'required',resultFinality:'requires_document_check',imported:false},null,2));
