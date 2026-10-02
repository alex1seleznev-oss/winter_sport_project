import {load} from 'cheerio';
export const FIS_PARSER_VERSION='cc-individual-table/2.0.1';
export class FisContractError extends Error {constructor(code){super(code);this.name='FisContractError';this.code=code}}
const fail=code=>{throw new FisContractError(code)};
const clean=value=>String(value??'').replace(/\s+/gu,' ').trim();
export function seconds(raw){
 if(typeof raw!=='string'||!/^\+?\d+(?::\d{1,2}){0,2}(?:\.\d{1,3})?$/.test(raw))return null;
 const parts=raw.replace(/^\+/,'').split(':').map(Number);
 if(parts.slice(1).some(v=>v>=60)||parts.some(v=>!Number.isFinite(v)))return null;
 return Math.round(parts.reduce((n,v)=>n*60+v,0)*1000)/1000;
}
const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
function parseDate(text){const m=clean(text).match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})\b/);if(!m)return null;const date=`${m[3]}-${String(months.indexOf(m[1])+1).padStart(2,'0')}-${m[2].padStart(2,'0')}`;const parsed=new Date(date+'T00:00:00Z');return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===date?date:null}
export function parseFisDocument(html,{sourceUrl=null,expected={}}={}){
 if(typeof html!=='string'||Buffer.byteLength(html)>2*1024*1024)fail('FIS_DOCUMENT_SIZE_INVALID');
 const $=load(html);$('script,style,noscript,template').remove();
 const root=$('#events-info-results');
 if(root.length!==1||!$('h2,h3,h4').toArray().some(el=>/^official results$/i.test(clean($(el).text()))))fail('FIS_DOCUMENT_CONTRACT_MISMATCH');
 const title=clean($('title').text()),location=clean($('h1').first().text());
 const years=title.match(/\b(20\d{2})\/(20\d{2})\b/);
 const date=parseDate($('time').first().text());
 // Preserve block boundaries even when upstream HTML is minified. Do not mutate result cells.
 const headerDom=$('body').clone();
 headerDom.find('h1,h2,h3,h4,div,p,time,section,article,li,br').append(' ');
 const body=clean(headerDom.text());const at=body.indexOf(location);
 const header=body.slice(at+location.length,at+location.length+1200);
 const identity=header.match(/\b(Men|Women)'s\s+(.+?)\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d/);
 let raceId=null;
 if(sourceUrl){let source;try{source=new URL(sourceUrl)}catch{fail('FIS_SOURCE_INVALID')}
  if(source.protocol!=='https:'||source.hostname!=='www.fis-ski.com'||source.username||source.password||source.port||source.pathname!=='/DB/general/results.html')fail('FIS_SOURCE_INVALID');
  raceId=source.searchParams.get('raceid');if(!/^\d+$/.test(raceId||''))fail('FIS_RACE_ID_MISSING');
 }
 const metadata={raceId,season:years?.[2]??null,eventDate:date,location,gender:identity?identity[1]==='Men'?'men':'women':null,discipline:identity?.[2]??null,documentStatus:'official_web_results',parserVersion:FIS_PARSER_VERSION,sourceUrl};
 for(const [key,value] of Object.entries(expected))if(metadata[key]!==value)fail('FIS_IDENTITY_MISMATCH_'+key.toUpperCase());
 const rows=[];let section='FINISHED';const seen=new Set();
 const statusLabels={'did not start':'DNS','did not finish':'DNF','disqualified':'DSQ','did not qualify':'DNQ','not permitted to start':'NPS'};
 function visit(node){
  if(node.type==='text'||node.type==='comment')return;
  const el=$(node);
  if(el.is('a.table-row')){
   const href=el.attr('href')||'';let athleteUrl;try{athleteUrl=new URL(href,'https://www.fis-ski.com')}catch{fail('FIS_ATHLETE_ID_INVALID')}
   const competitorId=athleteUrl.searchParams.get('competitorid');
   if(athleteUrl.protocol!=='https:'||athleteUrl.username||athleteUrl.password||athleteUrl.hostname!=='www.fis-ski.com'||!/^\d+$/.test(competitorId||''))fail('FIS_ATHLETE_ID_INVALID');
   const cells=el.find('.g-row.justify-sb').first().children('div').toArray().map(c=>clean($(c).text()));
   if(cells.length!==9)fail('FIS_COLUMN_CONTRACT_MISMATCH');
   const [rankRaw,bibRaw,fisCode,athlete,yearRaw,nation,timeRaw,gapRaw,pointsRaw]=cells;
   if(!/^\d+$/.test(bibRaw)||!/^\d{5,8}$/.test(fisCode)||!athlete||!/^\p{L}/u.test(athlete)||!/^\d{4}$/.test(yearRaw)||!/^\w{3}$/.test(nation))fail('FIS_ROW_IDENTITY_INVALID');
   if(seen.has(competitorId))fail('FIS_DUPLICATE_ATHLETE');seen.add(competitorId);
   const rank=/^[1-9]\d*$/.test(rankRaw)?Number(rankRaw):null;
   let elapsed=null,gap=null;
   if(section==='FINISHED'){
    elapsed=seconds(timeRaw);if(!rank||elapsed===null||elapsed<=0)fail('FIS_FINISH_TIME_INVALID');
    if(/^\+/.test(gapRaw))gap=seconds(gapRaw);
    else if(rank===1&&(gapRaw===''||gapRaw==='0.00'||gapRaw===timeRaw))gap=0;
    else if(/^0(?:\.0+)?$/.test(gapRaw))gap=0;
    if(gap===null)fail('FIS_GAP_INVALID');
   }else if(rank!==null||timeRaw||gapRaw)fail('FIS_NONFINISHER_CONTRACT_MISMATCH');
   const points=pointsRaw===''||pointsRaw==='-'?null:/^\d+(\.\d+)?$/.test(pointsRaw)?Number(pointsRaw):fail('FIS_POINTS_INVALID');
   rows.push({rank,bib:Number(bibRaw),fis_code:fisCode,competitor_id:competitorId,athlete,year:Number(yearRaw),nation,status:section,time_raw:timeRaw||null,finish_time_seconds:elapsed,time_behind_seconds:gap,fis_points:points});
   return;
  }
  const label=clean(el.text()).toLowerCase();if(Object.hasOwn(statusLabels,label)){section=statusLabels[label];return;}
  for(const child of node.children||[])visit(child);
 }
 visit(root[0]);
 const candidates=root.find('a.table-row').length;
 if(!rows.length||rows.length!==candidates)fail('FIS_ROW_COVERAGE_MISMATCH');
 const finishers=rows.filter(r=>r.status==='FINISHED');
 if(!finishers.length||finishers[0].rank!==1)fail('FIS_WINNER_MISSING');
 for(let i=1;i<finishers.length;i++)if(finishers[i].rank<finishers[i-1].rank)fail('FIS_RANK_ORDER_INVALID');
 return {metadata,rows,counts:{total:rows.length,finished:finishers.length,dns:rows.filter(r=>r.status==='DNS').length,dnf:rows.filter(r=>r.status==='DNF').length,dsq:rows.filter(r=>r.status==='DSQ').length}};
}
export function parseFisResults(html){return parseFisDocument(html).rows}
