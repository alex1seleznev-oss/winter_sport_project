// Run only after operator, jurisdiction, provider contract and storage budget review.
// Creates a PRIVATE empty bucket; never uploads files and never changes existing buckets.
import {createClient} from '@supabase/supabase-js';
import {MEDIA_MAX_BYTES,MEDIA_MIME_TYPES} from '../lib/domain.mjs';
if(process.env.MEDIA_LEGAL_REVIEW_APPROVED!=='true')throw new Error('Legal/storage review gate is not approved');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw new Error('Provide server-only Supabase configuration');
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:buckets,error:listError}=await client.storage.listBuckets();
if(listError)throw new Error('Cannot inspect storage buckets');
const existing=buckets.find(b=>b.id==='wsh-originals');
if(existing){if(existing.public||existing.file_size_limit!==MEDIA_MAX_BYTES)throw new Error('Existing bucket settings differ: review manually');console.log('Private bucket exists; no changes made.');}
else{const {error}=await client.storage.createBucket('wsh-originals',{public:false,fileSizeLimit:MEDIA_MAX_BYTES,allowedMimeTypes:Object.keys(MEDIA_MIME_TYPES)});if(error)throw new Error('Private bucket creation failed');console.log('Created private wsh-originals bucket, maximum 50 MiB per object.');}
