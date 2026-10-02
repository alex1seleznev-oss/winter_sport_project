import {parseFisCalendar} from './lib/parse-fis-calendar.mjs';
const URL='https://www.fis-ski.com/DB/cross-country/calendar-results.html?categorycode=WC&seasoncode=2027&seasonmonth=X-2027&sectorcode=CC';
const r=await fetch(URL,{headers:{'user-agent':'WinterSportsHub/1.0'}});if(!r.ok)throw new Error('FIS calendar '+r.status);
const html=await r.text();const events=parseFisCalendar(html);
console.log(JSON.stringify({source:'FIS Calendar 2027',events:events.length,sample:events.slice(0,5)},null,2));
if(events.length<8)throw new Error('Calendar parser regression: only '+events.length+' events');
