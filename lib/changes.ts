import {supabase} from './supabase';import {publicChange,type PublicChange} from './change-log.mjs';
export async function getPublicChanges(limit=40){
 const bounded=Math.min(100,Math.max(1,limit));
 const {data,error}=await supabase.from('event_updates').select('id,event_id,field_name,previous_value,current_value,detected_at,verified,events(id,discipline,event_date,gender,sport,source_url)').eq('verified',true).in('field_name',['publication','event_date','start_time_msk','status','location','discipline','source_url']).order('detected_at',{ascending:false}).order('id',{ascending:false}).limit(bounded);
 if(error)return {changes:[] as PublicChange[],unavailable:true};
 return {changes:(data||[]).map(publicChange).filter((x):x is PublicChange=>x!==null),unavailable:false};
}
