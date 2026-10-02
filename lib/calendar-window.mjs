import {moscowDate,validDate} from './domain.mjs';
export const SEASON_START='2026-10-01';
export const SEASON_END='2027-05-31';
export function shiftDate(date,days){if(!validDate(date)||!Number.isInteger(days))throw new Error('INVALID_CALENDAR_DATE');return new Date(Date.parse(date+'T12:00:00Z')+days*86400000).toISOString().slice(0,10)}
export function calendarWindow(value,now=new Date()){
 const today=moscowDate(now);
 if(value==='today')return {from:today,to:today,label:'Сегодня'};
 if(value==='tomorrow'){const next=shiftDate(today,1);return {from:next,to:next,label:'Завтра'}}
 if(value==='week')return {from:today,to:shiftDate(today,6),label:'Ближайшие 7 дней'};
 return {from:SEASON_START,to:SEASON_END,label:'Весь сезон'};
}
export function competitionMatches(race,competition){return race.competition_id===competition.id&&race.sport===competition.sport&&race.scope===competition.scope&&validDate(race.event_date)&&race.event_date>=competition.start_date&&race.event_date<=competition.end_date}
