// Diagnostic only: fixed public official URLs; no secrets, proxies or DB writes.
import {lookup} from 'node:dns/promises';
import {spawnSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {fetchOfficialHtml} from './lib/fetch-official.mjs';
const urls=['https://flgr-results.ru/calendar','https://www.flgr-results.ru/calendar','https://flgr.ru/'];
function detail(error,depth=0){if(!error||depth>3)return null;return {name:error.name,code:error.code,message:error.message,cause:detail(error.cause,depth+1),errors:error.errors?.slice(0,4).map(e=>detail(e,depth+1))};}
const checks=[];
for(const url of urls){
 const entry={url};
 try{entry.dns=await lookup(new URL(url).hostname,{all:true});}catch(error){entry.dnsError=detail(error);}
 try{const {html,...provenance}=await fetchOfficialHtml(url);entry.node={ok:true,...provenance};}catch(error){entry.node={ok:false,error:detail(error)};}
 checks.push(entry);
}
const curl=spawnSync('curl',['--silent','--show-error','--proto','=https','--connect-timeout','10','--max-time','20','--max-filesize','2097152','--output',process.platform==='win32'?'NUL':'/dev/null','--write-out','%{http_code} %{ssl_verify_result} %{remote_ip} %{content_type}','https://flgr-results.ru/calendar'],{encoding:'utf8',timeout:25000,maxBuffer:65536});
const report={checkedAt:new Date().toISOString(),node:process.version,platform:process.platform,systemCA:process.env.NODE_USE_SYSTEM_CA==='1',mode:'read_only_transport_diagnostic',databaseWrites:false,tlsVerification:'required',checks,curl:{exitCode:curl.status,summary:curl.stdout?.trim(),error:curl.stderr?.slice(0,4000)}};
mkdirSync('artifacts',{recursive:true});writeFileSync(`artifacts/flgr-transport-${process.platform}-${report.systemCA?'system':'bundled'}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
