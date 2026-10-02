-- New private review preconditions. NOT a calendar applier; no events INSERT/UPDATE/DELETE.
-- Apply only after isolated replay/restore tests and a separate migration review.
CREATE SCHEMA wsh_review;
REVOKE ALL ON SCHEMA wsh_review FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA wsh_review TO service_role;

CREATE TABLE wsh_review.receipts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 proposal_id uuid NOT NULL REFERENCES public.change_proposals(id),
 competition_id bigint NOT NULL REFERENCES public.competitions(id),
 decision text NOT NULL CHECK(decision IN ('covered','conflict','defer','approve')),
 reviewer text NOT NULL CHECK(length(reviewer) BETWEEN 3 AND 200),
 proposal_digest text NOT NULL CHECK(proposal_digest ~ '^[a-f0-9]{64}$'),
 calendar_digest text NOT NULL CHECK(calendar_digest ~ '^[a-f0-9]{64}$'),
 evidence jsonb NOT NULL CHECK(jsonb_typeof(evidence)='array'),
 reason text NOT NULL CHECK(length(reason) BETWEEN 10 AND 2000),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '30 minutes'
);
ALTER TABLE wsh_review.receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON wsh_review.receipts FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT ON wsh_review.receipts TO service_role;
CREATE INDEX receipts_proposal_idx ON wsh_review.receipts(proposal_id,created_at);
CREATE INDEX receipts_competition_idx ON wsh_review.receipts(competition_id);

CREATE FUNCTION wsh_review.proposal_digest(p_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' SET timezone='UTC' AS $$
 SELECT encode(sha256(convert_to((to_jsonb(p)-'status')::text,'UTF8')),'hex') FROM public.change_proposals p WHERE p.id=p_id;
$$;
CREATE FUNCTION wsh_review.calendar_digest(p_id bigint) RETURNS text
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' SET timezone='UTC' AS $$
 SELECT encode(sha256(convert_to(jsonb_build_object('competition',to_jsonb(c),'events',coalesce((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.id) FROM public.events e WHERE e.competition_id=p_id),'[]'::jsonb))::text,'UTF8')),'hex') FROM public.competitions c WHERE c.id=p_id;
$$;
CREATE FUNCTION wsh_review.immutable_receipt() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
 BEGIN RAISE EXCEPTION 'REVIEW_RECEIPT_IMMUTABLE' USING ERRCODE='55000'; END;
$$;
CREATE TRIGGER receipts_immutable BEFORE UPDATE OR DELETE ON wsh_review.receipts FOR EACH ROW EXECUTE FUNCTION wsh_review.immutable_receipt();

