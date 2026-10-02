const BASE='https://www.flgr-results.ru';
const SUPABASE=process.env.SUPABASE_URL;
const KEY=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!SUPABASE||!KEY){console.log('FLGR discovery mode: secrets not configured; source fetch only.');}
async function fetchText(url){const r=await fetch(url,{headers:{'user-agent':'WinterSportsHub/1.0'}});if(!r.ok)throw new Error(url+' '+r.status);return r.text()}
async function db(path,body){if(!SUPABASE||!KEY)return;const r=await fetch(SUPABASE+'/rest/v1/'+path,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(body)});if(!r.ok)throw new Error(await r.text())}
const [athletes,results]=await Promise.all([fetchText(BASE+'/athletes'),fetchText(BASE+'/results')]);
const snapshot={source:'FLGR',checked_at:new Date().toISOString(),athletes_page_bytes:athletes.length,results_page_bytes:results.length,athletes_has_fis_code:/FIS код/i.test(athletes),results_has_competition:/Соревнование/i.test(results)};
console.log(JSON.stringify(snapshot,null,2));
await db('intelligence_items?on_conflict=url',[{item_kind:'source_snapshot',title:'FLGR source snapshot',url:BASE+'/results',summary:JSON.stringify(snapshot),published_at:new Date().toISOString(),reliability:5}]);
