-- Synthetic, non-personal fixtures in the isolated CI database only.
DO $$ BEGIN IF current_database()<>'wsh_ci' THEN RAISE EXCEPTION 'CI_DATABASE_REQUIRED'; END IF; END $$;
INSERT INTO public.competitions(external_key,sport,scope,series,name,start_date,end_date,source_url,verified_at) VALUES('test-stage','cross_country','russia','TEST','TEST ONLY','2026-11-26','2026-11-29','https://flgr.ru/test/',now());
INSERT INTO public.events(external_key,competition_id,event_date,sport,scope,gender,series,discipline,source_url,verified_at) SELECT 'test-visible',id,'2026-11-26','cross_country','russia','women','TEST','TEST ONLY','https://flgr.ru/test/',now() FROM public.competitions WHERE external_key='test-stage';
INSERT INTO public.events(external_key,event_date,sport,scope,gender,series,discipline) VALUES('test-hidden','2026-11-26','cross_country','russia','women','TEST','TEST ONLY');
INSERT INTO public.intelligence_items(item_kind,url,summary) VALUES('test','https://flgr.ru/test-draft/','TEST PRIVATE DRAFT');
SET ROLE anon;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.events)<>1 THEN RAISE EXCEPTION 'PUBLIC_EVENT_BOUNDARY_FAILED'; END IF;
 IF (SELECT count(*) FROM public.intelligence_items)<>0 THEN RAISE EXCEPTION 'DRAFT_LEAK'; END IF;
 IF has_table_privilege(current_user,'public.events','INSERT') OR has_table_privilege(current_user,'public.change_proposals','SELECT') OR has_table_privilege(current_user,'public.editorial_queue','SELECT') THEN RAISE EXCEPTION 'PUBLIC_PRIVILEGE_LEAK'; END IF;
END $$;
RESET ROLE;
INSERT INTO public.change_proposals(entity_type,entity_id,field_name,proposed_value,source_url,source_authority,parser_version,dedupe_key) SELECT 'event',id,'discipline','"TEST REVIEW"'::jsonb,'https://flgr.ru/test/',5,'test-only','test-proposal' FROM public.events WHERE external_key='test-visible';
