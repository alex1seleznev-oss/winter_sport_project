-- Empty private buckets only. No users, files, public read policies or upload grants are created.
-- Bucket creation using SQL is supported by Supabase Storage documentation.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES
 ('wsh-originals','wsh-originals',false,52428800,ARRAY['image/jpeg','image/png','image/webp','image/avif','video/mp4','video/quicktime','video/webm']),
 ('wsh-derived','wsh-derived',false,10485760,ARRAY['image/jpeg','image/png','image/webp','image/avif','video/mp4','video/webm'])
ON CONFLICT (id) DO NOTHING;