import {boundedJson} from '../../../lib/server-security';import {parseSelectionExport} from '../../../lib/selection.mjs';import {loadPublicCalendar} from '../../../lib/public-calendar';import {buildCalendarFeed} from '../../../lib/calendar-feed.mjs';import {siteOrigin} from '../../../lib/seo';
export const runtime='nodejs';export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'};
const fail=(code:string,status:number)=>Response.json({ok:false,error:code},{status,headers});
export async function POST(request:Request){
 let ids:number[];try{ids=parseSelectionExport(await boundedJson(request,4096))}catch{return fail('INVALID_SELECTION',400)}
 try{
  const snapshot=await loadPublicCalendar();if(snapshot.unavailable)return fail('CALENDAR_DATA_UNAVAILABLE',503);
  const wanted=new Set(ids),rows=snapshot.races.filter(r=>wanted.has(r.id));
  if(rows.length!==ids.length)return fail('PUBLISHED_SELECTION_CHANGED',409);
  const {body}=buildCalendarFeed(rows,{siteOrigin});
  return new Response(body,{headers:{...headers,'Content-Type':'text/calendar; charset=utf-8','Content-Disposition':'attachment; filename="winter-sports-my-season.ics"','X-Calendar-Event-Count':String(rows.length)}});
 }catch{return fail('EXPORT_UNAVAILABLE',503)}
}
