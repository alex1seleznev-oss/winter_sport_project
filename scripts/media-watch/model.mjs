import {createHash} from 'node:crypto';import {isIP} from 'node:net';
export const VERSION='public-media-watch/2.2.0';
export const EVIDENCE_MAX_CHARS=6000;
export const text=value=>String(value??'').normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/gu,' ').trim();
export function hash(value){return createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex')}
export function reference(value,base){if(typeof value!=='string'||value.length>2048||/[\u0000-\u0020\u007f]/.test(value))return null;try{const u=new URL(value,base),h=u.hostname;if(u.protocol!=='https:'||u.username||u.password||u.port||isIP(h)||h.includes(':')||!h.includes('.')||h.endsWith('.local')||h.endsWith('.internal'))return null;for(const k of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid|ysclid)$/i.test(k))u.searchParams.delete(k);if([...u.searchParams.keys()].some(k=>/token|password|secret|signature|^sig$/i.test(k)))return null;u.hash='';return u.href}catch{return null}}
export function validDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T12:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value;}
export function timestamp(value){if(typeof value!=='string'||!/(?:Z|[+-]\d{2}:?\d{2}|GMT|UTC)\s*$/i.test(value))return null;if(/^\d{4}-\d{2}-\d{2}/.test(value)&&!validDate(value.slice(0,10)))return null;const ms=Date.parse(value);return Number.isFinite(ms)?new Date(ms).toISOString():null;}
export function dateEvidence(value){if(!value)return {publishedAt:null,publishedDate:null,timeWarning:null};const at=timestamp(value);if(at)return {publishedAt:at,publishedDate:null,timeWarning:null};if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?)?$/.test(value)&&validDate(value.slice(0,10)))return {publishedAt:null,publishedDate:value.slice(0,10),timeWarning:value.length>10?'SOURCE_TIMEZONE_NOT_GIVEN':null};return {publishedAt:null,publishedDate:null,timeWarning:'SOURCE_DATE_FORMAT_UNRESOLVED'};}
export function classify(raw,source,url){
 const t=text(raw).toLowerCase().replaceAll('ё','е'),topics=[];
 for(const [key,re] of [['calendar',/расписан|календар|перенос|отмен|старт-лист/],['results',/результат|побед|пьедестал|протокол/],['preparation',/тренир|подготовк|сборы|сборе/],['broadcast',/трансляц|эфир|смотреть/],['eligibility',/допуск|нейтральн|отстран|санкци|\bain\b/],['interview',/интервью|рассказал|заявил/],['team_change',/сменил.*регион|перешел|состав.*сборн/]])if(re.test(t))topics.push(key);
 const path=new URL(url).pathname;
 let sport=source.sport!=='mixed'?source.sport:/\/biathlon\//.test(path)||/биатлон|biathlon/.test(t)?'biathlon':/\/(skiing|cross-country|ski-roller|rollerski)\//.test(path)||/лыжн|лыжеролл|кл[эе]бо|большунов|диггинс/.test(t)?'cross_country':null;
 if(source.kind==='media'&&/горнолыж|фрирайд|сноубордист|линдси вонн/.test(t)&&!/лыжные гонки|биатлон/.test(t))sport=null;
 return {sport,topics:topics.length?topics:['context'],sensitive:/травм|болезн|операци|допинг|беремен|здоров|медицин|погиб|умер|ушел из жизни|родов|мамой/.test(t),rumor:/слух|неофициальн|инсайд|предполож|говорят|по данным источника/.test(t),advert:/промокод|розыгрыш|букмекер|ставки на|erid\s*:/.test(t)};
}
export function normalize(row,source,receipt,now=new Date()){
 const url=reference(row.url);if(!url)throw new Error('UNSAFE_REFERENCE');const body=text(row.text),publishedAt=timestamp(row.publishedAt);if(row.publishedAt&&!publishedAt)throw new Error('INVALID_PUBLISH_TIME');
 if(publishedAt&&Date.parse(publishedAt)>now.getTime()+300000)return {skip:'future_publication'};
 if(publishedAt&&Date.parse(publishedAt)<now.getTime()-120*86400000)return {skip:'outside_120_day_window'};
 const tags=classify(body,source,url);if(!tags.sport)return {skip:'unrelated_sport'};if(tags.advert)return {skip:'advertisement'};
 const forwardedFrom=reference(row.forwardedFrom),links=[...new Set((row.links||[]).map(u=>reference(u)).filter(Boolean))].slice(0,8);const contentHash=hash(body.toLowerCase());
 const evidence=body.slice(0,EVIDENCE_MAX_CHARS),evidenceTruncated=body.length>evidence.length,evidenceHash=hash(evidence);
 const title=tags.sensitive?'Сообщение требует отдельной проверки чувствительных сведений':body?body.split(' ').slice(0,12).join(' ').slice(0,160):'Публикация без текстовой подписи';
 const sourceUrl=source.adapter==='telegram'?'https://t.me/'+source.handle:source.url;
 const item={sourceKey:source.key,sourceUrl,sourceKind:source.kind,url,externalId:String(row.externalId),title,publishedAt,publishedDate:validDate(row.publishedDate)?row.publishedDate:null,timePrecision:publishedAt?'timestamp':validDate(row.publishedDate)?'date':'unknown',timeWarning:row.timeWarning||null,forwardedFrom,links,contentHash,evidence,evidenceHash,evidenceTruncated,topics:tags.topics,sport:tags.sport,sensitive:tags.sensitive,claimStatus:tags.rumor?'rumor':'unverified',mediaOnly:!body,contentLength:body.length};
 const revision=hash(item);return {item:{...item,revision,parserVersion:VERSION,verificationStatus:'unverified',calendarMutationAllowed:false,receipt:{...receipt}}};
}
export function syndication(items){const groups=new Map(),byUrl=new Map(items.map(i=>[i.url,i]));const root=item=>{let url=item.url;const seen=new Set();for(let i=0;i<10;i++){if(seen.has(url))return null;seen.add(url);const next=byUrl.get(url)?.forwardedFrom;if(!next)return url;url=next;}return null;};
 for(const item of items){const origin=root(item);if(origin&&(origin!==item.url||items.some(i=>i.forwardedFrom===item.url))){const key='forward:'+origin;if(!groups.has(key))groups.set(key,new Set());groups.get(key).add(item.url);if(byUrl.has(origin))groups.get(key).add(origin)}if(!item.mediaOnly&&item.contentLength>=40){const key='text:'+item.contentHash;if(!groups.has(key))groups.set(key,new Set());groups.get(key).add(item.url)}}
 return [...groups].filter(([,v])=>v.size>1).map(([key,urls])=>({key,urls:[...urls].sort(),independentConfirmation:false}));}
