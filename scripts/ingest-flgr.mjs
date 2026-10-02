// Read-only source reachability. HTML byte counts are NOT race results or evidence of semantic verification.
const base='https://www.flgr-results.ru';
async function check(path){const url=base+path;try{const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{'user-agent':'WinterSportsHub/1.1 discovery'}});const status=response.status;await response.body?.cancel();return {url,httpStatus:status,reachable:response.ok}}catch{return {url,httpStatus:null,reachable:false}}}
const checks=await Promise.all([check('/athletes'),check('/results')]);
console.log(JSON.stringify({source:'FLGR Results',mode:'reachability_only',checks,parserConfigured:false,imported:false},null,2));
if(checks.some(c=>!c.reachable))process.exitCode=1;
