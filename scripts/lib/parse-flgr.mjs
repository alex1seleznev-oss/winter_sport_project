import {load} from 'cheerio';
export const FLGR_PARSER_VERSION='flgr-results/1.0.2';
export class FlgrContractError extends Error{constructor(code){super(code);this.name='FlgrContractError';this.code=code}}
const fail=code=>{throw new FlgrContractError(code)};
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/gu,' ').trim();
const dateRe=/(?:^|[^0-9])(\d{2})\.(\d{2})\.(20\d{2})(?=$|[^0-9])/;
const rangeRe=/(?:^|[^0-9.])(\d{2})\.(\d{2})\.(20\d{2})\s*[-–—]\s*(\d{2})\.(\d{2})\.(20\d{2})(?=$|[^0-9.])/;
function iso(d,m,y){const s=`${y}-${m}-${d}`;const parsed=new Date(s+'T00:00:00Z');if(Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==s)fail('FLGR_DATE_INVALID');return s}
// FLGR's live calendar uses 26-29.11.2026, not two repeated full dates.
// The year and month may be shared only when explicitly present in that cell.
export function parseFlgrDateRange(value){
 const text=clean(value);let start,end;
 const full=text.match(rangeRe);
 const sharedYear=text.match(/^(\d{2})\.(\d{2})\s*[-–—]\s*(\d{2})\.(\d{2})\.(20\d{2})$/);
 const sharedMonth=text.match(/^(\d{2})\s*[-–—]\s*(\d{2})\.(\d{2})\.(20\d{2})$/);
 if(full){start=iso(full[1],full[2],full[3]);end=iso(full[4],full[5],full[6]);}
 else if(sharedYear){start=iso(sharedYear[1],sharedYear[2],sharedYear[5]);end=iso(sharedYear[3],sharedYear[4],sharedYear[5]);}
 else if(sharedMonth){start=iso(sharedMonth[1],sharedMonth[3],sharedMonth[4]);end=iso(sharedMonth[2],sharedMonth[3],sharedMonth[4]);}
 else return null;
 if(start>end)fail('FLGR_DATE_RANGE_REVERSED');
 return {start_date:start,end_date:end};
}
export function parseFlgrCalendar(html){
 if(typeof html!=='string'||Buffer.byteLength(html)>2*1024*1024)fail('FLGR_DOCUMENT_SIZE_INVALID');
 const $=load(html);$('script,style,noscript,template').remove();
 const stages=[];
 $('tr').each((_,tr)=>{
   const row=$(tr);
   const cells=row.find('th,td').toArray().map(td=>clean($(td).text())).filter(Boolean);
   const text=clean(cells.join(' '));
   if(!/(Этап\s+кубка\s+России|ЭКР)/iu.test(text))return;
   const link=row.find('a[href*="/results/"]').first().attr('href')||'';
   if(!link)return;
   let source;try{source=new URL(link,'https://flgr-results.ru');}catch{fail('FLGR_SOURCE_INVALID')}
   if(source.protocol!=='https:'||source.username||source.password||source.port||source.hash||!['flgr-results.ru','www.flgr-results.ru','fis.flgr-results.ru','data.flgr-results.ru'].includes(source.hostname))fail('FLGR_SOURCE_INVALID');
   const m=source.pathname.match(/^\/results\/(\d+)\/?$/);if(!m)fail('FLGR_SOURCE_INVALID');
   const period=cells.map(parseFlgrDateRange).find(Boolean);
   if(!period)fail('FLGR_CALENDAR_DATE_CONTRACT_MISMATCH');
   stages.push({event_id:m[1],href:source.href,...period,text});
 });
 if(!stages.length)fail('FLGR_CALENDAR_CONTRACT_MISMATCH');
 const unique=new Map();
 for(const stage of stages){const previous=unique.get(stage.event_id);if(previous&&(previous.start_date!==stage.start_date||previous.end_date!==stage.end_date))fail('FLGR_CALENDAR_DUPLICATE_CONFLICT');unique.set(stage.event_id,stage);}
 return [...unique.values()];
}
function inferGender(text){if(/(?:^|[^а-яё])(женщины|жен\.?|women)(?=$|[^а-яё])/iu.test(text))return'female';if(/(?:^|[^а-яё])(мужчины|муж\.?|men)(?=$|[^а-яё])/iu.test(text))return'male';return null}
export function parseFlgrCompetition(html,{sourceUrl=null}={}){
 if(typeof html!=='string'||Buffer.byteLength(html)>2*1024*1024)fail('FLGR_DOCUMENT_SIZE_INVALID');
 const $=load(html);$('script,style,noscript,template').remove();
 const heading=clean($('h1').first().text()||$('title').text());
 const rows=[];
 $('tr').each((_,tr)=>{
   const cells=$(tr).find('th,td').toArray().map(td=>clean($(td).text())).filter(Boolean);
   if(cells.length<2)return;
   const text=clean(cells.join(' | '));const dm=text.match(dateRe);if(!dm)return;
   const code=cells.find(x=>/^\d{4,6}$/.test(x)&&!/^20\d{2}$/.test(x))||text.match(/(?:^|\s)(\d{4,6})(?=\s|$)/)?.[1]||null;
   if(!code)return;
   const derived=/(чистое\s+время|общий\s+зач[её]т|итоговый\s+зач[её]т)/iu.test(text);
   const cancelled=/(?:^|[^а-яё])отмен[а-яё]*(?=$|[^а-яё])/iu.test(text);
   const change=(text.match(/(?:Изменено|Перенесено|Добавлено)[^.]*\.?/iu)||[])[0]||null;
   rows.push({code,date:iso(dm[1],dm[2],dm[3]),gender:inferGender(text),status:cancelled?'cancelled':'scheduled',derived,change_note:change,text});
 });
 if(!rows.length)fail('FLGR_COMPETITION_CONTRACT_MISMATCH');
 let eventId=null;
 if(sourceUrl){const u=new URL(sourceUrl);if(!['www.flgr-results.ru','flgr-results.ru','fis.flgr-results.ru','data.flgr-results.ru'].includes(u.hostname))fail('FLGR_SOURCE_INVALID');eventId=u.pathname.match(/\/results\/(\d+)/)?.[1]||null}
 return {metadata:{eventId,heading,sourceUrl,parserVersion:FLGR_PARSER_VERSION},rows,competitionRows:rows.filter(r=>!r.derived),counts:{all:rows.length,competition:rows.filter(r=>!r.derived).length,cancelled:rows.filter(r=>!r.derived&&r.status==='cancelled').length,changed:rows.filter(r=>!r.derived&&r.change_note).length}};
}
