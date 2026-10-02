import {load} from 'cheerio';
import {createHash} from 'node:crypto';
export const BIATHLON_PROGRAMME_VERSION='organizer-programme/1.0.1';
const paths=new Map([
 ['kontiolahtibiathlon.com',new Set(['/kontiolahti-biathlon-world-cup/ohjelma-ja-liput/ohjelma','/en/kontiolahti-biathlon-world-cup/program-and-tickets'])],
 ['www.biathlon-hochfilzen.at',new Set(['/competition-program.html'])]
]);
const clean=s=>String(s??'').normalize('NFKC').replace(/\s+/gu,' ').trim();
export function checkProgrammeUrl(value){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||u.search||u.hash||!paths.get(u.hostname)?.has(u.pathname))throw new Error('ORGANIZER_SOURCE_NOT_ALLOWED');return u.href;}
function classify(label){
 const text=label.toLowerCase();
 if(/^(single mixed relay|parisekaviesti)\b/i.test(text))return {kind:'single_mixed_relay',gender:'mixed'};
 if(/^(mixed relay|sekaviesti)\b/i.test(text))return {kind:'mixed_relay',gender:'mixed'};
 const gender=/\b(women|naiset)\b/i.test(text)?'women':/\b(men|miehet)\b/i.test(text)?'men':null;
 if(!gender)return null;
 const kind=/^(individual|normaalikilpailu)\b/i.test(text)?'individual':/^(sprint|pikakilpailu)\b/i.test(text)?'sprint':/^pursuit\b/i.test(text)?'pursuit':/^relay\b/i.test(text)?'relay':null;
 if(!kind&&/^spring,?\s+women\b/i.test(text))return {kind:'sprint',gender,warning:'SOURCE_LABEL_TYPO_SPRING'};
 return kind?{kind,gender}:null;
}
export function parseOrganizerProgramme(html,expected){
 checkProgrammeUrl(expected.url);
 if(typeof html!=='string'||Buffer.byteLength(html)>2*1024*1024)throw new Error('ORGANIZER_DOCUMENT_SIZE');
 const $=load(html);$('script,style,noscript,template,nav,footer').remove();
 const body=clean($('body').text());
 if(!body.toLowerCase().includes(expected.venue.toLowerCase())||!body.includes('2026'))throw new Error('ORGANIZER_IDENTITY_MISMATCH');
 $('br').replaceWith('\n');$('h1,h2,h3,h4,p,li,div').before('\n').after('\n');
 const lines=$('body').text().split(/\n+/).map(clean).filter(Boolean);
 const rows=[];let date=null;const warnings=[];
 for(const line of lines){
  const day=line.match(/^(?:Thursday|Friday|Saturday|Sunday|Torstai|Perjantai|Lauantai|Sunnuntai)[,\s]+(\d{2})[./](\d{2})[./](20\d{2})\s*:?$/i);
  if(day){const candidate=`${day[3]}-${day[2]}-${day[1]}`;const parsed=new Date(candidate+'T12:00:00Z');if(Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==candidate)throw new Error('ORGANIZER_INVALID_DATE');date=candidate;continue;}
  const timed=line.match(/^([01]?\d|2[0-3])[.:]([0-5]\d)\s*:?\s+(.+)$/u);if(!timed)continue;
  const label=timed[3],event=classify(label);if(!event)continue;
  if(!date||date<expected.from||date>expected.to)throw new Error('ORGANIZER_RACE_OUTSIDE_EXPECTED_DATES');
  if(event.warning){if(expected.key!=='kontiolahti-en'||date!=='2026-11-29')throw new Error('UNREVIEWED_SOURCE_TYPO');warnings.push(event.warning)}
  rows.push({date,kind:event.kind,gender:event.gender,rawClock:timed[1].padStart(2,'0')+':'+timed[2],sourceLabel:label,startTimeMsk:null,timeZone:null});
 }
 const keys=rows.map(r=>`${r.date}|${r.kind}|${r.gender}`);
 if(!rows.length||new Set(keys).size!==keys.length)throw new Error('ORGANIZER_EMPTY_OR_DUPLICATE_PROGRAMME');
 return {stage:expected.stage,sourceUrl:expected.url,rows,warnings:[...new Set(warnings)],parserVersion:BIATHLON_PROGRAMME_VERSION,timeInterpretation:'raw_source_clock_only'};
}
export function compareOrganizerProgramme(expected,parsed){
 const old=new Map(expected.rows.map(r=>[r.slice(0,3).join('|'),r[3]]));const next=new Map(parsed.rows.map(r=>[[r.date,r.kind,r.gender].join('|'),r.rawClock]));const changes=[];
 for(const [key,clock] of next)if(!old.has(key)||old.get(key)!==clock)changes.push({key,kind:old.has(key)?'source_clock_changed':'new_source_slot',before:old.get(key)??null,after:clock});
 for(const [key,clock] of old)if(!next.has(key))changes.push({key,kind:'missing_slot_not_cancellation',before:clock,after:null});
 changes.sort((a,b)=>a.key.localeCompare(b.key));return {changes,fingerprint:createHash('sha256').update(JSON.stringify(changes)).digest('hex'),databaseWrites:0};
}
export function sourceClockConflicts(programmes){
 const groups=new Map();for(const p of programmes)for(const r of p.rows){const key=[p.stage,r.date,r.kind,r.gender].join('|');if(!groups.has(key))groups.set(key,[]);groups.get(key).push({url:p.sourceUrl,clock:r.rawClock})}
 return [...groups].filter(([,values])=>new Set(values.map(v=>v.clock)).size>1).map(([key,sources])=>({key,sources,startTimeMsk:null,resolution:'human_review_required'}));
}
