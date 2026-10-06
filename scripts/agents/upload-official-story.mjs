import {mkdirSync,writeFileSync} from 'node:fs';

const required=(name,max)=>{const value=(process.env[name]||'').trim();if(!value)throw new Error(name+'_REQUIRED');if(value.length>max)throw new Error(name+'_TOO_LONG');return value};
const sourceFeedId=Number(required('OFFICIAL_SOURCE_FEED_ID',20));
if(!Number.isSafeInteger(sourceFeedId)||sourceFeedId<1)throw new Error('OFFICIAL_SOURCE_FEED_ID_INVALID');
const storyKey=required('OFFICIAL_STORY_KEY',180);
if(storyKey.length<3||!/^[a-z0-9][a-z0-9._:-]*[a-z0-9]$/.test(storyKey))throw new Error('OFFICIAL_STORY_KEY_INVALID');
const topic=required('OFFICIAL_STORY_TOPIC',300);
const sourceUrlText=required('OFFICIAL_STORY_SOURCE_URL',2048);
let sourceUrl;try{sourceUrl=new URL(sourceUrlText)}catch{throw new Error('OFFICIAL_STORY_SOURCE_URL_INVALID')}
if(sourceUrl.protocol!=='https:'||sourceUrl.username||sourceUrl.password||sourceUrl.port)throw new Error('OFFICIAL_STORY_SOURCE_URL_INVALID');
const evidence=required('OFFICIAL_STORY_EVIDENCE',12000);
const observedAt=required('OFFICIAL_STORY_OBSERVED_AT',64);
const observedMs=Date.parse(observedAt);if(!Number.isFinite(observedMs)||observedMs>Date.now()+5*60_000)throw new Error('OFFICIAL_STORY_OBSERVED_AT_INVALID');
const language=(process.env.OFFICIAL_STORY_LANGUAGE||'ru').trim();if(!['ru','en'].includes(language))throw new Error('OFFICIAL_STORY_LANGUAGE_INVALID');

const reqUrl=process.env.ACTIONS_ID_TOKEN_REQUEST_URL,reqToken=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
if(!reqUrl||!reqToken)throw new Error('OIDC_ENV_MISSING');
const oidc=await fetch(reqUrl+'&audience='+encodeURIComponent('winter-sports-official-story-intake'),{headers:{authorization:'Bearer '+reqToken},signal:AbortSignal.timeout(15000)});
if(!oidc.ok)throw new Error('OIDC_TOKEN_FAILED_'+oidc.status);
const {value:token}=await oidc.json();if(typeof token!=='string'||!token)throw new Error('OIDC_TOKEN_MISSING');

const body={schemaVersion:1,sourceFeedId,storyKey,topic,sourceUrl:sourceUrl.toString(),evidence,observedAt:new Date(observedMs).toISOString(),language,namedPersonMedia:false};
const endpoint='https://wmiypacyraepljalppub.supabase.co/functions/v1/official-story-intake';
const res=await fetch(endpoint,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(25000)});
const text=await res.text();if(!res.ok)throw new Error('OFFICIAL_STORY_INTAKE_FAILED_'+res.status+'_'+text.slice(0,300));
let receipt;try{receipt=JSON.parse(text)}catch{throw new Error('OFFICIAL_STORY_BAD_RECEIPT_JSON')}
if(!receipt?.ok||receipt.publisherEnqueued!==false)throw new Error('OFFICIAL_STORY_UNSAFE_RECEIPT');
for(const key of ['researchJobId','factCheckJobId','editorialWriterJobId','qaJobId'])if(typeof receipt[key]!=='string'||!/^[0-9a-f-]{36}$/i.test(receipt[key]))throw new Error('OFFICIAL_STORY_BAD_RECEIPT_'+key);
mkdirSync('artifacts/official-story',{recursive:true});
writeFileSync('artifacts/official-story/receipt.json',JSON.stringify({...receipt,sourceUrl:body.sourceUrl,observedAt:body.observedAt},null,2));
console.log(JSON.stringify({ok:true,storyKey,sourceFeedId,reused:receipt.reused===true,publisherEnqueued:false}));
