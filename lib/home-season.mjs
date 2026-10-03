import {validDate} from './domain.mjs';
export function homeSeason(models,today){
 if(!validDate(today))throw new Error('INVALID_HOME_DAY');
 const weekEnd=new Date(Date.parse(today+'T12:00:00Z')+6*86400000).toISOString().slice(0,10);
 const futureStages=models.filter(m=>m.competition.end_date>=today&&!['cancelled','completed'].includes(m.competition.status));
 const all=models.flatMap(m=>m.races).sort((a,b)=>(a.event_date||'').localeCompare(b.event_date||'')||(a.start_time_msk||'99').localeCompare(b.start_time_msk||'99')||a.id-b.id);
 const upcoming=all.filter(r=>validDate(r.event_date)&&r.event_date>=today&&!['cancelled','completed'].includes(r.status));
 const week=upcoming.filter(r=>r.event_date<=weekEnd);
 return {stage:futureStages[0]||null,stages:futureStages.slice(0,3),weekCount:week.length,races:(week.length?week:upcoming).slice(0,6),showsLater:week.length===0&&upcoming.length>0,totalRaces:all.length,totalStages:models.length,timedRaces:all.filter(r=>r.start_time_msk!==null).length};
}
