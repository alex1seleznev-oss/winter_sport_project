import {load} from 'cheerio';

export const FIS_EVENT_DETAIL_VERSION='fis-event-detail/1.0.0';
const months={Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
const clean=s=>String(s??'').normalize('NFKC').replace(/\s+/gu,' ').trim();

export function checkFisEventDetailUrl(value){
 const u=new URL(value);
 if(u.protocol!=='https:'||u.hostname!=='www.fis-ski.com'||u.pathname!=='/DB/general/event-details.html')throw new Error('FIS_EVENT_SOURCE_NOT_ALLOWED');
 if(!/^\d+$/.test(u.searchParams.get('eventid')||'')||!/^\d{4}$/.test(u.searchParams.get('seasoncode')||'')||u.searchParams.get('sectorcode')!=='CC')throw new Error('FIS_EVENT_SOURCE_IDENTITY');
 return u;
}

function undouble(value){
 const tokens=clean(value).split(' ');
 for(let i=1;i<tokens.length;i++){
  const a=tokens.slice(0,i).join(' '),b=tokens.slice(i).join(' ');
  if(a===b)return a;
 }
 throw new Error('FIS_EVENT_LABEL_CONTRACT');
}

export function parseFisEventDetail(html,{sourceUrl}){
 const url=checkFisEventDetailUrl(sourceUrl);
 if(typeof html!=='string'||Buffer.byteLength(html)>3*1024*1024)throw new Error('FIS_EVENT_DOCUMENT_SIZE');
 const $=load(html);$('script,style,noscript,template,nav,footer').remove();
 const text=clean($('body').text());
 const venue=clean($('h1').first().text());
 if(!venue||!text.includes('FIS Cross-Country World Cup'))throw new Error('FIS_EVENT_IDENTITY');
 const season=Number(url.searchParams.get('seasoncode'));
 const re=/(\d{2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\s+(.+?)\s+(WC)\s+([MWA])\s+\5\s+\6(?:\s|$)/gu;
 const rows=[];let m;
 while((m=re.exec(text))){
  const month=months[m[2]],year=Number(month)>=7?season-1:season;
  rows.push({date:`${year}-${month}-${m[1]}`,codex:m[3],event:undouble(m[4]),category:m[5],gender:m[6]==='M'?'men':m[6]==='W'?'women':'mixed'});
 }
 if(!rows.length)throw new Error('FIS_EVENT_ROW_CONTRACT');
 if(new Set(rows.map(r=>r.codex)).size!==rows.length)throw new Error('FIS_EVENT_DUPLICATE_CODEX');
 return {venue,eventId:url.searchParams.get('eventid'),seasonCode:String(season),sourceUrl:url.href,parserVersion:FIS_EVENT_DETAIL_VERSION,rows};
}

export function summarizeFisSessions(parsed){
 return {rows:parsed.rows.length,qualification:parsed.rows.filter(r=>/Qualification/i.test(r.event)).length,finals:parsed.rows.filter(r=>/Final/i.test(r.event)).length,codex:parsed.rows.map(r=>r.codex).sort()};
}
