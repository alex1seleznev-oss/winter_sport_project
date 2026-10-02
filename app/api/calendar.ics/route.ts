import {loadPublicCalendar} from '../../../lib/public-calendar';
import {buildCalendarFeed,parseFeedFilters} from '../../../lib/calendar-feed.mjs';
import {siteOrigin} from '../../../lib/seo';
export const runtime='nodejs';export const dynamic='force-dynamic';
const error=(code:string,status:number)=>Response.json({ok:false,error:code},{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
export async function GET(request:Request){
 let filters:ReturnType<typeof parseFeedFilters>;try{filters=parseFeedFilters(new URL(request.url).searchParams)}catch{return error('INVALID_CALENDAR_FILTER',400)}
 try{
  const snapshot=await loadPublicCalendar(filters);if(snapshot.unavailable)return error('CALENDAR_DATA_UNAVAILABLE',503);
  if(filters.event&&!snapshot.races.length)return error('RACE_NOT_PUBLISHED',404);
  const {body,etag,count}=buildCalendarFeed(snapshot.races,{siteOrigin});
  const headers={'Content-Type':'text/calendar; charset=utf-8','Content-Disposition':'attachment; filename="winter-sports-2026-2027.ics"','Cache-Control':'public, max-age=0, must-revalidate','ETag':etag,'X-Robots-Tag':'noindex, nofollow','X-Calendar-Event-Count':String(count),'X-Content-Type-Options':'nosniff'};
  if(request.headers.get('if-none-match')?.split(',').some(x=>x.trim().replace(/^W\//,'')===etag))return new Response(null,{status:304,headers});
  return new Response(body,{headers});
 }catch{return error('CALENDAR_EXPORT_UNAVAILABLE',503)}
}
