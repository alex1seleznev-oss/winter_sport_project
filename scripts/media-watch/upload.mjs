import {readFileSync} from 'node:fs';
import {intakeBatches} from './intake-batches.mjs';
const packet=JSON.parse(readFileSync('artifacts/media-watch/packet.json','utf8'));
const batches=intakeBatches(packet);
if(!batches.length){console.log(JSON.stringify({ok:true,skipped:true,reason:'NO_DELTA'}));process.exit(0)}
const reqUrl=process.env.ACTIONS_ID_TOKEN_REQUEST_URL,reqToken=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
if(!reqUrl||!reqToken)throw new Error('OIDC_ENV_MISSING');
const oidc=await fetch(reqUrl+'&audience='+encodeURIComponent('winter-sports-media-intake'),{headers:{authorization:'Bearer '+reqToken}});
if(!oidc.ok)throw new Error('OIDC_TOKEN_FAILED_'+oidc.status);
const {value:token}=await oidc.json();
const endpoint='https://wmiypacyraepljalppub.supabase.co/functions/v1/media-intake';
for(const [index,items] of batches.entries()){
const body={schemaVersion:2,packetHash:packet.packetHash,workflowRunId:process.env.GITHUB_RUN_ID||null,items};
const res=await fetch(endpoint,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
const text=await res.text();if(!res.ok)throw new Error('INTAKE_FAILED_'+res.status+'_'+text.slice(0,300));
const receipt=JSON.parse(text);if(!receipt.ok||receipt.calendarWrites!==0||receipt.publishedFacts!==0)throw new Error('UNSAFE_RECEIPT');
if(receipt.seen!==items.length||receipt.written!==items.length||receipt.jobs!==items.length)throw new Error('INCOMPLETE_RECEIPT');
console.log(JSON.stringify({...receipt,batch:index+1,batches:batches.length}));
}
