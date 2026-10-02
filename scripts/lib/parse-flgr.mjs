import {load} from 'cheerio';
export const FLGR_PARSER_VERSION='flgr-results/1.0.0';
export class FlgrContractError extends Error{constructor(code){super(code);this.name='FlgrContractError';this.code=code}}
const fail=code=>{throw new FlgrContractError(code)};
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/gu,' ').trim();
const dateRe=/\b(\d{2})\.(\d{2})\.(20\d{2})\b/;
const rangeRe=/\b(\d{2})\.(\d{2})\.(20\d{2})\s*[-–—]\s*(\d{2})\.(\d{2})\.(20\d{2})\b/;
function iso(d,m,y){const s=`${y}-${m}-${d}`;const parsed=new Date(s+'T00:00:00Z');if(Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==s)fail('FLGR_DATE_INVALID');return s}
export function parseFlgrCalendar(html){
 if(typeof html!=='string'||Buffer.byteLength(html)>2*1024*1024)fail('FLGR_DOCUMENT_SIZE_INVALID');
 const $=load(html);$('script,style,noscript,template').remove();
 const stages=[];
 $('tr').each((_,tr)=>{
   const row=$(tr);const text=clean(row.text());const link=row.find('a[href*="/results/"]').first().attr('href')||'';
   const m=link.match(/\/results\/(\d+)/);const period=text.match(rangeRe);
   if(!m||!period||!/(Этап\s+кубка\s+России|ЭКР)/iu.test(text))return;
   const href=new URL(link,'https://www.flgr-results.ru').href;
   stages.push({event_id:m[1],href,start_date:iso(period[1],period[2],period[3]),end_date:iso(period[4],period[5],period[6]),text});
 });
 if(!stages.length)fail('FLGR_CALENDAR_CONTRACT_MISMATCH');
 const unique=new Map(stages.map(s=>[s.event_id,s]));
 return [...unique.values()];
}
function inferGender(text){if(/(женщины|жен\\.?|women)/iu.test(text))return'female';if(/(мужчины|муж\\.?|men)/iu.test(text))return'male';return null}
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
   const cancelled=/\bотмен[а-яё]*\b/iu.test(text);
   const change=(text.match(/(?:Изменено|Перенесено|Добавлено)[^.]*\.?/iu)||[])[0]||null;
   rows.push({code,date:iso(dm[1],dm[2],dm[3]),gender:inferGender(text),status:cancelled?'cancelled':'scheduled',derived,change_note:change,text});
 });
 if(!rows.length)fail('FLGR_COMPETITION_CONTRACT_MISMATCH');
 let eventId=null;
 if(sourceUrl){const u=new URL(sourceUrl);if(!['www.flgr-results.ru','flgr-results.ru','fis.flgr-results.ru','data.flgr-results.ru'].includes(u.hostname))fail('FLGR_SOURCE_INVALID');eventId=u.pathname.match(/\/results\/(\d+)/)?.[1]||null}
 return {metadata:{eventId,heading,sourceUrl,parserVersion:FLGR_PARSER_VERSION},rows,competitionRows:rows.filter(r=>!r.derived),counts:{all:rows.length,competition:rows.filter(r=>!r.derived).length,cancelled:rows.filter(r=>!r.derived&&r.status==='cancelled').length,changed:rows.filter(r=>!r.derived&&r.change_note).length}};
}
