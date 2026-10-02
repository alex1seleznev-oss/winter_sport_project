// A one-shot GET diagnostic. Never creates users, changes auth, uploads or writes sports data.
import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {load} from 'cheerio';
const report={checkedAt:new Date().toISOString(),fis:null,auth:null};
try {
 const source='https://www.fis-ski.com/DB/general/results.html?raceid=49485&seasoncode=2026&sector=CC&sectorcode=CC';
 const res=await fetch(source,{redirect:'error',signal:AbortSignal.timeout(20000),headers:{'user-agent':'WinterSportsHub/1.2 source-contract-diagnostic'}});
 const html=await res.text();const $=load(html);
 $('script,style,noscript').remove();
 const rows=$('a.table-row').toArray().filter(el=>/competitorid=/.test($(el).attr('href')||''));
 report.fis={source,httpStatus:res.status,contentType:res.headers.get('content-type'),bytes:Buffer.byteLength(html),sha256:createHash('sha256').update(html).digest('hex'),title:$('title').text(),tableRows:rows.length,sampleRows:rows.slice(0,2).map(el=>$.html(el)),resultContainers:$('[id]').toArray().filter(el=>/result/i.test($(el).attr('id')||'')).map(el=>({tag:el.tagName,id:$(el).attr('id'),class:$(el).attr('class')})),h1:$('h1').text(),resultHeadings:$('h2,h3,h4').toArray().map(el=>$(el).text().trim()).filter(t=>/results|not start|finish|disqual/i.test(t)),dates:$('time').toArray().map(el=>({text:$(el).text(),datetime:$(el).attr('datetime')}))};
} catch(e){report.fis={error:String(e.message)}}
try {
 const response=await fetch('https://wmiypacyraepljalppub.supabase.co/auth/v1/settings',{redirect:'error',signal:AbortSignal.timeout(15000),headers:{apikey:'sb_publishable__26areTx9RGKKlrakjV9lg_3IP9DwSQ'}});
 if(!response.ok)report.auth={httpStatus:response.status,readable:false};
 else {const data=await response.json();report.auth={httpStatus:response.status,readable:true,disable_signup:data.disable_signup??null,external_email:data.external?.email??null,external_phone:data.external?.phone??null,anonymous_users_enabled:data.external?.anonymous_users??null,autoconfirm:data.mailer_autoconfirm??null};}
} catch(e){report.auth={error:String(e.message)}}
mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/upstream-inspection.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
