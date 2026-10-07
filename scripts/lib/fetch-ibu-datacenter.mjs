import {createHash} from 'node:crypto';
import {OFFICIAL_USER_AGENT} from './fetch-flgr-curl.mjs';

export const IBU_EVENTS_API_URL='https://biathlonresults.com/modules/sportapi/api/Events?SeasonId=2627&Level=1';
const API_HOST='biathlonresults.com';
const API_PATH='/modules/sportapi/api/Events';
const MAX_BYTES=512*1024;

export function assertIbuEventsApiUrl(sourceUrl){
  const url=new URL(sourceUrl);
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash||url.hostname!==API_HOST||url.pathname!==API_PATH)throw new Error('IBU_API_URL_NOT_ALLOWED');
  if(url.searchParams.size!==2||url.searchParams.get('SeasonId')!=='2627'||url.searchParams.get('Level')!=='1')throw new Error('IBU_API_SCOPE_DENIED');
  return url;
}

export async function fetchIbuDatacenterEvents(sourceUrl=IBU_EVENTS_API_URL,{fetchImpl=fetch,maxBytes=MAX_BYTES}={}){
  const url=assertIbuEventsApiUrl(sourceUrl);
  if(!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>MAX_BYTES)throw new Error('IBU_API_LIMIT_INVALID');
  const response=await fetchImpl(url,{redirect:'manual',signal:AbortSignal.timeout(20000),headers:{'user-agent':OFFICIAL_USER_AGENT,'accept':'application/json'}});
  if(!response.ok){await response.body?.cancel();throw new Error(`IBU_API_HTTP_${response.status}`)}
  const contentType=(response.headers.get('content-type')||'').trim().toLowerCase();
  if(!/^(?:application\/json|text\/json|text\/plain)(?:\s*;|$)/.test(contentType)){await response.body?.cancel();throw new Error('IBU_API_CONTENT_TYPE_INVALID')}
  if(!response.body)throw new Error('IBU_API_EMPTY_BODY');
  const reader=response.body.getReader();
  const chunks=[];let bytes=0;
  try{
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      bytes+=value.byteLength;
      if(bytes>maxBytes){await reader.cancel();throw new Error('IBU_API_TOO_LARGE')}
      chunks.push(value);
    }
  }finally{reader.releaseLock()}
  if(bytes===0)throw new Error('IBU_API_EMPTY_BODY');
  const buffer=Buffer.concat(chunks);
  let data;
  try{data=JSON.parse(buffer.toString('utf8'))}catch{throw new Error('IBU_API_JSON_INVALID')}
  if(!Array.isArray(data))throw new Error('IBU_API_SHAPE_INVALID');
  return {data,sourceUrl:url.toString(),fetchedAt:new Date().toISOString(),httpStatus:response.status,bytes,documentSha256:createHash('sha256').update(buffer).digest('hex'),transport:'node_fetch',tlsVerified:true};
}
