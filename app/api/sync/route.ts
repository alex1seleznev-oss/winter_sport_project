import {validBearer} from '../../../lib/server-security';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const sources=[['IBU','https://www.biathlonworld.com/calendar'],['FIS','https://www.fis-ski.com/DB/cross-country/calendar-results.html'],['СБР','https://biathlonrus.com/'],['ФЛГР','https://flgr.ru/']];
const headers={'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'};
export async function GET(req:Request){
 const secret=process.env.CRON_SECRET;
 if(!secret || secret.length<32)return Response.json({ok:false,error:'SOURCE_CHECK_NOT_CONFIGURED'},{status:503,headers});
 if(!validBearer(req.headers.get('authorization'),secret))return Response.json({ok:false,error:'UNAUTHORIZED'},{status:401,headers});
 const checks=await Promise.all(sources.map(async([name,url])=>{try{
  const response=await fetch(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000),headers:{'user-agent':'WinterSportsHub/1.1 source-health-check'}});
  const status=response.status;await response.body?.cancel();
  return {name,url,reachable:response.ok,httpStatus:status,checkedAt:new Date().toISOString()};
 }catch{return {name,url,reachable:false,httpStatus:null,checkedAt:new Date().toISOString()}}}));
 return Response.json({ok:checks.every(c=>c.reachable),mode:'reachability_only',checks,imported:false,note:'HTTP availability is not parser success, semantic verification or database synchronization.'},{headers});
}
