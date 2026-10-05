import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@6.1.0";

const allowedHosts=new Set(["t.me","www.sports.ru","sports.ru","skisport.ru","www.skisport.ru","vk.ru","www.instagram.com","instagram.com","www.youtube.com","youtube.com"]);
const EVIDENCE_MAX_CHARS=6000;
const jwks=createRemoteJWKSet(new URL("https://token.actions.githubusercontent.com/.well-known/jwks"));
const json=(x:unknown,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{"content-type":"application/json","cache-control":"no-store","x-content-type-options":"nosniff"}});

async function sha256Text(value:string){
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
 return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");
}

async function authorize(req:Request){
 const auth=req.headers.get("authorization")||"";
 if(!auth.startsWith("Bearer ")) throw new Error("AUTH_REQUIRED");
 const {payload}=await jwtVerify(auth.slice(7),jwks,{issuer:"https://token.actions.githubusercontent.com",audience:"winter-sports-media-intake"});
 if(payload.repository!=="alex1seleznev-oss/winter_sport_project") throw new Error("REPOSITORY_DENIED");
 if(payload.ref!=="refs/heads/main") throw new Error("REF_DENIED");
 const workflow=String(payload.workflow_ref||"");
 if(!workflow.includes("/.github/workflows/public-media-watch.yml@refs/heads/main")) throw new Error("WORKFLOW_DENIED");
 if(!["schedule","workflow_dispatch"].includes(String(payload.event_name||""))) throw new Error("EVENT_DENIED");
 return payload;
}

Deno.serve(async(req:Request)=>{
 if(req.method!=="POST") return json({ok:false,code:"METHOD_NOT_ALLOWED"},405);
 let identity:any;
 try{identity=await authorize(req)}catch(e){return json({ok:false,code:e instanceof Error?e.message:"AUTH_DENIED"},401)}
 let body:any;
 try{body=await req.json()}catch{return json({ok:false,code:"BAD_JSON"},400)}
 if(body?.schemaVersion!==2||!Array.isArray(body?.items)||body.items.length<1||body.items.length>100)return json({ok:false,code:"BAD_PACKET"},400);
 if(typeof body.packetHash!=="string"||!/^[a-f0-9]{64}$/.test(body.packetHash))return json({ok:false,code:"BAD_PACKET_HASH"},400);

 const clean:any[]=[];
 for(const i of body.items){
  if(!i||typeof i.url!=="string"||typeof i.sourceUrl!=="string"||typeof i.sourceKey!=="string")return json({ok:false,code:"BAD_ITEM"},400);
  let u:URL,su:URL;
  try{u=new URL(i.url);su=new URL(i.sourceUrl)}catch{return json({ok:false,code:"BAD_URL"},400)}
  if(u.protocol!=="https:"||su.protocol!=="https:"||!allowedHosts.has(u.hostname)||!allowedHosts.has(su.hostname))return json({ok:false,code:"SOURCE_NOT_ALLOWED"},400);
  if(i.calendarMutationAllowed!==false||i.verificationStatus!=="unverified")return json({ok:false,code:"UNSAFE_ITEM_STATE"},400);
  if(!/^[a-f0-9]{64}$/.test(i.revision||"")||!/^[a-f0-9]{64}$/.test(i.contentHash||"")||!/^[a-f0-9]{64}$/.test(i.evidenceHash||""))return json({ok:false,code:"BAD_ITEM_HASH"},400);
  if(typeof i.evidence!=="string"||i.evidence.length>EVIDENCE_MAX_CHARS||typeof i.evidenceTruncated!=="boolean")return json({ok:false,code:"BAD_ITEM_EVIDENCE"},400);
  if(i.mediaOnly===true&&i.evidence!=="")return json({ok:false,code:"BAD_ITEM_EVIDENCE"},400);
  if(i.mediaOnly!==true&&!i.evidence.trim())return json({ok:false,code:"BAD_ITEM_EVIDENCE"},400);
  if(await sha256Text(i.evidence)!==i.evidenceHash)return json({ok:false,code:"BAD_EVIDENCE_HASH"},400);
  clean.push(i);
 }

 const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
 let written=0,jobs=0;
 for(const i of clean){
  let {data:src}=await db.from("source_feeds").select("id").eq("url",i.sourceUrl).maybeSingle();
  if(!src?.id){
   const ins=await db.from("source_feeds").insert({name:i.sourceKey,kind:i.sourceKind||"community",url:i.sourceUrl,authority_level:2,active:true}).select("id").single();
   if(ins.error)return json({ok:false,code:"SOURCE_WRITE_FAILED"},500);
   src=ins.data;
  }

  const item={event_id:null,source_id:src.id,item_kind:"public_reference",title:(i.title||"").slice(0,500)||null,url:i.url,summary:null,published_at:i.publishedAt||null,fetched_at:i.receipt?.fetchedAt||new Date().toISOString(),reliability:i.sourceKind==="official_social"?4:2,review_status:"unreviewed"};
  const ins=await db.from("intelligence_items").upsert(item,{onConflict:"url",ignoreDuplicates:true});
  if(ins.error)return json({ok:false,code:"ITEM_WRITE_FAILED"},500);
  written++;

  const idem="media:"+i.sourceKey+":"+i.revision;
  const sourceEvidence=i.evidence? [{url:i.url,evidence:i.evidence,evidenceHash:i.evidenceHash,truncated:i.evidenceTruncated}] : [];
  const payload={kind:"media_intake_observation",review_status:"awaiting_review",verification_status:"unverified",sourceKey:i.sourceKey,url:i.url,revision:i.revision,contentHash:i.contentHash,evidenceHash:i.evidenceHash,evidenceTruncated:i.evidenceTruncated,sourceEvidence,documentHash:i.receipt?.sha256||null,retrievedAt:i.receipt?.fetchedAt||null,publishedAt:i.publishedAt||null,publishedDate:i.publishedDate||null,timePrecision:i.timePrecision||null,forwardedFrom:i.forwardedFrom||null,topics:Array.isArray(i.topics)?i.topics.slice(0,12):[],parserVersion:i.parserVersion,packetHash:body.packetHash,workflowRunId:body.workflowRunId||identity.run_id||null,calendar_mutation_allowed:false,publication_allowed:false};
  const queued=await db.rpc("agent_record_media_observation",{p_idempotency_key:idem,p_payload:payload,p_source_refs:[i.sourceUrl,i.url]});
  if(queued.error)return json({ok:false,code:"JOB_QUEUE_FAILED"},500);
  jobs++;
 }

 const run=await db.from("ingestion_runs").insert({source_id:null,finished_at:new Date().toISOString(),status:"succeeded",items_seen:clean.length,items_written:written,error_message:null});
 if(run.error)return json({ok:false,code:"RUN_RECEIPT_FAILED"},500);
 return json({ok:true,seen:clean.length,written,jobs,calendarWrites:0,publishedFacts:0});
});
