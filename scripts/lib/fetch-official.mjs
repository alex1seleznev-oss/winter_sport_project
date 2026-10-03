import {createHash} from 'node:crypto';
const hosts=new Set(['www.fis-ski.com','www.biathlonworld.com','biathlonrus.com','flgr.ru','www.flgr-results.ru','flgr-results.ru','fis.flgr-results.ru','data.flgr-results.ru']);
export async function fetchOfficialHtml(sourceUrl,{fetchImpl=fetch,maxBytes=2*1024*1024}={}){
 const url=new URL(sourceUrl);
 if(url.protocol!=='https:'||url.username||url.password||url.port||!hosts.has(url.hostname))throw new Error('SOURCE_NOT_ALLOWED');
 const response=await fetchImpl(url,{redirect:'manual',signal:AbortSignal.timeout(20000),headers:{'user-agent':'WinterSportsHub/1.4 official-source-check'}});
 if(!response.ok){await response.body?.cancel();throw new Error(`SOURCE_HTTP_${response.status}`)}
 if(!response.headers.get('content-type')?.toLowerCase().includes('text/html')){await response.body?.cancel();throw new Error('SOURCE_CONTENT_TYPE_INVALID')}
 if(!response.body)throw new Error('SOURCE_EMPTY_BODY');
 const reader=response.body.getReader();const chunks=[];let bytes=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>maxBytes){await reader.cancel();throw new Error('SOURCE_TOO_LARGE')}chunks.push(value)}}finally{reader.releaseLock()}
 const buffer=Buffer.concat(chunks);
 return {html:buffer.toString('utf8'),sourceUrl:url.href,fetchedAt:new Date().toISOString(),httpStatus:response.status,bytes,documentSha256:createHash('sha256').update(buffer).digest('hex')};
}
export async function fetchOfficialHtmlFirstAvailable(sourceUrls,options={}){
 if(!Array.isArray(sourceUrls)||sourceUrls.length<1||sourceUrls.length>4)throw new Error('SOURCE_CANDIDATES_INVALID');
 const tried=[];let last;
 for(const sourceUrl of sourceUrls){
  try{
   const result=await fetchOfficialHtml(sourceUrl,options);
   return {...result,canonicalSourceUrl:sourceUrls[0],fallbackUsed:sourceUrl!==sourceUrls[0],attemptedSourceUrls:[...tried,sourceUrl]};
  }catch(error){last=error;tried.push(sourceUrl)}
 }
 const error=new Error('SOURCE_ALL_CANDIDATES_FAILED');error.cause=last;error.attemptedSourceUrls=tried;throw error;
}
