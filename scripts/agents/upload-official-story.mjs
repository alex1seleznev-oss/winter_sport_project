import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';

const file=(process.env.OFFICIAL_STORY_FILE||'artifacts/official-story/candidate.json').trim();
let candidate;try{candidate=JSON.parse(readFileSync(file,'utf8'))}catch{throw new Error('OFFICIAL_STORY_FILE_INVALID')}
const required=(key,max)=>{const value=typeof candidate?.[key]==='string'?candidate[key].trim():'';if(!value)throw new Error('OFFICIAL_STORY_'+key.toUpperCase()+'_REQUIRED');if(value.length>max)throw new Error('OFFICIAL_STORY_'+key.toUpperCase()+'_TOO_LONG');return value};
const sourceKey=required('sourceKey',40);if(sourceKey!=='ibu')throw new Error('OFFICIAL_STORY_SOURCE_NOT_ALLOWED');
const storyKey=required('storyKey',180);if(storyKey.length<3||!/^[a-z0-9][a-z0-9._:-]*[a-z0-9]$/.test(storyKey))throw new Error('OFFICIAL_STORY_KEY_INVALID');
const topic=required('topic',300);
const sourceUrlText=required('sourceUrl',2048);let sourceUrl;try{sourceUrl=new URL(sourceUrlText)}catch{throw new Error('OFFICIAL_STORY_SOURCE_URL_INVALID')}
if(sourceUrl.protocol!=='https:'||sourceUrl.hostname!=='www.biathlonworld.com'||sourceUrl.username||sourceUrl.password||sourceUrl.port)throw new Error('OFFICIAL_STORY_SOURCE_URL_INVALID');
const evidence=required('evidence',12000);
const observedAt=required('observedAt',64);const observedMs=Date.parse(observedAt);if(!Number.isFinite(observedMs)||observedMs>Date.now()+5*60_000)throw new Error('OFFICIAL_STORY_OBSERVED_AT_INVALID');
const language=(candidate.language||'ru').trim();if(!['ru','en'].includes(language))throw new Error('OFFICIAL_STORY_LANGUAGE_INVALID');
if(candidate.namedPersonMedia!==false)throw new Error('OFFICIAL_STORY_NAMED_MEDIA_FORBIDDEN');
for(const unsafe of ['sourceFeedId','publicationAllowed','calendarMutationAllowed','agentId'])if(unsafe in candidate)throw new Error('OFFICIAL_STORY_UNSAFE_FIELD_'+unsafe);

const reqUrl=process.env.ACTIONS_ID_TOKEN_REQUEST_URL,reqToken=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
if(!reqUrl||!reqToken)throw new Error('OIDC_ENV_MISSING');
const oidc=await fetch(reqUrl+'&audience='+encodeURIComponent('winter-sports-official-story-intake'),{headers:{authorization:'Bearer '+reqToken},signal:AbortSignal.timeout(15000)});
if(!oidc.ok)throw new Error('OIDC_TOKEN_FAILED_'+oidc.status);
const {value:token}=await oidc.json();if(typeof token!=='string'||!token)throw new Error('OIDC_TOKEN_MISSING');

const body={schemaVersion:1,sourceKey,storyKey,topic,sourceUrl:sourceUrl.toString(),evidence,observedAt:new Date(observedMs).toISOString(),language,namedPersonMedia:false};
const endpoint='https://wmiypacyraepljalppub.supabase.co/functions/v1/official-story-intake';
const res=await fetch(endpoint,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(25000)});
const text=await res.text();if(!res.ok)throw new Error('OFFICIAL_STORY_INTAKE_FAILED_'+res.status+'_'+text.slice(0,160));
let receipt;try{receipt=JSON.parse(text)}catch{throw new Error('OFFICIAL_STORY_BAD_RECEIPT_JSON')}
if(!receipt?.ok||receipt.publisherEnqueued!==false||receipt.sourceKey!==sourceKey)throw new Error('OFFICIAL_STORY_UNSAFE_RECEIPT');
for(const key of ['researchJobId','factCheckJobId','editorialWriterJobId','qaJobId'])if(typeof receipt[key]!=='string'||!/^[0-9a-f-]{36}$/i.test(receipt[key]))throw new Error('OFFICIAL_STORY_BAD_RECEIPT_'+key);
mkdirSync('artifacts/official-story',{recursive:true});
writeFileSync('artifacts/official-story/receipt.json',JSON.stringify({...receipt,sourceUrl:body.sourceUrl,observedAt:body.observedAt},null,2));
console.log(JSON.stringify({ok:true,storyKey,sourceKey,reused:receipt.reused===true,publisherEnqueued:false}));
