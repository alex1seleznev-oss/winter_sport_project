import {createHash,timingSafeEqual} from 'node:crypto';
import {BoundedModelDispatcher,safeDispatchErrorCode} from '../../../lib/agents/dispatch-service.mjs';
import {SupabaseAgentStore} from '../../../lib/agents/store-supabase.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const TOKEN_DIGEST='7223949e8eaf429883836392457ba6c5ce4576cece417e75736eaa223bf75070';
const SMOKE_JOB_ID='f49f2bea-ead9-48da-aab0-571582af7c11';
const headers={'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','Content-Type':'application/json; charset=utf-8'};
function json(body,status=200){return new Response(JSON.stringify(body),{status,headers})}
function validToken(request){
 const token=new URL(request.url).searchParams.get('token')??'';
 const actual=Buffer.from(createHash('sha256').update(token).digest('hex'));
 const expected=Buffer.from(TOKEN_DIGEST);
 return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
function exactSmokeJob(job){
 return job?.jobId===SMOKE_JOB_ID
  && job.type==='research.smoke'
  && job.agentId==='research'
  && job.requestedBy==='agent-fabric-smoke'
  && job.maxAttempts===1
  && job.payload?.synthetic===true
  && job.payload?.publicationAllowed===false;
}

export async function GET(request){
 if(!validToken(request))return json({ok:false,error:'NOT_FOUND'},404);
 try{
  const store=new SupabaseAgentStore();
  const job=await store.get(SMOKE_JOB_ID,{withAudit:false});
  if(!exactSmokeJob(job))return json({ok:false,error:'SMOKE_JOB_GUARD_FAILED'},404);
  if(job.status!=='queued')return json({ok:false,error:'SMOKE_JOB_ALREADY_USED',status:job.status},409);
  const dispatcher=new BoundedModelDispatcher({store});
  const result=await dispatcher.executeOne({jobId:SMOKE_JOB_ID,workerId:`e2e-smoke:${process.env.VERCEL_REGION??'server'}`,leaseSeconds:300});
  return json({ok:true,smoke:true,jobId:SMOKE_JOB_ID,status:result?.job?.status??result?.status??'completed'},200);
 }catch(error){
  const status=Number.isInteger(error?.status)&&error.status>=400&&error.status<=599?error.status:500;
  return json({ok:false,error:safeDispatchErrorCode(error),retryable:Boolean(error?.retryable),jobStatus:error?.jobStatus??null},status);
 }
}
