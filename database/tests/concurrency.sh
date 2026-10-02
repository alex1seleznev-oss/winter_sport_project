#!/usr/bin/env bash
# Isolated CI database only. No production URLs or keys are accepted.
set -euo pipefail
: "${PG_CONTAINER:?CI PostgreSQL container is required}"
psql_ci() { docker exec -i "$PG_CONTAINER" psql -U postgres -d wsh_ci -v ON_ERROR_STOP=1 "$@"; }
psql_ci <<'SQL' >/tmp/wsh-lock-holder.log 2>&1 &
SET application_name='wsh-review-lock-test';
BEGIN;
SELECT wsh_review.require_current_review(id) FROM wsh_review.receipts WHERE decision='approve' AND expires_at>now() LIMIT 1;
SELECT pg_sleep(3);
COMMIT;
SQL
holder=$!
trap 'wait "$holder" || true' EXIT
ready=0
for _ in $(seq 1 20); do
  n=$(psql_ci -Atc "SELECT count(*) FROM pg_stat_activity WHERE application_name='wsh-review-lock-test' AND wait_event='PgSleep'")
  if [ "$n" = 1 ]; then ready=1; break; fi
  sleep 0.1
done
test "$ready" = 1
if psql_ci <<'SQL' >/tmp/wsh-lock-writer.log 2>&1
SET lock_timeout='400ms';
UPDATE public.events SET discipline='CONCURRENT WRITER' WHERE external_key='test-visible';
SQL
then echo 'Concurrent writer unexpectedly passed the review lock' >&2; exit 1; fi
grep -q 'lock timeout' /tmp/wsh-lock-writer.log
wait "$holder"
psql_ci -c "UPDATE public.events SET discipline='COMMITTED NEW VERSION' WHERE external_key='test-visible';"
if psql_ci <<'SQL' >/tmp/wsh-stale-after-commit.log 2>&1
SELECT wsh_review.require_current_review(id) FROM wsh_review.receipts WHERE decision='approve' AND expires_at>now() LIMIT 1;
SQL
then echo 'Stale receipt accepted after concurrent commit' >&2; exit 1; fi
grep -q 'STALE_REVIEW_SNAPSHOT' /tmp/wsh-stale-after-commit.log
printf '{"concurrent_writer_blocked":true,"stale_after_commit_rejected":true,"synthetic_database_only":true}\n' | tee artifacts/concurrency-check.json
