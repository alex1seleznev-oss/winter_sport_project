// Narrowed safe scope: public GETs only. No credential support, private API or DB client.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {hash,normalize,syndication,delta,VERSION} from './model.mjs';import {telegram,rss,mediaIndex} from './parsers.mjs';
const config=JSON.parse(readFileSync(new URL('../../config/public-media-watch.json',import.meta.url),'utf8'));
const allowed=new Set(['https://t.me/s/radiolyzhi','https://t.me/s/ski_lizzer1n','https://t.me/s/skiclassics','https://t.me/s/russianbiathlon','https://www.sports.ru/biathlon/','https://www.sports.ru/skiing/','https://www.sports.ru/rss/topnews.xml','https://skisport.ru/']);
const out='artifacts/media-watch';mkdirSync(out,{recursive:true});
const packet={schemaVersion:2,parserVersion:VERSION,startedAt:new Date().toISOString(),sources:[],items:[],notConnected:config.notConnected,calendarWrites:0,databaseWrites:0,publishedFacts:0};
for(const source of config.sources){
 let receipt=null;
 try{
  if(!allowed.has(source.fetchUrl))throw new Error('SOURCE_NOT_ALLOWED');
  const startedAt=new Date().toISOString();
  const response=await fetch(source.fetchUrl,{redirect:'manual',signal:AbortSignal.timeout(18000),headers:{'user-agent':'WinterSportsHub/1.7 public-reference-watch'}});
  if(!response.ok){await response.body?.cancel();throw new Error('HTTP_'+response.status)}
  const type=response.headers.get('content-type')||'';if(!(source.adapter==='rss'?/xml|rss|atom/.test(type):/text\/html/.test(type))){await response.body?.cancel();throw new Error('CONTENT_TYPE_MISMATCH')}
  if(!response.body)throw new Error('EMPTY_BODY');const chunks=[];let n=0;const reader=response.body.getReader();
  try{while(true){const {done,value}=await reader.read();if(done)break;n+=value.length;if(n>3*1024*1024){await reader.cancel();throw new Error('BODY_TOO_LARGE')}chunks.push(value)}}finally{reader.releaseLock()}
  const bytes=Buffer.concat(chunks);receipt={url:source.fetchUrl,startedAt,fetchedAt:new Date().toISOString(),sha256:hash(bytes.toString('utf8')),bytes:n,httpStatus:200};
  const parsed=(source.adapter==='telegram'?telegram:source.adapter==='rss'?rss:mediaIndex)(bytes.toString('utf8'),source);
  const items=[],skips={};for(const row of parsed.rows){const normalized=normalize(row,source,receipt);if(normalized.skip)skips[normalized.skip]=(skips[normalized.skip]||0)+1;else items.push(normalized.item)}
  packet.items.push(...items);packet.sources.push({key:source.key,name:source.name,status:'parsed',receipt,scanned:parsed.scanned,retained:items.length,skips,coverage:parsed.coverage});
 }catch(error){packet.sources.push({key:source.key,name:source.name,status:'error',receipt,error:/^[A-Z0-9_]+$/.test(error.message)?error.message:error.name==='TimeoutError'?'TIMEOUT':'NETWORK_OR_PARSER_FAILURE',cause:error.cause?.code||null})}
}
packet.items=[...new Map(packet.items.map(i=>[i.sourceKey+'|'+i.url+'|'+i.revision,i])).values()];packet.completedAt=new Date().toISOString();packet.syndication=syndication(packet.items);
packet.totals={retained:packet.items.length,parsedSources:packet.sources.filter(s=>s.status==='parsed').length,failedSources:packet.sources.filter(s=>s.status==='error').length};
packet.packetHash=hash({items:packet.items,sources:packet.sources});
let previous=null;try{previous=JSON.parse(readFileSync('artifacts/previous-media-watch/packet.json','utf8'));if(previous.schemaVersion!==2||!Array.isArray(previous.items)||!Array.isArray(previous.sources))previous=null}catch{}
packet.delta=delta(previous,packet);
writeFileSync(out+'/packet.json',JSON.stringify(packet,null,2)+'\n');
// Public health output has no post excerpts or claims. GitHub logs never print full records.
const health={schemaVersion:2,completedAt:packet.completedAt,totals:packet.totals,sources:packet.sources.map(({key,status,error,retained})=>({key,status,error,retained})),notConnected:packet.notConnected,packetHash:packet.packetHash,delta:{baselineAvailable:packet.delta.baselineAvailable,newReferences:packet.delta.newReferences.length,changedReferences:packet.delta.changedReferences.length,sourceStateChanges:packet.delta.sourceStateChanges},databaseWrites:0};
writeFileSync(out+'/health.json',JSON.stringify(health,null,2)+'\n');console.log(JSON.stringify(health,null,2));
if(!packet.totals.parsedSources||packet.sources.some(s=>s.status==='error'))process.exitCode=1;
