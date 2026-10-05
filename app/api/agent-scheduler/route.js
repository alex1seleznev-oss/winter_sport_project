import {createHash,timingSafeEqual} from 'node:crypto';
import {validBearer} from '../../../lib/server-security';
import {safeDispatchErrorCode} from '../../../lib/agents/dispatch-service.mjs';
import {BoundedAgentScheduler,modelRuntimeEnvMissing} from '../../../lib/agents/scheduler-service.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const SUPABASE_SCHEDULER_DIGEST='e139e103ef3a00368944109f2da9a33e8989f26065d223f0ae8a9d89f622ebb1';
const headers={
 'Cache-Control':'no-store',
 'X-Robots-Tag':'noindex, nofollow',
 'Content-Type':'application/json; charset=utf-8'
};

function json(body,status=200,extraHeaders={}){
 return new Response(JSON.stringify(body),{status,headers:{...headers,...extraHeaders}});
}

function validSupabaseBearer(header){
 if(typeof header!=='string'||!header.startsWith('Bearer '))return false;
 const token=header.slice(7);
 if(token.length<32)return false;
 const actual=Buffer.from(createHash('sha256').update(token).digest('hex'));
 const expected=Buffer.from(SUPABASE_SCHEDULER_DIGEST);
 return actual.length===expected.length&&timingSafeEqual(actual,expected);
}

export async function GET(request){
 const authorization=request.headers.get('authorization');
 const secret=process.env.CRON_SECRET;
 const vercelCronAuthorized=Boolean(secret&&secret.length>=32&&validBearer(authorization,secret));
 const supabaseCronAuthorized=validSupabaseBearer(authorization);
 if(!vercelCronAuthorized&&!supabaseCronAuthorized){
  if(!secret||secret.length<32)return json({ok:false,error:'AGENT_SCHEDULER_NOT_CONFIGURED'},503);
  return json({ok:false,error:'UNAUTHORIZED'},401);
 }

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
