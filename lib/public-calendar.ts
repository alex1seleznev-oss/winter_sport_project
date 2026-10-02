import {supabase} from './supabase';
import type {Race} from './data';
// One bounded snapshot. Never publish a successful but truncated calendar.
export async function loadPublicCalendar(filters:{sport?:string;scope?:string;gender?:string;from?:string;to?:string;event?:number;competition?:number}={}){
 let query=supabase.from('events').select('id,event_date,start_time_msk,sport,scope,gender,series,location,country,discipline,distance,status,source_url,verified_at,source_confidence,updated_at,competition_id,notes',{count:'exact'}).not('source_url','is',null).not('verified_at','is',null).gte('event_date',filters.from||'2026-10-01').lte('event_date',filters.to||'2027-05-31').order('event_date').order('start_time_msk',{nullsFirst:false}).order('id').range(0,999);
 if(filters.sport)query=query.eq('sport',filters.sport);if(filters.scope)query=query.eq('scope',filters.scope);if(filters.gender)query=query.eq('gender',filters.gender);if(filters.event)query=query.eq('id',filters.event);if(filters.competition)query=query.eq('competition_id',filters.competition);
 const {data,count,error}=await query;
 if(error||!data||count===null||count>1000||data.length!==count)return {races:[] as Race[],unavailable:true};
 return {races:data as Race[],unavailable:false};
}
