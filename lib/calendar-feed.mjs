import {createHash} from 'node:crypto';
import {safeHttpsUrl,validDate,raceStart,genderLabel,raceStatus,sportLabel} from './domain.mjs';
import {raceLabel} from './viewer.mjs';
// RFC5545 text escaping and UTF-8 octet folding, not JavaScript character count.
export function escapeIcsText(value){return String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').replaceAll('\\','\\\\').replace(/\r\n|\n|\r/g,'\\n').replaceAll(';','\\;').replaceAll(',','\\,')}
export function foldIcsLine(line){let out='',part='',size=0;for(const char of line){const bytes=Buffer.byteLength(char);if(size+bytes>75){out+=part+'\r\n';part=' ';size=1}part+=char;size+=bytes}return out+part}
const timestamp=value=>{if(typeof value!=='string'||!/(?:Z|[+-]\d{2}:\d{2})$/.test(value))throw new Error('CALENDAR_TIMESTAMP_INVALID');const d=new Date(value);if(Number.isNaN(d.getTime()))throw new Error('CALENDAR_TIMESTAMP_INVALID');return d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z')};
const dateOnly=value=>value.replaceAll('-','');
export function parseFeedFilters(params){
 const allowed={sport:['biathlon','cross_country'],scope:['international','russia'],gender:['men','women','mixed']};const result={};
 for(const [key,value] of params){if(params.getAll(key).length!==1)throw new Error('DUPLICATE_FILTER');if(key==='event'||key==='competition'){if(!/^[1-9]\d{0,14}$/.test(value))throw new Error('INVALID_ID');result[key]=Number(value)}else if(allowed[key]?.includes(value)){result[key]=value}else throw new Error('INVALID_FILTER')}
 if(result.event&&Object.keys(result).length!==1)throw new Error('AMBIGUOUS_EVENT_FILTER');return result;
}
export function buildCalendarFeed(races,{siteOrigin=null}={}){
 if(!Array.isArray(races)||races.length>1000)throw new Error('CALENDAR_LIMIT_EXCEEDED');
 const origin=safeHttpsUrl(siteOrigin)?new URL(siteOrigin).origin:null;const ids=new Set();
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Winter Sports Hub//Public Calendar 1.0//RU','CALSCALE:GREGORIAN','X-WR-CALNAME:Winter Sports Hub 2026-2027','X-WR-TIMEZONE:Europe/Moscow','X-WR-CALDESC:Опубликованная часть базы. Неизвестное время — запись на весь день. Проверяйте первоисточник.'];
 for(const r of [...races].sort((a,b)=>a.id-b.id)){
  if(!Number.isSafeInteger(r.id)||r.id<1||ids.has(r.id))throw new Error('CALENDAR_ID_INVALID');ids.add(r.id);
  const source=safeHttpsUrl(r.source_url);if(!source||!validDate(r.event_date)||!r.verified_at)throw new Error('CALENDAR_PROVENANCE_INVALID');
  if(!['scheduled','tentative','provisional','cancelled','completed'].includes(r.status))throw new Error('CALENDAR_STATUS_INVALID');
  const verified=timestamp(r.verified_at),modified=timestamp(r.updated_at);const stamp=modified>verified?modified:verified;
  const starts=raceStart(r.event_date,r.start_time_msk);if(!starts)throw new Error('CALENDAR_START_INVALID');
  const title=[r.status==='cancelled'?'[Отменено]':null,['tentative','provisional'].includes(r.status)?'[Предварительно]':null,!r.start_time_msk?'[Время уточняется]':null,sportLabel(r.sport),raceLabel(r),genderLabel(r.gender)].filter(Boolean).join(' · ');
  const details=[raceStatus(r.status),!r.start_time_msk?'Точное время не опубликовано. Запись на весь день — только отметка даты, не длительность гонки.':`Старт ${r.start_time_msk.slice(0,5)} МСК. Приложение календаря может показать его в своём часовом поясе.`,r.series,`Первоисточник: ${source}`,`Проверка в базе: ${r.verified_at}`,r.notes,'Это опубликованная часть базы, а не гарантия полного или неизменного расписания. Частота обновления подписки зависит от приложения.'].filter(Boolean).join('\n');
  lines.push('BEGIN:VEVENT',`UID:wsh-wmiypacyraepljalppub-event-${r.id}@winter-sports-hub.invalid`,`DTSTAMP:${stamp}`,`LAST-MODIFIED:${modified}`,`SUMMARY:${escapeIcsText(title)}`);
  if(r.start_time_msk)lines.push(`DTSTART:${timestamp(new Date(starts).toISOString())}`);
  else {const next=new Date(Date.parse(r.event_date+'T12:00:00Z')+86400000).toISOString().slice(0,10);lines.push(`DTSTART;VALUE=DATE:${dateOnly(r.event_date)}`,`DTEND;VALUE=DATE:${dateOnly(next)}`)}
  // No fabricated end time, alarms, invitations or attendees. Date markers never block availability.
  lines.push('TRANSP:TRANSPARENT',`STATUS:${r.status==='cancelled'?'CANCELLED':['tentative','provisional'].includes(r.status)?'TENTATIVE':'CONFIRMED'}`,`LOCATION:${escapeIcsText([r.location,r.country].filter(Boolean).join(', '))}`,`DESCRIPTION:${escapeIcsText(details)}`,`URL:${origin?origin+'/race-center/'+r.id:source}`,'END:VEVENT');
 }
 lines.push('END:VCALENDAR');const body=lines.map(foldIcsLine).join('\r\n')+'\r\n';
 return {body,etag:'"'+createHash('sha256').update(body).digest('hex')+'"',count:races.length};
}
