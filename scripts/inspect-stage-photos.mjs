// Bounded research of the user's public gallery. No generation, rehosting or publication.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {load} from 'cheerio';
const candidates=JSON.parse(readFileSync(new URL('../content/stage-photo-candidates.json',import.meta.url),'utf8'));
function allowed(value,kind){
 const u=new URL(value);
 if(u.protocol!=='https:'||u.hostname!=='olympteka.ru'||u.username||u.password||u.port||u.search||u.hash)throw new Error('PHOTO_SOURCE_NOT_ALLOWED');
 if(kind==='image'&&!/^\/images\/site_gallery\/(10|16)\/big\/sg_\d+_0\.jpg$/.test(u.pathname))throw new Error('PHOTO_PATH_NOT_ALLOWED');
 if(kind==='page'&&!/^\/sport\/(biathlon|skiing)\/(images(?:\/ph1-32(?:\/2)?|\/[23])?\.html|event\/\d+\.html)$/.test(u.pathname))throw new Error('GALLERY_PATH_NOT_ALLOWED');
 return u.href;
}
async function get(url,kind){
 allowed(url,kind);
 const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{'user-agent':'WinterSportsHub/1.5 gallery-research'}});
 if(!r.ok){await r.body?.cancel();throw new Error('PHOTO_HTTP_'+r.status)}
 const type=r.headers.get('content-type')||'';
 if(!(kind==='page'?type.includes('text/html'):type.startsWith('image/jpeg'))){await r.body?.cancel();throw new Error('PHOTO_CONTENT_TYPE')}
 if(!r.body)throw new Error('EMPTY_SOURCE');
 const chunks=[];let length=0;const reader=r.body.getReader();
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>3*1024*1024){await reader.cancel();throw new Error('PHOTO_SIZE_LIMIT')}chunks.push(value)}}finally{reader.releaseLock()}
 const bytes=Buffer.concat(chunks);
 if(kind==='image'&&!(bytes[0]===255&&bytes[1]===216&&bytes[2]===255))throw new Error('PHOTO_SIGNATURE_INVALID');
 return {bytes,sha256:createHash('sha256').update(bytes).digest('hex'),fetchedAt:new Date().toISOString()};
}
function inspect(page,url){
 const $=load(page.bytes.toString('utf8'));const references=[],nextPages=[];
 $('a[href],img[src],img[data-src]').each((_,el)=>{
  for(const attribute of ['href','src','data-src']){const value=$(el).attr(attribute);if(!value)continue;
   try{const resolved=new URL(value,url);
    if(resolved.hostname!=='olympteka.ru'||resolved.protocol!=='https:')continue;
    if(/^\/images\/site_gallery\/(10|16)\//.test(resolved.pathname))references.push({url:resolved.href,attribute,caption:($(el).attr('alt')||$(el).attr('title')||'').slice(0,500)});
    if(attribute==='href'&&/^\/sport\/skiing\/images\/[23]\.html$/.test(resolved.pathname))nextPages.push(resolved.href);
   }catch{}
  }
 });
 return {references,nextPages:[...new Set(nextPages)].sort()};
}
const receipts=[],pages=new Map();mkdirSync('artifacts/photo-research/originals',{recursive:true});
async function pageAt(url){let page=pages.get(url);if(!page){page=await get(url,'page');pages.set(url,page)}return page}
for(const c of candidates.slice(0,5)){try{
 let sourcePage=c.sourcePage,page=await pageAt(sourcePage),details=inspect(page,sourcePage);
 const filename=new URL(c.originalUrl).pathname.split('/').pop();
 const matching=refs=>refs.find(r=>r.url===c.originalUrl)||refs.find(r=>new URL(r.url).pathname.split('/').pop()===filename);
 let match=matching(details.references);
 // Follow at most two pagination links observed in the supplied gallery, not guessed remote URLs.
 if(!match){for(const next of details.nextPages.slice(0,2)){const candidatePage=await pageAt(next),candidateDetails=inspect(candidatePage,next);const candidateMatch=matching(candidateDetails.references);if(candidateMatch){sourcePage=next;page=candidatePage;details=candidateDetails;match=candidateMatch;break}}}
 if(!match){receipts.push({...c,downloaded:false,error:'ORIGINAL_NOT_IN_CHECKED_GALLERIES',discoveredReferences:details.references.slice(0,60),publicationApproved:false});continue}
 const img=await get(c.originalUrl,'image'),path=`originals/${c.key}.jpg`;writeFileSync('artifacts/photo-research/'+path,img.bytes);
 receipts.push({...c,observedSourcePage:sourcePage,downloaded:true,path,bytes:img.bytes.length,sha256:img.sha256,fetchedAt:img.fetchedAt,gallerySha256:page.sha256,discovery:match.url===c.originalUrl?'exact_element_url':'matching_thumbnail_filename',observedReference:match,publicationApproved:false,transformation:'none; original response bytes preserved'});
 }catch(error){receipts.push({...c,downloaded:false,error:error.message,networkCause:error.cause?.code??null,publicationApproved:false})}}
writeFileSync('artifacts/photo-research/receipts.json',JSON.stringify({scope:'Research copies only; no production image installation or licence assertion',checkedAt:new Date().toISOString(),receipts},null,2));
console.log(JSON.stringify({candidates:receipts.length,downloaded:receipts.filter(r=>r.downloaded).length,errors:receipts.filter(r=>!r.downloaded).map(r=>({key:r.key,error:r.error,cause:r.networkCause})),productionImageWrites:0},null,2));
