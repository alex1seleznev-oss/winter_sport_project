import {cache} from 'react';import {getCompetitions} from './data';import {loadPublicCalendar} from './public-calendar';import {auditSeason} from './season-audit.mjs';
export const getSeasonHealth=cache(async()=>{
 const [r,c]=await Promise.all([loadPublicCalendar(),getCompetitions({limit:100})]);
 if(r.unavailable||c.unavailable||c.competitions.length>=100)return {ok:false as const,audit:null,calculatedAt:new Date().toISOString()};
 return {ok:true as const,audit:auditSeason(r.races,c.competitions),calculatedAt:new Date().toISOString()};
});
