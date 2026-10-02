import {cache} from 'react';
import {supabase} from './supabase';
export type Race = {id:number;event_date:string|null;start_time_msk:string|null;sport:string;scope:string;gender:string;series:string;location:string|null;country:string|null;discipline:string;distance:string|null;status:string;source_url:string|null;verified_at:string|null;source_confidence:number|null;updated_at:string;competition_id:number|null};
const fields = 'id,event_date,start_time_msk,sport,scope,gender,series,location,country,discipline,distance,status,source_url,verified_at,source_confidence,updated_at,competition_id';
export async function getRaces(filters: {sport?:string;scope?:string;from?:string;limit?:number} = {}) {
  let query = supabase.from('events').select(fields).not('source_url','is',null).not('verified_at','is',null).gte('event_date',filters.from || '2026-10-01').lte('event_date','2027-05-31').order('event_date').order('start_time_msk',{nullsFirst:false}).limit(Math.min(filters.limit || 500,500));
  if(filters.sport) query=query.eq('sport',filters.sport);
  if(filters.scope) query=query.eq('scope',filters.scope);
  const {data,error} = await query;
  return {races:(data || []) as Race[],unavailable:!!error};
}
export const getRace = cache(async (id:string):Promise<Race|null> => {
  if(!/^[1-9]\d{0,14}$/.test(id)) return null;
  const {data,error}=await supabase.from('events').select(fields).eq('id',id).not('source_url','is',null).not('verified_at','is',null).maybeSingle();
  if(error) throw new Error('RACE_DATA_UNAVAILABLE');
  return data as Race|null;
});
