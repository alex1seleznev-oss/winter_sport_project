import {validBearer} from '../../../lib/server-security';
import {safeDispatchErrorCode} from '../../../lib/agents/dispatch-service.mjs';
import {BoundedAgentScheduler,modelRuntimeEnvMissing} from '../../../lib/agents/scheduler-service.mjs';

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

export async function GET(request){
 const secret=process.env.CRON_SECRET;
 if(!secret||secret.length<32)return json({ok:false,error:'AGENT_SCHEDULER_NOT_CONFIGURED'},503);
 if(!validBearer(request.headers.get('authorization'),secret))return json({ok:false,error:'UNAUTHORIZED'},401);

 const missing=modelRuntimeEnvMissing();
 if(missing.length)return json({ok:true,status:'skipped',reason:'MODEL_RUNTIME_NOT_CONFIGURED',missing},200);

 try{
  const scheduler=new BoundedAgentScheduler();
  const result=await scheduler.runOnce({
   workerId:`vercel-scheduler:${process.env.VERCEL_REGION??'server'}`,
   candidateLimit:5,
   leaseSeconds:300
  });
  return json(result,200);
 }catch(error){
  const code=safeDispatchErrorCode(error);
  const retryable=Boolean(error?.retryable);
  const status=Number.isInteger(error?.status)&&error.status>=400&&error.status<=599?error.status:503;
  return json({ok:false,error:code,retryable},status,retryable?{'Retry-After':'15'}:{});
 }
}
