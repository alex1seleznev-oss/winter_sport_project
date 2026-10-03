import {discoverRaceLinks} from './lib/fis-event-discovery.mjs';
import {parseFisResults} from './lib/parse-fis.mjs';
const seed=process.argv[2]||'https://www.fis-ski.com/DB/general/results.html?raceid=49487&sectorcode=CC';
const html=await (await fetch(seed,{headers:{'user-agent':'WinterSportsHub/1.0'}})).text();
const races=discoverRaceLinks(html);
console.log('discovered',races.length,'races');
for(const race of races){try{const h=await (await fetch(race.url,{headers:{'user-agent':'WinterSportsHub/1.0'}})).text();const rows=parseFisResults(h);console.log(JSON.stringify({race_id:race.race_id,label:race.label,rows:rows.length,url:race.url}));}catch(e){console.error(race.race_id,String(e))}}
