DO $$ BEGIN IF current_database()<>'wsh_ci' THEN RAISE EXCEPTION 'CI_DATABASE_REQUIRED'; END IF; END $$;
DO $$
DECLARE pid uuid; cid bigint; pd text; cd text; r uuid; evidence jsonb;
BEGIN
 SELECT id INTO pid FROM public.change_proposals WHERE dedupe_key='test-proposal';SELECT id INTO cid FROM public.competitions WHERE external_key='test-stage';
 pd:=wsh_review.proposal_digest(pid);cd:=wsh_review.calendar_digest(cid);
 evidence:=jsonb_build_array(jsonb_build_object('url','https://flgr.ru/test/','sha256',repeat('a',64),'fetched_at',now()));
 BEGIN PERFORM wsh_review.record_review(pid,cid+1,pd,cd,'approve','CI reviewer','Wrong scope must be rejected',evidence);RAISE EXCEPTION 'SCOPE_NOT_CHECKED';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 BEGIN PERFORM wsh_review.record_review(pid,cid,pd,cd,'approve','CI reviewer','Unknown source must be rejected',jsonb_build_array(jsonb_build_object('url','https://attacker.example/','sha256',repeat('a',64),'fetched_at',now())));RAISE EXCEPTION 'SOURCE_NOT_CHECKED';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 BEGIN PERFORM wsh_review.record_review(pid,cid,pd,cd,'approve','CI reviewer','Hash receipt must be mandatory',jsonb_build_array(jsonb_build_object('url','https://flgr.ru/test/','sha256','bad','fetched_at',now())));RAISE EXCEPTION 'EVIDENCE_NOT_CHECKED';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 INSERT INTO wsh_review.receipts(proposal_id,competition_id,decision,reviewer,proposal_digest,calendar_digest,evidence,reason,expires_at)
 VALUES(pid,cid,'approve','CI expired fixture',pd,cd,evidence,'Synthetic expiry fixture only',now()-interval '1 minute') RETURNING id INTO r;
 BEGIN PERFORM wsh_review.require_current_review(r);RAISE EXCEPTION 'EXPIRY_NOT_CHECKED';EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL;END;
END $$;
SELECT jsonb_build_object('extra_negative_checks',4,'all_passed',true);
