DO $$ BEGIN
 IF current_database()<>'wsh_restore' THEN RAISE EXCEPTION 'RESTORE_DATABASE_REQUIRED'; END IF;
 IF (SELECT count(*) FROM public.events)<>2 OR (SELECT count(*) FROM public.change_proposals)<>1 THEN RAISE EXCEPTION 'RESTORED_DATA_MISMATCH'; END IF;
 IF (SELECT count(*) FROM public.ci_assertions)<>12 OR NOT(SELECT bool_and(passed) FROM public.ci_assertions) THEN RAISE EXCEPTION 'RESTORED_ASSERTIONS_MISMATCH'; END IF;
 IF (SELECT count(*) FROM storage.buckets)<>2 OR EXISTS(SELECT 1 FROM storage.buckets WHERE public) THEN RAISE EXCEPTION 'RESTORED_BUCKET_SETTINGS_MISMATCH'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='receipts_immutable') THEN RAISE EXCEPTION 'RESTORED_TRIGGER_MISSING'; END IF;
END $$;
SET ROLE anon;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.events)<>1 OR (SELECT count(*) FROM public.intelligence_items)<>0 THEN RAISE EXCEPTION 'RESTORED_RLS_FAILED'; END IF;
 IF has_table_privilege(current_user,'public.change_proposals','SELECT') OR has_table_privilege(current_user,'public.events','INSERT') OR has_schema_privilege(current_user,'wsh_review','USAGE') THEN RAISE EXCEPTION 'RESTORED_ACCESS_LEAK'; END IF;
END $$;
RESET ROLE;
SELECT jsonb_build_object('restored',true,'rls_verified',true,'synthetic_fixture_only',true,'production_backup_restored',false);
