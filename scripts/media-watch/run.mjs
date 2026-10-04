// Public source GETs only. No source credentials, private API or database client.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';import {hash,normalize,syndication,delta,VERSION} from './model.mjs';import {telegram,rss,mediaIndex} from './parsers.mjs';
const config=JSON.parse(readFileSync(new URL('../../config/public-media-watch.json',import.meta.url),'utf8'));
const allowed=new Set(['https://t.me/s/radiolyzhi','https://t.me/s/ski_lizzer1n','https://t.me/s/skiclassics','https://t.me/s/russianbiathlon','https://t.me/s/penalty150','https://www.sports.ru/biathlon/','https://www.sports.ru/skiing/','https://www.sports.ru/rss/topnews.xml','https://skisport.ru/']);
const out='artifacts/media-watch';mkdirSync(out,{recursive:true});
async function fetchPublic(url){let last;for(let attempt=1;attempt<=2;attempt++){try{const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(18000),headers:{'user-agent':'WinterSportsHub/1.7 public-reference-watch'}});if(r.ok)return r;if(r.status<500&&r.status!==429)return r;await r.body?.cancel();last=new Error('HTTP_'+r.status);}catch(e){last=e}if(attempt<2)await new Promise(resolve=>setTimeout(resolve,750));}throw last||new Error('FETCH_FAILED')}
const now=new Date();const packet={schemaVersion:2,parserVersion:VERSION,configHash:hash(config),startedAt:now.toISOString(),sources:[],items:[],notConnected:config.notConnected,calendarWrites:0,databaseWrites:0,publishedFacts:0};
for(const source of config.sources){let receipt=null;
 try{
  if(!allowed.has(source.fetchUrl))throw new Error('SOURCE_NOT_ALLOWED');const startedAt=new Date().toISOString();
  const response=await fetchPublic(source.fetchUrl);
  if(!response.ok){await response.body?.cancel();throw new Error('HTTP_'+response.status)}const type=response.headers.get('content-type')||'';
  if(!(source.adapter==='rss'?/xml|rss|atom/.test(type):/text\/html/.test(type))){await response.body?.cancel();throw new Error('CONTENT_TYPE_MISMATCH')}
  if(!response.body)throw new Error('EMPTY_BODY');const chunks=[];let n=0;const reader=response.body.getReader();try{while(true){const {done,value}=await reader.read();if(done)break;n+=value.length;if(n>3*1024*1024){await reader.cancel();throw new Error('BODY_TOO_LARGE')}chunks.push(value)}}finally{reader.releaseLock()}
  const bytes=Buffer.concat(chunks);receipt={url:source.fetchUrl,startedAt,fetchedAt:new Date().toISOString(),sha256:hash(bytes),bytes:n,httpStatus:200};
  const html=new TextDecoder('utf-8',{fatal:true}).decode(bytes);const parse=source.adapter==='telegram'?telegram:source.adapter==='rss'?rss:mediaIndex;
  const parsed=parse(html,source),items=[],skips={};for(const row of parsed.rows){const item=normalize(row,source,receipt,now);if(item.skip)skips[item.skip]=(skips[item.skip]||0)+1;else items.push(item.item)}
  // Independent second parse of the same bytes; changed fetch metadata must not mint a revision.
  const replay=parse(html,source).rows.map(r=>normalize(r,source,{...receipt,fetchedAt:new Date().toISOString(),sha256:'0'.repeat(64)},now)).filter(i=>i.item).map(i=>i.item.revision);
  if(JSON.stringify(replay)!==JSON.stringify(items.map(i=>i.revision)))throw new Error('REPLAY_DETERMINISM_FAILED');
  packet.items.push(...items);packet.sources.push({key:source.key,name:source.name,status:'parsed',receipt,scanned:parsed.scanned,retained:items.length,skips,warnings:parsed.warnings||[],coverage:parsed.coverage,replayStable:true});
 }catch(error){packet.sources.push({key:source.key,name:source.name,status:'error',receipt,error:/^[A-Z0-9_]+$/.test(error.message)?error.message:error.name==='TimeoutError'?'TIMEOUT':'NETWORK_OR_PARSER_FAILURE',cause:error.cause?.code||null})}
}
packet.items=[...new Map(packet.items.map(i=>[i.sourceKey+'|'+i.url+'|'+i.revision,i])).values()];packet.completedAt=new Date().toISOString();packet.syndication=syndication(packet.items);packet.totals={retained:packet.items.length,parsedSources:packet.sources.filter(s=>s.status==='parsed').length,failedSources:packet.sources.filter(s=>s.status==='error').length};packet.packetHash=hash({items:packet.items,sources:packet.sources});
let previous=null;try{previous=JSON.parse(readFileSync('artifacts/previous-media-watch/packet.json','utf8'));if(previous.schemaVersion!==2||!Array.isArray(previous.items)||!Array.isArray(previous.sources))previous=null}catch{}
packet.delta=delta(previous,packet);
try{packet.previousReceipt=JSON.parse(readFileSync('artifacts/previous-media-watch/receipt.json','utf8'))}catch{packet.previousReceipt=null}
writeFileSync(out+'/packet.json',JSON.stringify(packet,null,2)+'\n');
const health={schemaVersion:2,parserVersion:VERSION,completedAt:packet.completedAt,totals:packet.totals,sources:packet.sources.map(({key,status,error,retained,warnings,replayStable})=>({key,status,error,retained,warningsCount:warnings?.length||0,replayStable})),notConnected:packet.notConnected,packetHash:packet.packetHash,delta:{baselineAvailable:packet.delta.baselineAvailable,newReferences:packet.delta.newReferences.length,changedReferences:packet.delta.changedReferences.length,sourceStateChanges:packet.delta.sourceStateChanges},databaseWrites:0};writeFileSync(out+'/health.json',JSON.stringify(health,null,2)+'\n');console.log(JSON.stringify(health,null,2));
if(!packet.totals.parsedSources||packet.sources.some(s=>s.status==='error'))process.exitCode=1;
