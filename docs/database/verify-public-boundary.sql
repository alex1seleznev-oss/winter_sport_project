-- Run as a trusted SQL operator. Read-only checks, transaction always rolled back.
BEGIN;
SET LOCAL ROLE anon;
SELECT jsonb_build_object(
 'visible_demo_rows',(SELECT count(*) FROM public.events WHERE source_url IS NULL),
 'visible_unreviewed_intelligence',(SELECT count(*) FROM public.intelligence_items WHERE review_status<>'published'),
 'can_read_editorial_queue',has_table_privilege(current_user,'public.editorial_queue','SELECT'),
 'can_read_ingestion_logs',has_table_privilege(current_user,'public.ingestion_runs','SELECT'),
 'can_read_staff',has_table_privilege(current_user,'public.staff_members','SELECT'),
 'can_write_events',has_table_privilege(current_user,'public.events','INSERT'),
 'active_new_agents',(SELECT count(*) FROM public.agent_registry WHERE enabled)
);
ROLLBACK;
-- Expected zeros/false while assistants remain disabled. Counts are not proof of parser health.
