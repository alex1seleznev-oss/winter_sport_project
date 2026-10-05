import {createHash,timingSafeEqual} from 'node:crypto';
import {BoundedModelDispatcher,safeDispatchErrorCode} from '../../../lib/agents/dispatch-service.mjs';
import {SupabaseAgentStore} from '../../../lib/agents/store-supabase.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const TOKEN_DIGEST='7d26d4a22b76e99f5f00163818349f10cea4f1a732303cffe7107075bf78f53e';
const FACT_JOB_ID='6609c64a-3a8b-4ee9-80ad-fbab66463796';
const WRITER_JOB_ID='66a7ce4b-aa9f-4e85-83f9-28d4b8637e9c';
const headers={'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','Content-Type':'application/json; charset=utf-8'};
function json(body,status=200){return new Response(JSON.stringify(body),{status,headers})}
function validToken(request){
 const token=new URL(request.url).searchParams.get('token')??'';
 const actual=Buffer.from(createHash('sha256').update(token).digest('hex'));
 const expected=Buffer.from(TOKEN_DIGEST);
 return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
function guarded(job,id,agentId,type){
 return job?.jobId===id&&job.agentId===agentId&&job.type===type&&job.requestedBy==='agent-fabric-chain-smoke'&&job.maxAttempts===1&&job.payload?.synthetic===true&&job.payload?.publicationAllowed===false;
}

export async function GET(request){
 if(!validToken(request))return json({ok:false,error:'NOT_FOUND'},404);
 try{
  const store=new SupabaseAgentStore();
  const dispatcher=new BoundedModelDispatcher({store});
  let fact=await store.get(FACT_JOB_ID,{withAudit:false});
  let writer=await store.get(WRITER_JOB_ID,{withAudit:false});
  if(!guarded(fact,FACT_JOB_ID,'fact-check','fact-check.smoke')||!guarded(writer,WRITER_JOB_ID,'editorial-writer','editorial-writer.smoke'))return json({ok:false,error:'CHAIN_SMOKE_GUARD_FAILED'},404);
  if(fact.status==='queued'){
   await dispatcher.executeOne({jobId:FACT_JOB_ID,workerId:`chain-smoke-fact:${process.env.VERCEL_REGION??'server'}`,leaseSeconds:300});
   fact=await store.get(FACT_JOB_ID,{withAudit:false});
  }
  if(fact.status!=='succeeded')return json({ok:true,chain:'stopped',factStatus:fact.status,writerStatus:writer.status,reviewRequired:Boolean(fact.reviewRequired)},200);
  const factArtifacts=await store.artifactsForJob(FACT_JOB_ID);
  if(!factArtifacts.some(a=>a.type==='approved-evidence'))return json({ok:false,error:'APPROVED_EVIDENCE_MISSING',factStatus:fact.status},409);
  if(writer.status==='queued'){
   await dispatcher.executeOne({jobId:WRITER_JOB_ID,workerId:`chain-smoke-writer:${process.env.VERCEL_REGION??'server'}`,leaseSeconds:300});
   writer=await store.get(WRITER_JOB_ID,{withAudit:false});
  }
  return json({ok:writer.status==='succeeded',chain:writer.status==='succeeded'?'completed':'stopped',factStatus:fact.status,writerStatus:writer.status,writerReviewRequired:Boolean(writer.reviewRequired)},writer.status==='succeeded'?200:409);
 }catch(error){
  const status=Number.isInteger(error?.status)&&error.status>=400&&error.status<=599?error.status:500;
  return json({ok:false,error:safeDispatchErrorCode(error),retryable:Boolean(error?.retryable),jobStatus:error?.jobStatus??null},status);
 }
}
