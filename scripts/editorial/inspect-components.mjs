// Check source labels before interpreting non-additive analytical times.
import {mkdirSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';
const base='https://biathlonresults.com/modules/sportapi/api/',id='BT2526SWRLCP09SMMS',out='artifacts/component-research';mkdirSync(out,{recursive:true});
const report=[];
for(const [method,params] of [['RaceDetails',{RaceId:id}],['AnalyticResults',{RaceId:id,TypeId:'CRST'}],['AnalyticResults',{RaceId:id,TypeId:'RNGT'}],['AnalyticResults',{RaceId:id,TypeId:'STTM'}]]){
 const url=base+method+'?'+new URLSearchParams(params);try{const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error('HTTP_'+r.status);const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length>2*1024*1024)throw new Error('SIZE_LIMIT');const data=JSON.parse(bytes.toString('utf8'));report.push({url,fetchedAt:new Date().toISOString(),sha256:createHash('sha256').update(bytes).digest('hex'),data});}catch(e){report.push({url,error:e.message})}
}
writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({received:report.filter(r=>r.data).length,failed:report.filter(r=>r.error),databaseWrites:0}));
