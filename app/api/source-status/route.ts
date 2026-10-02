import {supabase} from '../../../lib/supabase';
export const dynamic='force-dynamic';
export async function GET(){const {data,error}=await supabase.from('source_feeds').select('id,name,kind,url,authority_level,last_checked_at').eq('active',true).order('authority_level',{ascending:false});return Response.json({ok:!error,sources:data||[],error:error?'SOURCE_STATUS_UNAVAILABLE':null,generatedAt:new Date().toISOString(),note:'A checked timestamp does not by itself prove a successful import.'},{status:error?503:200,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}})}
