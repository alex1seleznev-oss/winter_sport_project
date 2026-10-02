import {load} from 'cheerio';
import {createHash} from 'node:crypto';
const stages={I:'1',II:'2',III:'3',IV:'4',V:'5',VI:'6',VII:'7',VIII:'8'};
const normalize=s=>s.normalize('NFKC').replace(/[–—]/g,'-').replace(/\s+/g,' ').trim();
export const PROGRAMME_PARSER_VERSION='flgr-programme/1.0.0';
export function parseFlgrProgramme(html){
 const $=load(html);$('script,style,noscript,template').remove();
 const heading=normalize($('h1').first().text());
 if(!/ФосАгро Кубок России.*2026-2027/.test(heading))throw new Error('FLGR_SEASON_IDENTITY_MISMATCH');
 $('br').replaceWith('\n');$('p,div,h1,h2,h3,li').append('\n');
 const lines=$('body').text().split(/\n+/).map(normalize).filter(Boolean);
 const start=lines.findIndex(l=>l==='Проект Календаря');if(start<0)throw new Error('FLGR_CERTAINTY_REVIEW_REQUIRED');
 const rows=[];let stage=null;
 for(const line of lines.slice(start+1)){
  if(line==='Все новости')break;
  const stageMatch=line.match(/^(VIII|VII|VI|IV|V|III|II|I) Этап Кубка России/);
  if(stageMatch){stage=stages[stageMatch[1]];continue}
  if(/^Финал Кубка России/.test(line)){stage='final';continue}
  const match=line.match(/^(\d{1,2})\.(\d{1,2})\s*-\s*(.+)$/);if(!match)continue;
  if(!stage)throw new Error('FLGR_STAGE_MISSING');
  const month=Number(match[2]),date=`${month>=10?'2026':'2027'}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}`;
  const parsed=new Date(date+'T00:00:00Z');if(Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==date||date<'2026-10-01'||date>'2027-05-31')throw new Error('FLGR_DATE_INVALID');
  if(match[3].length>300)throw new Error('FLGR_PROGRAMME_LINE_TOO_LONG');
  rows.push([stage,date,match[3]]);
 }
 if(rows.length<1||rows.length>80)throw new Error('FLGR_EMPTY_OR_OVERSIZED_PROGRAMME');
 if(new Set(rows.map(r=>r[0]+'|'+r[1])).size!==rows.length)throw new Error('FLGR_DUPLICATE_SLOT_REVIEW_REQUIRED');
 return {season:'2026/27',certainty:'provisional',rows};
}
export function compareProgramme(baseline,observed){
 if(baseline.season!==observed.season||baseline.certainty!==observed.certainty)throw new Error('PROGRAMME_IDENTITY_REVIEW_REQUIRED');
 const old=new Map(baseline.rows.map(row=>[row[0]+'|'+row[1],row]));const next=new Map(observed.rows.map(row=>[row[0]+'|'+row[1],row]));
 if(old.size!==baseline.rows.length||next.size!==observed.rows.length)throw new Error('DUPLICATE_PROGRAMME_SLOT');
 const changes=[];
 for(const [key,row] of next){const before=old.get(key);if(!before||normalize(before[2])!==normalize(row[2]))changes.push({kind:before?'format_changed':'new_programme_slot',key,previous:before||null,proposed:row,status:'pending_review'})}
 for(const [key,row] of old)if(!next.has(key))changes.push({kind:'missing_from_source_not_cancellation',key,previous:row,proposed:null,status:'pending_review'});
 changes.sort((a,b)=>a.key.localeCompare(b.key));
 const fingerprint=createHash('sha256').update(JSON.stringify({season:baseline.season,sourceUrl:baseline.sourceUrl,changes})).digest('hex');
 return {fingerprint,changes,requiresAttention:changes.length>0,mayPublish:false};
}
