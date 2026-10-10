import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@6.1.0";

const AUDIENCE="winter-sports-official-story-intake";
const REPOSITORY="alex1seleznev-oss/winter_sport_project";
const WORKFLOW="alex1seleznev-oss/winter_sport_project/.github/workflows/official-story-intake.yml@refs/heads/main";
const MAX_EVIDENCE_CHARS=12000;
const SOURCES={
  ibu:{feedUrl:"https://biathlonresults.com/modules/sportapi/api/Events",host:"biathlonresults.com",path:"/modules/sportapi/api/Events",seasonId:"2627",level:"1"}
} as const;
const jwks=createRemoteJWKSet(new URL("https://token.actions.githubusercontent.com/.well-known/jwks"));
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store","x-content-type-options":"nosniff"}});

async function authorize(req:Request){
  const auth=req.headers.get("authorization")||"";
  if(!auth.startsWith("Bearer ")) throw new Error("AUTH_REQUIRED");
  const {payload}=await jwtVerify(auth.slice(7),jwks,{issuer:"https://token.actions.githubusercontent.com",audience:AUDIENCE});
  if(payload.repository!==REPOSITORY) throw new Error("REPOSITORY_DENIED");
  if(payload.ref!=="refs/heads/main") throw new Error("REF_DENIED");
  if(String(payload.workflow_ref||"")!==WORKFLOW) throw new Error("WORKFLOW_DENIED");
  if(!["schedule","workflow_dispatch","push"].includes(String(payload.event_name||""))) throw new Error("EVENT_DENIED");
  return payload;
}

function validIso(value:unknown){
  if(typeof value!=="string"||value.length>64)return false;
  const ms=Date.parse(value);
  return Number.isFinite(ms)&&ms<=Date.now()+5*60*1000;
}

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return json({ok:false,code:"METHOD_NOT_ALLOWED"},405);
  let identity:any;
  try{identity=await authorize(req)}catch(error){return json({ok:false,code:error instanceof Error?error.message:"AUTH_DENIED"},401)}

  let body:any;
  try{body=await req.json()}catch{return json({ok:false,code:"BAD_JSON"},400)}
  if(body?.schemaVersion!==1)return json({ok:false,code:"BAD_SCHEMA_VERSION"},400);
  if(typeof body.sourceKey!=="string"||!Object.hasOwn(SOURCES,body.sourceKey))return json({ok:false,code:"SOURCE_NOT_ALLOWED"},400);
  const source=SOURCES[body.sourceKey as keyof typeof SOURCES];
  if(typeof body.storyKey!=="string"||body.storyKey.length<3||body.storyKey.length>180||!/^[a-z0-9][a-z0-9._:-]*[a-z0-9]$/.test(body.storyKey))return json({ok:false,code:"BAD_STORY_KEY"},400);
  if(typeof body.topic!=="string"||!body.topic.trim()||body.topic.length>300)return json({ok:false,code:"BAD_TOPIC"},400);
  if(typeof body.sourceUrl!=="string"||body.sourceUrl.length>2048)return json({ok:false,code:"BAD_SOURCE_URL"},400);
  let sourceUrl:URL;
  try{sourceUrl=new URL(body.sourceUrl)}catch{return json({ok:false,code:"BAD_SOURCE_URL"},400)}
  if(sourceUrl.protocol!=="https:"||sourceUrl.username||sourceUrl.password||sourceUrl.port||sourceUrl.hash||sourceUrl.hostname!==source.host)return json({ok:false,code:"BAD_SOURCE_URL"},400);
  if(sourceUrl.pathname!==source.path||sourceUrl.searchParams.size!==2||sourceUrl.searchParams.get("SeasonId")!==source.seasonId||sourceUrl.searchParams.get("Level")!==source.level)return json({ok:false,code:"SOURCE_SCOPE_DENIED"},400);
  if(typeof body.evidence!=="string"||!body.evidence.trim()||body.evidence.length>MAX_EVIDENCE_CHARS)return json({ok:false,code:"BAD_EVIDENCE"},400);
  if(!validIso(body.observedAt))return json({ok:false,code:"BAD_OBSERVED_AT"},400);
  if(body.language!=="ru"&&body.language!=="en")return json({ok:false,code:"BAD_LANGUAGE"},400);
  if(body.namedPersonMedia!==false)return json({ok:false,code:"NAMED_PERSON_MEDIA_FORBIDDEN"},400);
  for(const unsafe of ["sourceFeedId","publicationAllowed","calendarMutationAllowed","agentId"])if(unsafe in body)return json({ok:false,code:"UNSAFE_FIELDS_FORBIDDEN"},400);

  const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
  const feed=await db.from("source_feeds").select("id,url,authority_level,active").eq("url",source.feedUrl).maybeSingle();
  if(feed.error||!feed.data||feed.data.active!==true||Number(feed.data.authority_level)<5)return json({ok:false,code:"APPROVED_SOURCE_UNAVAILABLE"},503);

  const {data,error}=await db.rpc("agent_enqueue_official_story_pipeline",{
    p_source_feed_id:feed.data.id,
    p_story_key:body.storyKey,
    p_topic:body.topic,
    p_source_url:sourceUrl.toString(),
    p_evidence:body.evidence,
    p_observed_at:body.observedAt,
    p_language:body.language,
    p_named_person_media:false
  });
  if(error)return json({ok:false,code:"PIPELINE_QUEUE_FAILED"},400);
  if(!data||data.publisherEnqueued!==false)return json({ok:false,code:"UNSAFE_PIPELINE_RECEIPT"},500);
  const ids=[data.researchJobId,data.factCheckJobId,data.editorialWriterJobId,data.qaJobId];
  if(ids.some((id)=>typeof id!=="string"||!/^[0-9a-f-]{36}$/i.test(id)))return json({ok:false,code:"BAD_PIPELINE_RECEIPT"},500);

  return json({
    ok:true,
    storyKey:body.storyKey,
    sourceKey:body.sourceKey,
    sourceFeedId:feed.data.id,
    workflowRunId:identity.run_id||null,
    researchJobId:data.researchJobId,
    factCheckJobId:data.factCheckJobId,
    editorialWriterJobId:data.editorialWriterJobId,
    qaJobId:data.qaJobId,
    reused:data.reused===true,
    publisherEnqueued:false
  });
});
