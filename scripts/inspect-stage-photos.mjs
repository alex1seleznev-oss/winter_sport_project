// Bounded one-time research of the user's public gallery. No image generation or publication.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {load} from 'cheerio';
const candidates=JSON.parse(readFileSync(new URL('../content/stage-photo-candidates.json',import.meta.url),'utf8'));
function allowed(value,kind){const u=new URL(value);if(u.protocol!=='https:'||u.hostname!=='olympteka.ru'||u.username||u.password||u.port||u.search||u.hash)throw new Error('PHOTO_SOURCE_NOT_ALLOWED');if(kind==='image'&&!/^\/images\/site_gallery\/(10|16)\/big\/sg_\d+_0\.jpg$/.test(u.pathname))throw new Error('PHOTO_PATH_NOT_ALLOWED');if(kind==='page'&&!/^\/sport\/(biathlon|skiing)\/(images(?:\/ph1-32(?:\/2)?)?\.html|event\/\d+\.html)$/.test(u.pathname))throw new Error('GALLERY_PATH_NOT_ALLOWED');return u.href}
async function get(url,kind){allowed(url,kind);const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{'user-agent':'WinterSportsHub/1.5 gallery-research'}});if(!r.ok){await r.body?.cancel();throw new Error('PHOTO_HTTP_'+r.status)}const type=r.headers.get('content-type')||'';if(!(kind==='page'?type.includes('text/html'):type.startsWith('image/jpeg'))){await r.body?.cancel();throw new Error('PHOTO_CONTENT_TYPE')}if(!r.body)throw new Error('EMPTY_SOURCE');const chunks=[];let length=0;const reader=r.body.getReader();try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>3*1024*1024){await reader.cancel();throw new Error('PHOTO_SIZE_LIMIT')}chunks.push(value)}}finally{reader.releaseLock()}const bytes=Buffer.concat(chunks);if(kind==='image'&&!(bytes[0]===255&&bytes[1]===216&&bytes[2]===255))throw new Error('PHOTO_SIGNATURE_INVALID');return {bytes,sha256:createHash('sha256').update(bytes).digest('hex'),fetchedAt:new Date().toISOString()}}
const receipts=[];const pages=new Map();mkdirSync('artifacts/photo-research/originals',{recursive:true});
for(const c of candidates.slice(0,5)){try{
 let page=pages.get(c.sourcePage);if(!page){page=await get(c.sourcePage,'page');pages.set(c.sourcePage,page)}
 const $=load(page.bytes.toString('utf8'));const matches=$('a[href]').toArray().filter(el=>{try{return new URL($(el).attr('href'),c.sourcePage).href===c.originalUrl}catch{return false}});
 if(!matches.length)throw new Error('ORIGINAL_NOT_IN_GALLERY');
 const img=await get(c.originalUrl,'image');const path=`originals/${c.key}.jpg`;writeFileSync('artifacts/photo-research/'+path,img.bytes);
 receipts.push({...c,downloaded:true,path,bytes:img.bytes.length,sha256:img.sha256,fetchedAt:img.fetchedAt,gallerySha256:page.sha256,publicationApproved:false,transformation:'none; original response bytes preserved'});
 }catch(error){receipts.push({...c,downloaded:false,error:error.message,networkCause:error.cause?.code??null,publicationApproved:false})}}
writeFileSync('artifacts/photo-research/receipts.json',JSON.stringify({scope:'Research copies only; no production image installation or licence assertion',checkedAt:new Date().toISOString(),receipts},null,2));
console.log(JSON.stringify({candidates:receipts.length,downloaded:receipts.filter(r=>r.downloaded).length,errors:receipts.filter(r=>!r.downloaded).map(r=>({key:r.key,error:r.error,cause:r.networkCause})),productionImageWrites:0},null,2));
