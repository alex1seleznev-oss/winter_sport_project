import {createHash,timingSafeEqual} from 'node:crypto';
import {SupabaseAgentStore} from '../../../lib/agents/store-supabase.mjs';
import {OpenAIResponsesProvider} from '../../../lib/agents/model-provider-openai.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const TOKEN_DIGEST='6417ae3ab49d5da13fcce36a6eec402f4f40307f6e060099ce9a771adb1a74f7';
const SMOKE_JOB_ID='f49f2bea-ead9-48da-aab0-571582af7c11';
const headers={'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','Content-Type':'application/json; charset=utf-8'};
const schema={name:'runtime_key_probe',schema:{type:'object',additionalProperties:false,properties:{ok:{type:'boolean'},marker:{type:'string'}},required:['ok','marker']}};

function json(body,status=200){return new Response(JSON.stringify(body),{status,headers})}
function validToken(request){
 const token=new URL(request.url).searchParams.get('token')??'';
 const actual=Buffer.from(createHash('sha256').update(token).digest('hex'));
 const expected=Buffer.from(TOKEN_DIGEST);
 return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
function safeCode(error,fallback){
 const code=typeof error?.code==='string'?error.code:typeof error?.message==='string'?error.message:fallback;
 return /^[A-Z0-9_:.-]{3,180}$/.test(code)?code:fallback;
}

export async function GET(request){
 if(!validToken(request))return json({ok:false,error:'NOT_FOUND'},404);
 const result={supabase:{ok:false},openai:{ok:false}};
 try{
  const store=new SupabaseAgentStore();
  const job=await store.get(SMOKE_JOB_ID,{withAudit:false});
  result.supabase={ok:Boolean(job?.jobId===SMOKE_JOB_ID),jobStatus:job?.status??null};
 }catch(error){result.supabase={ok:false,error:safeCode(error,'SUPABASE_PROBE_FAILED')}}
 try{
  const provider=new OpenAIResponsesProvider();
  const response=await provider.invoke({modelProfile:'balanced',instructions:'Return JSON only. Set ok=true and marker="AGENT_FABRIC_KEY_PROBE".',input:{purpose:'Credential and model-binding probe only. No publication or external action.'},schema,maxOutputTokens:80,metadata:{probe:'agent-fabric-key-probe'}});
  result.openai={ok:response.output?.ok===true&&response.output?.marker==='AGENT_FABRIC_KEY_PROBE',model:response.model??null,responseId:response.responseId??null,usage:response.usage??null};
 }catch(error){result.openai={ok:false,error:safeCode(error,'OPENAI_PROBE_FAILED'),status:Number.isInteger(error?.status)?error.status:null}}
 return json({ok:result.supabase.ok&&result.openai.ok,...result},result.supabase.ok&&result.openai.ok?200:503);
}