CREATE FUNCTION wsh_review.record_review(p_proposal uuid,p_competition bigint,p_proposal_digest text,p_calendar_digest text,p_decision text,p_reviewer text,p_reason text,p_evidence jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' SET timezone='UTC' SET lock_timeout='2s' AS $$
DECLARE p public.change_proposals; scope_id bigint; receipt uuid; item jsonb;
BEGIN
 -- Fixed lock order. These locks block competing writes but permit ordinary SELECT.
 -- Table locks also catch a new race inserted into a previously reviewed empty slot.
 LOCK TABLE public.competitions IN SHARE ROW EXCLUSIVE MODE;
 LOCK TABLE public.events IN SHARE ROW EXCLUSIVE MODE;
 LOCK TABLE public.change_proposals IN SHARE ROW EXCLUSIVE MODE;
 SELECT * INTO p FROM public.change_proposals WHERE id=p_proposal;
 IF NOT FOUND OR p.status NOT IN ('pending','approved') THEN RAISE EXCEPTION 'PROPOSAL_NOT_REVIEWABLE' USING ERRCODE='22023'; END IF;
 IF p.entity_type='competition' THEN scope_id:=p.entity_id;
 ELSIF p.entity_type='event' AND p.entity_id IS NOT NULL THEN SELECT competition_id INTO scope_id FROM public.events WHERE id=p.entity_id;
 ELSIF p.entity_type='event' AND p.proposed_value->>'competition_id' ~ '^[1-9][0-9]*$' THEN scope_id:=(p.proposed_value->>'competition_id')::bigint;
 END IF;
 IF scope_id IS NULL OR scope_id IS DISTINCT FROM p_competition THEN RAISE EXCEPTION 'REVIEW_SCOPE_MISMATCH' USING ERRCODE='22023'; END IF;
 IF p_proposal_digest IS NULL OR p_calendar_digest IS NULL OR p_proposal_digest IS DISTINCT FROM wsh_review.proposal_digest(p_proposal) OR p_calendar_digest IS DISTINCT FROM wsh_review.calendar_digest(p_competition) THEN RAISE EXCEPTION 'STALE_REVIEW_SNAPSHOT' USING ERRCODE='40001'; END IF;
 IF p_evidence IS NULL OR jsonb_typeof(p_evidence)<>'array' OR jsonb_array_length(p_evidence) NOT BETWEEN 1 AND 10 THEN RAISE EXCEPTION 'REVIEW_EVIDENCE_REQUIRED' USING ERRCODE='22023'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_evidence) LOOP
  IF NOT coalesce(item->>'url' ~ '^https://(www\.)?(flgr\.ru|flgr-results\.ru|biathlonrus\.com|fis-ski\.com|biathlonworld\.com)/',false)
    AND NOT coalesce(item->>'url' ~ '^https://(fis|data)\.flgr-results\.ru/',false)
    AND NOT coalesce(item->>'url' ~ '^https://assets\.fis-ski\.com/',false) THEN RAISE EXCEPTION 'EVIDENCE_SOURCE_NOT_ALLOWED' USING ERRCODE='22023'; END IF;
  IF NOT coalesce(item->>'sha256' ~ '^[a-f0-9]{64}$',false) OR NOT(item?'fetched_at') THEN RAISE EXCEPTION 'EVIDENCE_RECEIPT_INCOMPLETE' USING ERRCODE='22023'; END IF;
  IF (item->>'fetched_at')::timestamptz IS NULL OR (item->>'fetched_at')::timestamptz>clock_timestamp()+interval '5 minutes' THEN RAISE EXCEPTION 'EVIDENCE_TIME_INVALID' USING ERRCODE='22023'; END IF;
 END LOOP;
 INSERT INTO wsh_review.receipts(proposal_id,competition_id,decision,reviewer,proposal_digest,calendar_digest,evidence,reason)
 VALUES(p_proposal,p_competition,p_decision,p_reviewer,p_proposal_digest,p_calendar_digest,p_evidence,p_reason) RETURNING id INTO receipt;
 RETURN receipt;
END;
$$;

CREATE FUNCTION wsh_review.require_current_review(p_receipt uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' SET timezone='UTC' SET lock_timeout='2s' AS $$
DECLARE r wsh_review.receipts; proposal_state text;
BEGIN
 LOCK TABLE public.competitions IN SHARE ROW EXCLUSIVE MODE;
 LOCK TABLE public.events IN SHARE ROW EXCLUSIVE MODE;
 LOCK TABLE public.change_proposals IN SHARE ROW EXCLUSIVE MODE;
 SELECT * INTO r FROM wsh_review.receipts WHERE id=p_receipt;
 IF NOT FOUND OR r.decision<>'approve' THEN RAISE EXCEPTION 'REVIEW_NOT_APPROVED' USING ERRCODE='42501'; END IF;
 IF r.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'REVIEW_EXPIRED' USING ERRCODE='55000'; END IF;
 SELECT status INTO proposal_state FROM public.change_proposals WHERE id=r.proposal_id;
 IF proposal_state NOT IN ('pending','approved') THEN RAISE EXCEPTION 'PROPOSAL_ALREADY_FINALIZED' USING ERRCODE='55000'; END IF;
 IF r.proposal_digest IS DISTINCT FROM wsh_review.proposal_digest(r.proposal_id) OR r.calendar_digest IS DISTINCT FROM wsh_review.calendar_digest(r.competition_id) THEN RAISE EXCEPTION 'STALE_REVIEW_SNAPSHOT' USING ERRCODE='40001'; END IF;
 RETURN r.proposal_id;
END;
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA wsh_review FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION wsh_review.proposal_digest(uuid),wsh_review.calendar_digest(bigint),wsh_review.record_review(uuid,bigint,text,text,text,text,text,jsonb),wsh_review.require_current_review(uuid) TO service_role;
-- No public endpoint, auto-approval, privileges on events, or publishing worker is created.
-- require_current_review must be used in the SAME transaction as a future reviewed mutation.
-- This migration does not force unrelated legacy/admin writers to call it.
