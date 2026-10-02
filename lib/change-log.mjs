import {safeHttpsUrl,validDate} from './domain.mjs';
const fieldNames={event_date:'Изменена дата гонки',start_time_msk:'Уточнено время в базе',status:'Изменён статус гонки',location:'Изменено место гонки',discipline:'Уточнён формат гонки',source_url:'Уточнён первоисточник',publication:'Добавлена гонка'};
const relation=v=>Array.isArray(v)?v[0]:v;
const short=v=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,240):null;
export function publicChange(row){
 const event=relation(row.events);if(row.verified!==true||!event||!Number.isSafeInteger(event.id)||!Object.hasOwn(fieldNames,row.field_name))return null;
 const detected=new Date(row.detected_at);if(Number.isNaN(detected.getTime()))return null;
 let payload={};if(typeof row.current_value==='string'&&row.current_value.length<=32000){try{const v=JSON.parse(row.current_value);if(v&&typeof v==='object'&&!Array.isArray(v))payload=v}catch{}}
 const snapshot=payload.record&&typeof payload.record==='object'?payload.record:payload;
 const historicSource=safeHttpsUrl(payload.source_url)||safeHttpsUrl(snapshot.source_url);
 const source=historicSource||safeHttpsUrl(event.source_url);
 if(!source)return null;
 const before=['event_date','start_time_msk','status','location','discipline'].includes(row.field_name)?short(row.previous_value):null;
 const after=before!==null?short(row.current_value):null;
 return {id:row.id,eventId:event.id,action:fieldNames[row.field_name],field:row.field_name,detectedAt:detected.toISOString(),title:short(snapshot.discipline)||short(event.discipline)||'Гонка',eventDate:validDate(snapshot.event_date)?snapshot.event_date:event.event_date,gender:short(snapshot.gender)||event.gender,sport:event.sport,before,after,sourceUrl:source,sourceIsHistorical:!!historicSource,titleFromSnapshot:!!short(snapshot.discipline)};
}
