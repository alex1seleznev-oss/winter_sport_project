DO $$ BEGIN IF current_database()<>'wsh_ci' THEN RAISE EXCEPTION 'CI_DATABASE_REQUIRED'; END IF; END $$;
CREATE TABLE public.ci_assertions(name text PRIMARY KEY,passed boolean NOT NULL);
DO $$
DECLARE pid uuid; cid bigint; rid uuid; d1 text; d2 text; eid bigint; evidence jsonb; original_status text;
BEGIN
 SELECT id INTO pid FROM public.change_proposals WHERE dedupe_key='test-proposal';
 SELECT id INTO cid FROM public.competitions WHERE external_key='test-stage';
 SELECT id INTO eid FROM public.events WHERE external_key='test-visible';
 evidence:=jsonb_build_array(jsonb_build_object('url','https://flgr.ru/test/','sha256',repeat('a',64),'fetched_at',now()));
 d1:=wsh_review.proposal_digest(pid);d2:=wsh_review.calendar_digest(cid);
 rid:=wsh_review.record_review(pid,cid,d1,d2,'approve','CI reviewer','Synthetic fixture approval only',evidence);
 IF wsh_review.require_current_review(rid) IS DISTINCT FROM pid THEN RAISE EXCEPTION 'VALID_REVIEW_REJECTED'; END IF;
 INSERT INTO public.ci_assertions VALUES('valid_review',true);
 BEGIN
  UPDATE public.events SET discipline='CONCURRENT EDIT WITHOUT updated_at CHANGE' WHERE id=eid;
  PERFORM wsh_review.require_current_review(rid);
  RAISE EXCEPTION 'STALE_ROW_NOT_DETECTED';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
 INSERT INTO public.ci_assertions VALUES('changed_row_without_timestamp',true);
 BEGIN
  INSERT INTO public.events(external_key,competition_id,event_date,sport,scope,gender,series,discipline) VALUES('phantom',cid,'2026-11-27','cross_country','russia','women','TEST','PHANTOM');
  PERFORM wsh_review.require_current_review(rid);RAISE EXCEPTION 'PHANTOM_NOT_DETECTED';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
 INSERT INTO public.ci_assertions VALUES('new_same_stage_row',true);
 BEGIN
  DELETE FROM public.events WHERE id=eid;
  PERFORM wsh_review.require_current_review(rid);RAISE EXCEPTION 'DELETE_NOT_DETECTED';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
 INSERT INTO public.ci_assertions VALUES('deleted_row',true);
 BEGIN
  UPDATE public.competitions SET location='CONCURRENT VENUE' WHERE id=cid;
  PERFORM wsh_review.require_current_review(rid);RAISE EXCEPTION 'VENUE_NOT_DETECTED';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
 INSERT INTO public.ci_assertions VALUES('changed_stage',true);
 BEGIN
  UPDATE public.change_proposals SET proposed_value='"REPLACED PAYLOAD"'::jsonb WHERE id=pid;
  PERFORM wsh_review.require_current_review(rid);RAISE EXCEPTION 'PAYLOAD_NOT_DETECTED';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
 INSERT INTO public.ci_assertions VALUES('changed_proposal_payload',true);
 BEGIN
  PERFORM wsh_review.record_review(pid,cid,d1,repeat('0',64),'approve','CI reviewer','Wrong baseline must be refused',evidence);RAISE EXCEPTION 'STALE_APPROVAL_ACCEPTED';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
 INSERT INTO public.ci_assertions VALUES('stale_approval_rejected',true);
 BEGIN UPDATE wsh_review.receipts SET reason='Tampered receipt' WHERE id=rid;RAISE EXCEPTION 'RECEIPT_MUTABLE';EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL;END;
 INSERT INTO public.ci_assertions VALUES('immutable_receipt',true);
 BEGIN UPDATE public.change_proposals SET status='applied' WHERE id=pid;PERFORM wsh_review.require_current_review(rid);RAISE EXCEPTION 'DUPLICATE_APPLICATION';EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL;END;
 INSERT INTO public.ci_assertions VALUES('already_finalized_rejected',true);
 BEGIN
  rid:=wsh_review.record_review(pid,cid,d1,d2,'defer','CI reviewer','Deferred is never publication approval',evidence);
  PERFORM wsh_review.require_current_review(rid);RAISE EXCEPTION 'DEFERRED_REVIEW_ACCEPTED';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 INSERT INTO public.ci_assertions VALUES('defer_not_approval',true);
END $$;
SET ROLE anon;
DO $$ BEGIN
 IF has_schema_privilege(current_user,'wsh_review','USAGE') THEN RAISE EXCEPTION 'PRIVATE_SCHEMA_LEAK'; END IF;
END $$;
RESET ROLE;
INSERT INTO public.ci_assertions VALUES('anonymous_private_schema_denied',true);
-- Verify the approved precondition under the actual granted service role, not just superuser.
SET ROLE service_role;
SELECT wsh_review.require_current_review(id) FROM wsh_review.receipts WHERE decision='approve';
RESET ROLE;
INSERT INTO public.ci_assertions VALUES('service_role_invoker_works',true);
SELECT jsonb_build_object('assertions',count(*),'all_passed',bool_and(passed)) FROM public.ci_assertions;
