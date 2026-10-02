import {parseFisResults,seconds} from './lib/parse-fis.mjs';
const URL=process.env.FIS_RESULT_URL||'https://www.fis-ski.com/DB/general/results.html?raceid=49485&seasoncode=2026&sector=CC&sectorcode=CC';
const r=await fetch(URL,{headers:{'user-agent':'WinterSportsHub/1.0'}});if(!r.ok)throw new Error('FIS '+r.status);
const html=await r.text();const rows=parseFisResults(html);
console.log(JSON.stringify({source:'FIS',url:URL,rows:rows.length,sample:rows.slice(0,5)},null,2));
const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(base&&key&&rows.length){const headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'};
 const athletes=[...new Map(rows.map(x=>[x.athlete+'|'+x.nation,{full_name:x.athlete,sport:'cross_country',nation:x.nation,external_ids:{fis_source_name:x.athlete,yob:x.year}}])).values()];
 const wr=await fetch(base+'/rest/v1/athletes?on_conflict=full_name,sport,nation',{method:'POST',headers,body:JSON.stringify(athletes)});if(!wr.ok)throw new Error(await wr.text());
}
