import {getSeasonHealth} from '../../../lib/season-health';
export const dynamic='force-dynamic';
export async function GET(){try{const result=await getSeasonHealth();return Response.json(result,{status:result.ok?200:503,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}})}catch{return Response.json({ok:false,error:'CALENDAR_QUALITY_UNAVAILABLE'},{status:503,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}})}}
