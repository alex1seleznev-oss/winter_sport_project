import {cache} from 'react';import {supabase} from './supabase';import {loadPublicCalendar} from './public-calendar';import {catalogueModels} from './stage-catalog.mjs';import type {Competition} from './data';
// Two bounded public queries, not one query per stage. Counts fail closed on truncation.
export const getStageCatalogue=cache(async()=>{
 const [stages,programme]=await Promise.all([supabase.from('competitions').select('id,external_key,sport,scope,name,series,location,country,start_date,end_date,status,source_url,verified_at,updated_at,notes',{count:'exact'}).not('source_url','is',null).not('verified_at','is',null).gte('end_date','2026-10-01').lte('start_date','2027-05-31').order('start_date').order('id').range(0,499),loadPublicCalendar()]);
 const unavailable=!!stages.error||!stages.data||stages.count===null||stages.count>500||stages.data.length!==stages.count;
 const competitions=unavailable?[]:stages.data as Competition[];
 return {models:catalogueModels(competitions,programme.unavailable?null:programme.races),unavailable,programmeUnavailable:programme.unavailable};
});