export function delta(previous,current){
 const empty={baselineAvailable:false,newReferences:[],changedReferences:[],missingNotDeletion:[],sourceStateChanges:[],notify:false};
 if(!previous||previous.parserVersion!==current.parserVersion||previous.configHash!==current.configHash){const key=i=>i.sourceKey+'|'+i.url+'|'+i.revision;return {...empty,newReferences:current.items.map(key)};}
 const key=i=>i.sourceKey+'|'+i.url,old=new Map(previous.items.map(i=>[key(i),i])),next=new Map(current.items.map(i=>[key(i),i]));
 const newReferences=[...next.keys()].filter(k=>!old.has(k)),changedReferences=[...next.keys()].filter(k=>old.has(k)&&old.get(k).revision!==next.get(k).revision),missingNotDeletion=[...old.keys()].filter(k=>!next.has(k));
 const oldStates=new Map(previous.sources.map(s=>[s.key,s.status]));const sourceStateChanges=current.sources.filter(s=>oldStates.get(s.key)!==s.status).map(s=>({key:s.key,from:oldStates.get(s.key)||'unknown',to:s.status}));
 return {baselineAvailable:true,newReferences,changedReferences,missingNotDeletion,sourceStateChanges,notify:sourceStateChanges.length>0||changedReferences.length>0};
}
