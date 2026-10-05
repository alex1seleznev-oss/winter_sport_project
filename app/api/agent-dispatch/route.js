import {validBearer,boundedJson} from '../../../lib/server-security';
import {BoundedModelDispatcher,safeDispatchErrorCode} from '../../../lib/agents/dispatch-service.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const headers={
 'Cache-Control':'no-store',
 'X-Robots-Tag':'noindex, nofollow',
 'Content-Type':'application/json; charset=utf-8'
};

function json(body,status=200,extraHeaders={}){
 return new Response(JSON.stringify(body),{status,headers:{...headers,...extraHeaders}});
}

function uuidLike(value){
 return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request){
 const secret=process.env.AGENT_DISPATCH_SECRET;
 if(!secret||secret.length<32)return json({ok:false,error:'AGENT_DISPATCH_NOT_CONFIGURED'},503);
 if(!validBearer(request.headers.get('authorization'),secret))return json({ok:false,error:'UNAUTHORIZED'},401);

 let body;
 try{body=await boundedJson(request,2048)}
 catch(error){
  const code=error?.message==='BODY_TOO_LARGE'?'BODY_TOO_LARGE':error?.message==='CONTENT_TYPE'?'CONTENT_TYPE_REQUIRED':'INVALID_JSON';
  return json({ok:false,error:code},code==='BODY_TOO_LARGE'?413:400);
 }
 if(!body||typeof body!=='object'||Array.isArray(body))return json({ok:false,error:'INVALID_BODY'},400);
 const keys=Object.keys(body);
 if(keys.some(key=>key!=='jobId'))return json({ok:false,error:'UNSUPPORTED_FIELD'},400);
 if(!uuidLike(body.jobId))return json({ok:false,error:'JOB_ID_INVALID'},400);

 try{
  const dispatcher=new BoundedModelDispatcher();
  const result=await dispatcher.executeOne({
   jobId:body.jobId,
   workerId:`vercel-dispatch:${process.env.VERCEL_REGION??'server'}`,
   leaseSeconds:300
  });
  return json(result,200);
 }catch(error){
  const code=safeDispatchErrorCode(error);
  const status=Number.isInteger(error?.status)&&error.status>=400&&error.status<=599?error.status:500;
  const retryable=Boolean(error?.retryable);
  return json({ok:false,error:code,retryable,jobStatus:error?.jobStatus??null},status,retryable?{'Retry-After':'15'}:{});
 }
}
