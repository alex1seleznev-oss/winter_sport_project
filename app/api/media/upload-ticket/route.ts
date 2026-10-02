import {createClient} from '@supabase/supabase-js';
import {boundedJson} from '../../../../lib/server-security';
import {MEDIA_MAX_BYTES,validateMediaRequest} from '../../../../lib/domain.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'};
const reply=(error:string,status:number)=>Response.json({ok:false,error},{status,headers});
export async function POST(req:Request){
 // Fail closed. These gates are NOT evidence of legal approval by themselves.
 if(process.env.MEDIA_UPLOADS_ENABLED!=='true'||process.env.MEDIA_LEGAL_REVIEW_APPROVED!=='true')return reply('MEDIA_UPLOADS_DISABLED',503);
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return reply('MEDIA_NOT_CONFIGURED',503);
 const bearer=req.headers.get('authorization');
 if(!bearer?.startsWith('Bearer ')||bearer.length>8192)return reply('UNAUTHORIZED',401);
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(10000)})}});
 const {data:{user},error:authError}=await client.auth.getUser(bearer.slice(7));
 if(authError||!user)return reply('UNAUTHORIZED',401);
 const {data:staff,error:staffError}=await client.from('staff_members').select('role,active').eq('user_id',user.id).maybeSingle();
 if(staffError)return reply('MEDIA_AUTHORIZATION_UNAVAILABLE',503);
 if(!staff?.active||!['owner','editor','media_manager'].includes(staff.role))return reply('FORBIDDEN',403);
 let body:unknown;try{body=await boundedJson(req)}catch{return reply('INVALID_BODY',400)}
 if(!validateMediaRequest(body))return reply('INVALID_MEDIA_REQUEST',400);
 const {data:bucket,error:bucketError}=await client.storage.getBucket('wsh-originals');
 if(bucketError||!bucket||bucket.public||!bucket.file_size_limit||bucket.file_size_limit>MEDIA_MAX_BYTES)return reply('PRIVATE_STORAGE_NOT_READY',503);
 // Deliberate prerequisite: RPC is not deployed until the quota migration passes review.
 // Missing RPC must block uploads, never fall back to unbounded client-side quotas.
 const {data:reservation,error:reserveError}=await client.rpc('reserve_media_upload',{p_owner_id:user.id,p_mime_type:body.mimeType,p_size_bytes:body.sizeBytes,p_rights_status:body.rightsStatus,p_rights_evidence:body.rightsEvidence});
 if(reserveError)return reply(reserveError.message==='MEDIA_QUOTA_EXCEEDED'?'MEDIA_QUOTA_EXCEEDED':'MEDIA_RESERVATION_UNAVAILABLE',reserveError.message==='MEDIA_QUOTA_EXCEEDED'?429:503);
 const row=Array.isArray(reservation)?reservation[0]:reservation;
 if(!row?.object_path||row.owner_id!==user.id)return reply('MEDIA_RESERVATION_UNAVAILABLE',503);
 const {data:ticket,error:ticketError}=await client.storage.from('wsh-originals').createSignedUploadUrl(row.object_path,{upsert:false});
 if(ticketError||!ticket)return reply('UPLOAD_TICKET_UNAVAILABLE',503);
 const origin=new URL(url);if(!/^[a-z0-9]+\.supabase\.co$/.test(origin.hostname))return reply('STORAGE_HOST_NOT_SUPPORTED',503);
 return Response.json({ok:true,id:row.id,bucket:'wsh-originals',objectPath:row.object_path,token:ticket.token,endpoint:`https://${origin.hostname.replace('.supabase.co','.storage.supabase.co')}/storage/v1/upload/resumable`,mimeType:body.mimeType,sizeBytes:body.sizeBytes,expiresAt:row.expires_at,publicationStatus:'private_pending_scan'},{headers});
}
