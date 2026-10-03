// Local reference metadata only. Never stores article bodies, source claims or remote URLs.
export const READING_KEY='wsh.reading-list.v1';
export const MAX_SAVED=100,MAX_READING_BYTES=40000;
export const emptyReading=()=>({version:1,items:[]});
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export const validArticleSlug=s=>typeof s==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)&&s.length>=3&&s.length<=90;
export const validArticleRevision=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
function exactKeys(v,keys){return record(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k))}
export function parseReading(raw,now=Date.now()){
 if(raw===null)return emptyReading();
 if(typeof raw!=='string'||raw.length>MAX_READING_BYTES)throw new Error('READING_INVALID');
 let data;try{data=JSON.parse(raw)}catch{throw new Error('READING_INVALID')}
 if(!exactKeys(data,['version','items'])||data.version!==1||!Array.isArray(data.items)||data.items.length>MAX_SAVED)throw new Error('READING_INVALID');
 const seen=new Set();
 for(const x of data.items){if(!exactKeys(x,['slug','revision','read','savedAt'])||!validArticleSlug(x.slug)||!validArticleRevision(x.revision)||typeof x.read!=='boolean'||!Number.isSafeInteger(x.savedAt)||x.savedAt<1577836800000||x.savedAt>now+300000||seen.has(x.slug))throw new Error('READING_INVALID');seen.add(x.slug)}
 return {version:1,items:data.items.map(({slug,revision,read,savedAt})=>({slug,revision,read,savedAt}))};
}
export function changeReading(data,action,now=Date.now()){
 const current=parseReading(JSON.stringify(data),now);
 if(!record(action)||!validArticleSlug(action.slug)||!['save','remove','read'].includes(action.kind))throw new Error('READING_ACTION');
 if(action.kind==='remove')return {version:1,items:current.items.filter(x=>x.slug!==action.slug)};
 if(!validArticleRevision(action.revision))throw new Error('READING_ACTION');
 const old=current.items.find(x=>x.slug===action.slug);
 if(action.kind==='save'){
  if(old)return current;
  if(current.items.length>=MAX_SAVED)throw new Error('READING_LIMIT');
  return {version:1,items:[...current.items,{slug:action.slug,revision:action.revision,read:false,savedAt:now}]};
 }
 if(typeof action.read!=='boolean'||!old)throw new Error('READING_NOT_SAVED');
 return {version:1,items:current.items.map(x=>x.slug===action.slug?{...x,revision:action.revision,read:action.read}:x)};
}
export function readingState(entry,revision){if(!entry)return 'not_saved';if(entry.revision!==revision)return 'updated';return entry.read?'read':'unread'}
export function readingRows(data,articles){
 const bySlug=new Map(articles.map(a=>[a.slug,a]));
 return data.items.map(entry=>{const article=bySlug.get(entry.slug)||null;return {entry,article,state:article?readingState(entry,article.bodySha256):'unavailable'}}).sort((a,b)=>b.entry.savedAt-a.entry.savedAt||a.entry.slug.localeCompare(b.entry.slug,'en'));
}
