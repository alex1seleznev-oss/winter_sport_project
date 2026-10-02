-- Non-destructive publication gates. Source authority is NOT schedule certainty.
ALTER POLICY "Public can read events" ON public.events USING (source_url ~ '^https://' AND verified_at IS NOT NULL);
ALTER POLICY competitions_public_read ON public.competitions USING (source_url ~ '^https://' AND verified_at IS NOT NULL);
ALTER POLICY event_updates_public_read ON public.event_updates USING (verified = true);
ALTER POLICY "Public can read allowed streams" ON public.streams USING (rights_status IN ('official','authorized') AND verified_at IS NOT NULL AND url ~ '^https://');
ALTER POLICY athlete_results_public_read ON public.athlete_results USING (source_url ~ '^https://');
-- A prepared draft is not a published article. Operational logs can contain secrets.
DROP POLICY editorial_queue_public_read ON public.editorial_queue;
DROP POLICY ingestion_runs_public_read ON public.ingestion_runs;
DROP POLICY broadcast_checks_public_read ON public.broadcast_checks;
REVOKE ALL ON public.editorial_queue,public.ingestion_runs,public.broadcast_checks FROM anon,authenticated;
ALTER POLICY claims_public_read ON public.claims USING (status = 'confirmed' AND verified_at IS NOT NULL);
ALTER POLICY claim_evidence_public_read ON public.claim_evidence USING (EXISTS (SELECT 1 FROM public.claims c WHERE c.id = claim_id AND c.status = 'confirmed' AND c.verified_at IS NOT NULL));
ALTER TABLE public.intelligence_items ADD COLUMN review_status text NOT NULL DEFAULT 'unreviewed' CHECK (review_status IN ('unreviewed','published','rejected'));
ALTER POLICY intelligence_public_read ON public.intelligence_items USING (review_status = 'published');
ALTER TABLE public.media_assets ADD COLUMN publication_status text NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft','published','withdrawn'));
ALTER TABLE public.media_assets ADD COLUMN rights_status text NOT NULL DEFAULT 'unknown' CHECK (rights_status IN ('unknown','owned','licensed','public_domain','blocked'));
ALTER POLICY "Public can read media" ON public.media_assets USING (publication_status = 'published' AND rights_status IN ('owned','licensed','public_domain') AND license IS NOT NULL);
-- These records are reviewed before publishing; no automatic inference of publication.
ALTER TABLE public.analysis_hypotheses ADD COLUMN publication_status text NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft','published','withdrawn'));
ALTER POLICY analysis_hypotheses_public_read ON public.analysis_hypotheses USING (publication_status = 'published');
ALTER POLICY hypothesis_evaluations_public_read ON public.hypothesis_evaluations USING (EXISTS (SELECT 1 FROM public.analysis_hypotheses h WHERE h.id=hypothesis_id AND h.publication_status='published'));
ALTER TABLE public.athlete_timeline ADD COLUMN review_status text NOT NULL DEFAULT 'unreviewed' CHECK (review_status IN ('unreviewed','published','rejected'));
ALTER POLICY athlete_timeline_public_read ON public.athlete_timeline USING (review_status='published');
-- No users are created. Membership is assigned only by a trusted operator, never user_metadata.
CREATE TABLE public.staff_members (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 role text NOT NULL CHECK (role IN ('owner','editor','media_manager','analyst','auditor')),
 active boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.staff_members FROM anon,authenticated;
GRANT SELECT ON public.staff_members TO authenticated;
GRANT ALL ON public.staff_members TO service_role;
CREATE POLICY staff_read_self ON public.staff_members FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()));
CREATE TABLE public.media_uploads (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 bucket text NOT NULL DEFAULT 'wsh-originals' CHECK (bucket='wsh-originals'),
 object_path text NOT NULL UNIQUE,
 mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp','image/avif','video/mp4','video/quicktime','video/webm')),
 size_bytes bigint NOT NULL CHECK (size_bytes>0),
 status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','uploaded','scanning','ready','rejected','expired')),
 rights_status text NOT NULL DEFAULT 'unknown' CHECK (rights_status IN ('unknown','owned','licensed','public_domain','blocked')),
 rights_evidence text,
 checksum_sha256 text CHECK (checksum_sha256 IS NULL OR checksum_sha256 ~ '^[a-f0-9]{64}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '2 hours',
 CHECK (rights_status NOT IN ('owned','licensed','public_domain') OR rights_evidence IS NOT NULL)
);
ALTER TABLE public.media_uploads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.media_uploads FROM anon,authenticated;
GRANT SELECT ON public.media_uploads TO authenticated;
GRANT ALL ON public.media_uploads TO service_role;
CREATE POLICY media_uploads_read_self ON public.media_uploads FOR SELECT TO authenticated USING (owner_id=(SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.staff_members s WHERE s.user_id=(SELECT auth.uid()) AND s.active));
CREATE INDEX media_uploads_owner_created_idx ON public.media_uploads(owner_id,created_at);
-- A registry is not a running worker. All new assistants are disabled by default.
CREATE TABLE public.agent_registry (
 key text PRIMARY KEY,
 title text NOT NULL,
 responsibility text NOT NULL,
 enabled boolean NOT NULL DEFAULT false,
 execution_status text NOT NULL DEFAULT 'planned' CHECK (execution_status IN ('planned','configured','running','paused','error')),
 may_publish boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_registry ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.agent_registry FROM anon,authenticated;
GRANT SELECT ON public.agent_registry TO anon,authenticated;
GRANT ALL ON public.agent_registry TO service_role;
CREATE POLICY agent_registry_public_read ON public.agent_registry FOR SELECT TO anon,authenticated USING (true);
INSERT INTO public.agent_registry(key,title,responsibility) VALUES
 ('source_scout','Поиск источников','Обнаруживает официальные документы; не публикует факты'),
 ('calendar_verifier','Проверка календаря','Сверяет сезон, дисциплину, пол, часовой пояс и первоисточник'),
 ('results_verifier','Протоколы','Проверяет старт-листы, предварительные и окончательные результаты'),
 ('broadcast_editor','Трансляции','Проверяет правообладателя, регион и срок актуальности ссылки'),
 ('editorial_assistant','Редактор','Готовит черновик по опубликованным доказательствам'),
 ('media_processor','Медиатека','Проверяет формат, права, безопасность и создаёт производные файлы'),
 ('operations_guard','Контроль платформы','Следит за ошибками и значимыми изменениями; без лишних уведомлений');
CREATE TABLE public.agent_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 agent_key text NOT NULL REFERENCES public.agent_registry(key),
 idempotency_key text NOT NULL UNIQUE,
 status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','awaiting_review','succeeded','failed','cancelled')),
 payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts>=0 AND attempts<=5),
 available_at timestamptz NOT NULL DEFAULT now(),
 locked_until timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.agent_jobs FROM anon,authenticated;
GRANT ALL ON public.agent_jobs TO service_role;
CREATE INDEX agent_jobs_claim_idx ON public.agent_jobs(agent_key,status,available_at);
CREATE TABLE public.change_proposals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 agent_job_id uuid REFERENCES public.agent_jobs(id),
 entity_type text NOT NULL CHECK (entity_type IN ('event','competition','stream','article','result')),
 entity_id bigint,
 field_name text NOT NULL,
 previous_value jsonb,
 proposed_value jsonb,
 source_url text NOT NULL CHECK (source_url ~ '^https://'),
 source_published_at timestamptz,
 fetched_at timestamptz NOT NULL DEFAULT now(),
 source_authority smallint NOT NULL CHECK (source_authority BETWEEN 1 AND 5),
 schedule_certainty text NOT NULL DEFAULT 'unknown' CHECK (schedule_certainty IN ('unknown','provisional','confirmed','not_applicable')),
 parser_version text NOT NULL,
 document_sha256 text CHECK (document_sha256 IS NULL OR document_sha256 ~ '^[a-f0-9]{64}$'),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','applied')),
 dedupe_key text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.change_proposals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.change_proposals FROM anon,authenticated;
GRANT ALL ON public.change_proposals TO service_role;
CREATE INDEX change_proposals_job_idx ON public.change_proposals(agent_job_id);
CREATE INDEX change_proposals_status_idx ON public.change_proposals(status,created_at);
-- Public API users can never modify editorial/source data even if a policy is added by mistake.
REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON ALL TABLES IN SCHEMA public FROM anon,authenticated;
CREATE INDEX IF NOT EXISTS events_date_sport_idx ON public.events(event_date,sport) WHERE source_url IS NOT NULL AND verified_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS events_competition_idx ON public.events(competition_id);
CREATE INDEX IF NOT EXISTS streams_event_idx ON public.streams(event_id);
CREATE INDEX IF NOT EXISTS claim_evidence_claim_idx ON public.claim_evidence(claim_id);
CREATE INDEX IF NOT EXISTS media_assets_event_idx ON public.media_assets(event_id);
CREATE INDEX IF NOT EXISTS media_assets_article_idx ON public.media_assets(article_id);