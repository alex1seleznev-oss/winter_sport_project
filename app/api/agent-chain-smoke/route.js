import {createHash,timingSafeEqual} from 'node:crypto';
import {BoundedModelDispatcher,safeDispatchErrorCode} from '../../../lib/agents/dispatch-service.mjs';
import {SupabaseAgentStore} from '../../../lib/agents/store-supabase.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const TOKEN_DIGEST='f87f2e4fce708d239e71298d4aaaa49d23c5a994ece413092c4bca23d74c7603';
const RESEARCH_JOB_ID='effc6cf2-7e38-4d89-94df-caea63b6ba7c';
const FACT_JOB_ID='ffe61a00-3b31-43a8-8094-29d37f7fd8cf';
const WRITER_JOB_ID='d5890ab4-93e6-4fca-8c4e-d053567399b6';
const headers={'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','Content-Type':'application/json; charset=utf-8'};
function json(body,status=200){return new Response(JSON.stringify(body),{status,headers})}
function validToken(request){
 const token=new URL(request.url).searchParams.get('token')??'';
 const actual=Buffer.from(createHash('sha256').update(token).digest('hex'));
 const expected=Buffer.from(TOKEN_DIGEST);
 return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
function guarded(job,id,agentId,type){
 return job?.jobId===id&&job.agentId===agentId&&job.type===type&&job.requestedBy==='agent-fabric-chain-smoke-v4'&&job.maxAttempts===1&&job.payload?.synthetic===true&&job.payload?.publicationAllowed===false;
}

export async function GET(request){
 if(!validToken(request))return json({ok:false,error:'NOT_FOUND'},404);
 try{
  const store=new SupabaseAgentStore();
  const dispatcher=new BoundedModelDispatcher({store});
  let research=await store.get(RESEARCH_JOB_ID,{withAudit:false});
  let fact=await store.get(FACT_JOB_ID,{withAudit:false});
  let writer=await store.get(WRITER_JOB_ID,{withAudit:false});
  if(!guarded(research,RESEARCH_JOB_ID,'research','research.chain-smoke-v4')||!guarded(fact,FACT_JOB_ID,'fact-check','fact-check.chain-smoke-v4')||!guarded(writer,WRITER_JOB_ID,'editorial-writer','editorial-writer.chain-smoke-v4'))return json({ok:false,error:'CHAIN_SMOKE_GUARD_FAILED'},404);

  if(research.status==='queued'){
   await dispatcher.executeOne({jobId:RESEARCH_JOB_ID,workerId:`chain-smoke-v4-research:${process.env.VERCEL_REGION??'server'}`,leaseSeconds:300});
   research=await store.get(RESEARCH_JOB_ID,{withAudit:false});
  }
  if(research.status!=='succeeded')return json({ok:true,chain:'stopped',researchStatus:research.status,factStatus:fact.status,writerStatus:writer.status},200);
  const researchArtifacts=await store.artifactsForJob(RESEARCH_JOB_ID);
  if(!researchArtifacts.some(a=>a.type==='evidence-packet'))return json({ok:false,error:'EVIDENCE_PACKET_MISSING',researchStatus:research.status},409);

  if(fact.status==='queued'){
   await dispatcher.executeOne({jobId:FACT_JOB_ID,workerId:`chain-smoke-v4-fact:${process.env.VERCEL_REGION??'server'}`,leaseSeconds:300});
   fact=await store.get(FACT_JOB_ID,{withAudit:false});
  }
  if(fact.status!=='succeeded')return json({ok:true,chain:'stopped',researchStatus:research.status,factStatus:fact.status,writerStatus:writer.status,reviewRequired:Boolean(fact.reviewRequired)},200);
  const factArtifacts=await store.artifactsForJob(FACT_JOB_ID);
  if(!factArtifacts.some(a=>a.type==='approved-evidence'))return json({ok:false,error:'APPROVED_EVIDENCE_MISSING',factStatus:fact.status},409);

  if(writer.status==='queued'){
   await dispatcher.executeOne({jobId:WRITER_JOB_ID,workerId:`chain-smoke-v4-writer:${process.env.VERCEL_REGION??'server'}`,leaseSeconds:300});
   writer=await store.get(WRITER_JOB_ID,{withAudit:false});
  }
  const writerArtifacts=writer.status==='succeeded'?await store.artifactsForJob(WRITER_JOB_ID):[];
  const hasDraft=writerArtifacts.some(a=>a.type==='article-draft');
  return json({ok:writer.status==='succeeded'&&hasDraft,chain:writer.status==='succeeded'&&hasDraft?'completed':'stopped',researchStatus:research.status,factStatus:fact.status,writerStatus:writer.status,articleDraft:hasDraft},writer.status==='succeeded'&&hasDraft?200:409);
 }catch(error){
  const status=Number.isInteger(error?.status)&&error.status>=400&&error.status<=599?error.status:500;
  return json({ok:false,error:safeDispatchErrorCode(error),retryable:Boolean(error?.retryable),jobStatus:error?.jobStatus??null},status);
 }
}
