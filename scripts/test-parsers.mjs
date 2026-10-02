import {parseFisResults} from './lib/parse-fis.mjs';
const url='https://www.fis-ski.com/DB/general/results.html?raceid=49485&seasoncode=2026&sector=CC&sectorcode=CC';
const html=await (await fetch(url,{headers:{'user-agent':'WinterSportsHub/1.0'}})).text();
const rows=parseFisResults(html);
if(rows.length<20)throw new Error('FIS parser returned too few rows: '+rows.length);
console.log('FIS parser OK:',rows.length,'rows; winner:',rows[0]);
