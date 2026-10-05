import {createHash,timingSafeEqual} from 'node:crypto';
import {OpenAIResponsesProvider} from '../../../lib/agents/model-provider-openai.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const TOKEN_DIGEST='69514d2d73616a399238c39a8af06a15400c4846c9b3978cb9d60de04d8c2df8';
const headers={'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','Content-Type':'application/json; charset=utf-8'};
const schema={name:'runtime_smoke',schema:{type:'object',additionalProperties:false,properties:{ok:{type:'boolean'},marker:{type:'string'}},required:['ok','marker']}};
function json(body,status=200){return new Response(JSON.stringify(body),{status,headers})}
function validToken(request){
 const token=new URL(request.url).searchParams.get('token')??'';
 const actual=Buffer.from(createHash('sha256').update(token).digest('hex'));
 const expected=Buffer.from(TOKEN_DIGEST);
 return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
export async function GET(request){
 if(!validToken(request))return json({ok:false,error:'NOT_FOUND'},404);
 try{
  const provider=new OpenAIResponsesProvider();
  const result=await provider.invoke({
   modelProfile:'balanced',
   instructions:'Return the requested JSON only. Set ok=true and marker="AGENT_FABRIC_OPENAI_SMOKE".',
   input:{purpose:'Validate Winter Sports Hub server-side model credentials and model binding. No publication or external action.'},
   schema,maxOutputTokens:80,metadata:{probe:'agent-fabric-openai-smoke'}
  });
  return json({ok:result.output?.ok===true&&result.output?.marker==='AGENT_FABRIC_OPENAI_SMOKE',model:result.model,responseId:result.responseId,usage:result.usage},200);
 }catch(error){
  const code=typeof error?.code==='string'?error.code:typeof error?.message==='string'?error.message:'MODEL_SMOKE_FAILED';
  const safe=/^[A-Z0-9_:.-]{3,160}$/.test(code)?code:'MODEL_SMOKE_FAILED';
  const status=Number.isInteger(error?.status)&&error.status>=400&&error.status<=599?error.status:500;
  return json({ok:false,error:safe},status);
 }
}
