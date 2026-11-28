#!/usr/bin/env bash
set -euo pipefail
umask 077
cd "$(dirname "$0")/../.."
tool=scripts/account-deletion-restore
with_completions=true
with_authorization=false
definitions=false
scenario=confirmed
for option in "$@"; do
  case "$option" in
    --definition-check) definitions=true ;;
    --without-completions) with_completions=false ;;
    --post-0027) with_authorization=true ;;
    --lost-arm) scenario=arming-unknown; armed_checkpoint=true ;;
    --lost-erase) scenario=execution-unknown ;;
    --post-erasure-checkpoint) scenario=execution-unknown; post_erasure_checkpoint=true ;;
    --pre-0027-checkpoint) scenario=arming-unknown; pre_0027_checkpoint=true ;;
    *) echo "Unknown option" >&2; exit 1 ;;
  esac
done
scratch=$(mktemp -d)
d=(env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH
   docker --host=unix:///var/run/docker.sock)
container=
cleanup() {
  if [[ -n "$container" ]]; then "${d[@]}" rm -f "$container" >/dev/null; fi
  rm -rf -- "$scratch"
}
trap cleanup EXIT
container=$("${d[@]}" run --pull=never --rm -d --network none \
  --label io.physcratic.purpose=disposable-erasure-restore \
  -e POSTGRES_PASSWORD=synthetic-local-only postgres:18.7-alpine -c listen_addresses='')
psql_local() {
  "${d[@]}" exec -i "$container" psql -XqAt -w -h /var/run/postgresql -U postgres \
    -v ON_ERROR_STOP=1 -v with_completions="$with_completions" "$@"
}
for attempt in {1..30}; do
  if "${d[@]}" logs "$container" 2>&1 | grep -F 'PostgreSQL init process complete' >/dev/null &&
     psql_local -c 'SELECT 1' >/dev/null 2>&1; then break; fi
  sleep 1
done
psql_local <<'SQL'
CREATE ROLE restore_owner NOLOGIN;
CREATE ROLE restore_runtime NOLOGIN;
CREATE DATABASE physcratic_restore_source OWNER restore_owner;
CREATE DATABASE physcratic_restore_test OWNER restore_owner;
SQL
source_db() { psql_local -d physcratic_restore_source "$@"; }
target() { psql_local -d physcratic_restore_test "$@"; }
{
  printf 'SET ROLE restore_owner; SET search_path=public,pg_catalog;\n'
  node --input-type=module -e "import {fixtureDDL} from './scripts/authoring-release-production/package/test-fixture.mjs'; console.log(fixtureDDL().join(';\n')+';');"
  for migration in migrations/00*.up.sql; do
    if [[ "$with_completions" == false && "$migration" == migrations/0025_* ]]; then continue; fi
    if [[ "$migration" == migrations/0027_* ]] &&
       { [[ "$with_authorization" == false ]] || [[ "${pre_0027_checkpoint:-}" == true ]]; }; then continue; fi
    case "$migration" in
      migrations/0016_*|migrations/0018_*|migrations/0026_*|migrations/0027_*) cat "$migration" ;;
      *) printf 'BEGIN;\n'; cat "$migration"; printf '\nCOMMIT;\n' ;;
    esac
  done
} | source_db
source_db < "$tool/fixture.sql" >/dev/null
record_0027() {
  source_db -c "INSERT INTO physcratic_production_migrations(id,sha256,result) VALUES(
   '0027_account_deletion_authorization','$(sha256sum migrations/0027_account_deletion_authorization.up.sql | cut -d ' ' -f 1)',
   'verified')"
}
if [[ "$with_authorization" == true && "${pre_0027_checkpoint:-}" != true ]]; then record_0027; fi
"${d[@]}" exec "$container" pg_dump -h /var/run/postgresql -U postgres -Fc physcratic_restore_source > "$scratch/pre-erasure.dump"
"${d[@]}" exec -i "$container" pg_restore -h /var/run/postgresql -U postgres --exit-on-error \
  -d physcratic_restore_test < "$scratch/pre-erasure.dump"

# Recognize the disposable startup and record the installed definition for source pin review.
if [[ "$definitions" == true ]]; then
  target -c "SET search_path=pg_catalog,public; SELECT encode(sha256(convert_to(pg_get_functiondef('public.account_deletion_execute(text,text,text,text)'::regprocedure),'UTF8')),'hex');"
  target -c "SET search_path=pg_catalog,public; SELECT split_part(pg_get_functiondef('public.account_deletion_execute(text,text,text,text)'::regprocedure),'DECLARE',1);"
  target <<'SQL'
SET search_path=pg_catalog,public,pg_temp;
SELECT encode(sha256(convert_to(string_agg(pg_get_functiondef(p.oid), E'\n' ORDER BY p.proname),'UTF8')),'hex')
FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname IN (
 'account_deletion_policy_ready', 'account_deletion_inventory', 'account_deletion_mutation_allowed',
 'account_deletion_permit_delete', 'account_deletion_permit_update', 'account_deletion_receipt',
 'account_deletion_queue', 'account_deletion_cleanup', 'account_deletion_upload_guard',
 'account_deletion_guard_continuing_display');
SELECT encode(sha256(convert_to(string_agg(pg_get_triggerdef(t.oid), E'\n' ORDER BY c.relname,t.tgname),'UTF8')),'hex')
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
WHERE c.relnamespace='public'::regnamespace AND t.tgenabled IN ('O','A') AND
 (t.tgname IN ('account_deletion_guard_continuing_display','account_deletion_reserve_upload','account_deletion_preserve_upload'));
SQL
  target <<'SQL'
SET search_path=pg_catalog,public,pg_temp;
SELECT encode(sha256(convert_to(string_agg(pg_get_functiondef(p.oid), E'\n' ORDER BY p.proname),'UTF8')),'hex')
FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname IN (
 'account_deletion_open_request', 'account_deletion_scope', 'account_deletion_arm_scope',
 'account_deletion_arm', 'account_deletion_disarm', 'account_deletion_fence_restored_permits');
SQL
  exit
fi

subject=$(source_db -c "SET timezone='UTC'; SELECT encode(sha256(convert_to(jsonb_build_array(id, \"createdAt\")::text,'UTF8')),'hex') FROM \"user\" WHERE id='synthetic-restore-a'")
rights=$(source_db -c "SELECT encode(sha256(convert_to(jsonb_build_array(rights_basis,review_reference)::text,'UTF8')),'hex') FROM account_deletion_publication WHERE review_reference='TEST-RIGHTS-1'")
# The original application transaction commits on the source after the dump.
# This isolated source fixture alone gets a recent synthetic session.
source_db <<'SQL'
UPDATE session SET "createdAt"=now(), "expiresAt"=now()+interval '1 hour', token='synthetic-source-only'
WHERE "userId"='synthetic-restore-a';
SQL
if [[ "$with_authorization" == true ]]; then
  if [[ "${pre_0027_checkpoint:-}" == true ]]; then
    { printf 'SET ROLE restore_owner; SET search_path=public,pg_catalog;\n'; cat migrations/0027_account_deletion_authorization.up.sql; } | source_db
    record_0027
  fi
  source_case=$(source_db -c "SELECT account_deletion_open_request('synthetic-restore-a','synthetic-source-only','NONFUNCTIONAL-HASH',repeat('d',64))")
  scope=$(source_db -c "SELECT account_deletion_arm_scope('$source_case')")
  openssl rand -out "$scratch/source.key" 32
  cp "$scratch/source.key" "$scratch/recovered.key"
  node --input-type=module - "$source_case" "$scope" <<'JS' | \
    node scripts/account-deletion-authorization/case-record.mjs seal "$scratch/intent.enc" "$scratch/source.key" > "$scratch/intent.sha256"
const [caseId,snapshot] = process.argv.slice(2);
const review=JSON.parse(snapshot);
console.log(JSON.stringify({kind:'account-deletion-arm-intent-v2',caseId,...review,
 recordedUtc:new Date().toISOString(), expiresUtc:new Date(Date.now()+600_000).toISOString(),
 authorizationRef:'approved-synthetic-case', dispositionRef:'reviewed-synthetic-scope', custodyRef:'independent-test-file',
 tallyReview:{subjectFingerprint:review.scope.subjectFingerprint,emailSha256:review.scope.emailSha256,
  reference:'synthetic-external-search',submissions:[{id:'synthetic-unawarded',kind:'unawarded',dispositionRef:'synthetic-pending-disposition'}]}}));
JS
  intent_hash=$(cat "$scratch/intent.sha256")
  rm "$scratch/source.key"
  node scripts/account-deletion-authorization/case-record.mjs verify "$scratch/intent.enc" "$scratch/recovered.key" "$intent_hash"
  scope_hash=$(node -e 'process.stdout.write(JSON.parse(process.argv[1]).scopeSha256)' "$scope")
  # Discard the arm acknowledgement to model an operator left without a confirmed return.
  source_db -c "SELECT account_deletion_arm('$source_case','synthetic-restore-a','$scope_hash','$intent_hash',now()+interval '10 minutes')" > /dev/null
fi
if [[ "$scenario" == confirmed ]]; then
  source_db -c "SELECT account_deletion_execute('synthetic-restore-a','synthetic-source-only','NONFUNCTIONAL-HASH',repeat('d',64))" | grep -q 'database-erased-cleanup-pending'
elif [[ "$scenario" == execution-unknown ]]; then
  # The source commits. Give the reviewer no command acknowledgement.
  source_db -c "SELECT account_deletion_execute('synthetic-restore-a','synthetic-source-only','NONFUNCTIONAL-HASH',repeat('d',64))" > /dev/null
fi
if [[ "${post_erasure_checkpoint:-}" == true || "${armed_checkpoint:-}" == true ]]; then
  psql_local -c 'DROP DATABASE physcratic_restore_test' -c 'CREATE DATABASE physcratic_restore_test OWNER restore_owner'
  "${d[@]}" exec "$container" pg_dump -h /var/run/postgresql -U postgres -Fc physcratic_restore_source |
    "${d[@]}" exec -i "$container" pg_restore -h /var/run/postgresql -U postgres --exit-on-error -d physcratic_restore_test
fi
openssl genpkey -algorithm ED25519 -out "$scratch/reviewer.key"
openssl pkey -in "$scratch/reviewer.key" -pubout -out "$scratch/reviewer.pub"
key_digest=$(sha256sum "$scratch/reviewer.pub" | cut -d ' ' -f 1)
database_oid=$(target -c "SELECT oid FROM pg_database WHERE datname=current_database()")
target_version=0026
fenced_epoch=
if [[ "$with_authorization" == true && "${pre_0027_checkpoint:-}" != true ]]; then
  target_version=0027
  fenced_epoch=$(target -c 'SET ROLE restore_owner; SELECT account_deletion_fence_restored_permits()')
fi
node --input-type=module - "$container" "$subject" "$rights" "$database_oid" "$target_version" "${source_case:-}" "${intent_hash:-}" "$scenario" "$fenced_epoch" > "$scratch/approval.json" <<'JS'
import { randomUUID } from 'node:crypto';
const [containerId, subjectFingerprint, digest, databaseOid, targetRevision, sourceCase, intentSha256, scenario, epoch] = process.argv.slice(2);
console.log(JSON.stringify({
  version: sourceCase ? 2 : 1, caseId: randomUUID(), deletionRecord: 'SYNTHETIC-INDEPENDENT-RECEIPT',
  ...(sourceCase && {databaseOid:Number(databaseOid), targetRevision, recoveryPermitEpoch:epoch || null,
    tallyReferences:['synthetic-unawarded'], sourceAuthorization:{
    caseId:sourceCase, intentSha256, outcome:scenario==='confirmed' ? 'receipt-confirmed' : scenario,
    evidenceRef:scenario==='confirmed' ? 'synthetic-source-receipt' : 'synthetic-independent-adjudication',
    decision:scenario==='confirmed' ? 'reconcile-confirmed' : 'adjudicated-reapply',
  }}),
  approvedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 600_000).toISOString(),
  containerId, database: 'physcratic_restore_test',
  subjectId: 'synthetic-restore-a', subjectFingerprint,
  publications: [{
    problemId: '00000000-0000-4000-8000-000000000001',
    revisionId: '10000000-0000-4000-8000-000000000001', digest,
  }],
  cleanup: [
    { provider: 'author', pathname: 'author-media/synthetic-restore/pending.png', held: false },
    { provider: 'author', pathname: 'solution-evidence/synthetic-restore/held.png', held: true },
  ],
}, null, 2));
JS
sign() { openssl pkeyutl -sign -rawin -inkey "$scratch/reviewer.key" -in "$1" -out "$2"; }
sign "$scratch/approval.json" "$scratch/approval.sig"
reconcile() {
  local extra=()
  if [[ "$with_authorization" == true ]]; then extra+=("$scratch/intent.enc" "$scratch/recovered.key"); fi
  node "$tool/reconcile-local.mjs" "$container" "$scratch/${1:-approval}.json" \
    "$scratch/${2:-approval}.sig" "$scratch/reviewer.pub" "${3:-$key_digest}" "${extra[@]}"
}

reject() {
  local expected=$1
  shift
  if "$@" > "$scratch/rejected.log" 2>&1; then
    echo "Expected refusal: $expected" >&2
    exit 1
  fi
  grep -Fq "$expected" "$scratch/rejected.log" || { cat "$scratch/rejected.log" >&2; exit 1; }
}
variant() {
  node --input-type=module - "$scratch/approval.json" "$2" > "$scratch/$1.json" <<'JS'
import { readFileSync } from 'node:fs';
const a = JSON.parse(readFileSync(process.argv[2], 'utf8'));
switch (process.argv[3]) {
  case 'wrong-revision': a.targetRevision = a.targetRevision === '0027' ? '0026' : '0027'; break;
  case 'wrong-intent': a.sourceAuthorization.intentSha256 = '0'.repeat(64); break;
  case 'wrong-epoch': a.recoveryPermitEpoch = '00000000-0000-4000-8000-000000000001'; break;
  case 'missing-tally': a.tallyReferences = []; break;
  case 'hold-downgrade': a.cleanup.find(p => p.held).held = false; break;
  case 'unadjudicated': a.sourceAuthorization.outcome = 'execution-unknown'; a.sourceAuthorization.decision = 'reconcile-confirmed'; break;
  case 'wrong-oid': a.databaseOid += 1; break;
  case 'wrong-subject': a.subjectId = 'synthetic-restore-b'; break;
  case 'wrong-container': a.containerId = '0'.repeat(64); break;
  case 'wrong-rights': a.publications[0].digest = '0'.repeat(64); break;
  case 'omitted-cleanup': a.cleanup.pop(); break;
  case 'missing-cleanup':
    a.cleanup.push({ provider: 'author', pathname: 'author-media/synthetic-restore/after-checkpoint.png', held: true });
    break;
  case 'expired':
    a.approvedAt = '2020-01-01T00:00:00Z';
    a.expiresAt = '2020-01-01T01:00:00Z';
    break;
}
console.log(JSON.stringify(a));
JS
  sign "$scratch/$1.json" "$scratch/$1.sig"
}

baseline() {
  target <<'SQL'
SELECT jsonb_build_array(
  (SELECT to_jsonb(u) FROM "user" u WHERE id='synthetic-restore-b'),
  (SELECT to_jsonb(a) FROM account a WHERE "userId"='synthetic-restore-b'),
  (SELECT to_jsonb(s) FROM session s WHERE "userId"='synthetic-restore-b'),
  (SELECT to_jsonb(p) FROM community_profile p WHERE user_id='synthetic-restore-b'),
\if :with_completions
  (SELECT to_jsonb(m) FROM personal_problem_completion m WHERE user_id='synthetic-restore-b'),
  (SELECT to_jsonb(l) FROM personal_completion_write_limit l WHERE user_id='synthetic-restore-b'),
\endif
  (SELECT to_jsonb(c) FROM coaching_inquiry c WHERE contact='synthetic-restore-b@example.invalid'),
  (SELECT to_jsonb(p) FROM authored_problem p WHERE slug='other-author'),
  (SELECT jsonb_agg(to_jsonb(v) ORDER BY v.id) FROM authored_revision v),
  (SELECT to_jsonb(o) FROM account_deletion_outbox o WHERE pathname LIKE '%/unrelated.png'),
  (SELECT to_jsonb(h) FROM account_deletion_pending_upload h WHERE pathname LIKE '%/held.png'),
  (SELECT jsonb_agg(to_jsonb(m) ORDER BY m.id) FROM physcratic_production_migrations m),
  (SELECT jsonb_agg(jsonb_build_array(p.oid,p.proowner,p.proacl,pg_get_functiondef(p.oid)) ORDER BY p.oid)
   FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname LIKE 'account_deletion_%'));
SQL
}
rollback_state() {
  target <<'SQL'
SELECT EXISTS(SELECT FROM "user" WHERE id='synthetic-restore-a')
 AND EXISTS(SELECT FROM account WHERE "userId"='synthetic-restore-a')
 AND EXISTS(SELECT FROM session WHERE "userId"='synthetic-restore-a')
 AND EXISTS(SELECT FROM community_profile WHERE user_id='synthetic-restore-a')
\if :with_completions
 AND EXISTS(SELECT FROM personal_problem_completion WHERE user_id='synthetic-restore-a')
\endif
 AND EXISTS(SELECT FROM coaching_inquiry WHERE contact='synthetic-restore-a@example.invalid')
 AND EXISTS(SELECT FROM account_deletion_evidence WHERE subject_id='synthetic-restore-a')
 AND EXISTS(SELECT FROM authored_problem WHERE slug='stale-rights' AND state='published')
 AND (SELECT count(*) FROM account_deletion_receipt_store)=1
 AND (SELECT count(*) FROM account_deletion_outbox)=1
 AND NOT EXISTS(SELECT FROM pg_proc WHERE proname='restore_erasure_execute');
SQL
}
baseline > "$scratch/before.json"
if [[ "$with_authorization" == true ]]; then
  variant wrong-intent wrong-intent
  reject 'External arm intent checksum mismatch' reconcile wrong-intent wrong-intent
  variant wrong-oid wrong-oid
  reject 'Installed erasure revision is not reviewed' reconcile wrong-oid wrong-oid
  variant wrong-revision wrong-revision
  reject 'Invalid source authorization or target binding' reconcile wrong-revision wrong-revision
  variant missing-tally missing-tally
  reject 'External arm intent and signed approval differ' reconcile missing-tally missing-tally
  variant hold-downgrade hold-downgrade
  reject 'Restored authorization differs from independent approval' reconcile hold-downgrade hold-downgrade
  variant unadjudicated unadjudicated
  reject 'Invalid source authorization or target binding' reconcile unadjudicated unadjudicated
  if [[ "$target_version" == 0027 ]]; then
    variant wrong-epoch wrong-epoch
    reject 'Restored permit fence is missing or differs from approval' reconcile wrong-epoch wrong-epoch
  fi
fi
if [[ "${armed_checkpoint:-}" == true ]]; then
  reject 'Reviewed erasure scope changed' target -c "SELECT account_deletion_execute('synthetic-restore-a','synthetic-source-only','NONFUNCTIONAL-HASH',repeat('d',64))"
  reject 'Reviewed erasure scope changed' target -c "SELECT account_deletion_arm('$source_case','synthetic-restore-a','$scope_hash','$intent_hash',now()+interval '10 minutes')"
  target -c "UPDATE account_deletion_request SET armed_scope_sha256=repeat('7',64) WHERE id='$source_case'"
  reject 'Restored authorization differs from independent approval' reconcile
  target -c "UPDATE account_deletion_request SET armed_scope_sha256='$scope_hash' WHERE id='$source_case'"
  target -c "SELECT account_deletion_disarm('$source_case','$intent_hash')"
  reject 'Restored authorization differs from independent approval' reconcile
  # Restore the fixture's original row for the separately approved replay.
  target -c "UPDATE account_deletion_request SET revoked_arm_intents='{}',arm_intent_sha256='$intent_hash',armed_scope_sha256='$scope_hash',armed_until=now()+interval '10 minutes' WHERE id='$source_case'"
fi
if [[ "${post_erasure_checkpoint:-}" == true ]]; then
  target -c "UPDATE account_deletion_receipt_store SET arm_intent_sha256=repeat('8',64) WHERE id='$source_case'"
  reject 'Restored authorization differs from independent approval' reconcile
  target -c "UPDATE account_deletion_receipt_store SET arm_intent_sha256='$intent_hash' WHERE id='$source_case'"
  variant omitted-cleanup omitted-cleanup
  reject 'Restored authorization differs from independent approval' reconcile omitted-cleanup omitted-cleanup
  [[ $(reconcile) == ALREADY_RECONCILED && $(reconcile) == ALREADY_RECONCILED ]]
  baseline > "$scratch/after.json"
  cmp -s "$scratch/before.json" "$scratch/after.json"
  [[ $(target -c "SELECT count(*) FROM account_deletion_receipt_store") == 2 ]]
  echo 'PASS recovered source receipt with lost erase acknowledgement, zero duplicate receipts'
  exit
fi
reject 'Recent valid session required' target -c "SELECT account_deletion_execute('synthetic-restore-a','EXPIRED-synthetic-restore-a','NONFUNCTIONAL-HASH',repeat('a',64))"
reject 'permission denied' target -c 'SET ROLE restore_runtime; SELECT account_deletion_execute(NULL,NULL,NULL,NULL)'
reject 'permission denied' target -c 'SET ROLE restore_runtime; SELECT * FROM account_deletion_pending_upload'
reject 'Cannot read the local approval' reconcile approval missing
reject 'Reviewer public key fingerprint mismatch' reconcile approval approval "$(printf '%064d' 0)"
for test_case in wrong-subject wrong-container wrong-rights missing-cleanup expired; do
  variant "$test_case" "$test_case"
done
reject 'Independent approval signature is invalid' reconcile wrong-subject approval
reject 'Approval does not match the disposable target' reconcile wrong-container wrong-container
reject 'Erasure authorization is outside its approved window' reconcile expired expired
if [[ "$with_authorization" == true ]]; then
  reject 'External arm intent and signed approval differ' reconcile wrong-subject wrong-subject
else
  reject 'Authorized restored account does not match' reconcile wrong-subject wrong-subject
fi
reject 'Continuing publication rights differ from independent approval' reconcile wrong-rights wrong-rights
reject 'Expected cleanup obligation or upload hold is absent' reconcile missing-cleanup missing-cleanup
if [[ "$with_authorization" == true ]]; then
  target -c "INSERT INTO community_external_medal(user_id,competition,award,year,country,competition_name,tally_reference)
  VALUES('synthetic-restore-a','APhO','gold',2025,'ID','','historical_unreviewed')"
  reject 'Restored authorization differs from independent approval' reconcile
  [[ $(target -c "SELECT count(*) FROM community_external_medal WHERE tally_reference='historical_unreviewed'") == 1 ]]
  target -c "DELETE FROM community_external_medal WHERE tally_reference='historical_unreviewed'"
fi
[[ $(rollback_state) == t ]]
baseline > "$scratch/after-refusals.json"
cmp -s "$scratch/before.json" "$scratch/after-refusals.json"

target -c "UPDATE coaching_inquiry SET goals='Changed since review' WHERE contact='synthetic-restore-a@example.invalid'"
reject 'Mixed evidence requires adjudication' reconcile
target -c "UPDATE coaching_inquiry SET goals='Reviewed fixture' WHERE contact='synthetic-restore-a@example.invalid'"
target -c 'ALTER TABLE authored_problem DISABLE TRIGGER account_deletion_guard_continuing_display'
reject 'Installed erasure revision is not reviewed' reconcile
target -c 'ALTER TABLE authored_problem ENABLE TRIGGER account_deletion_guard_continuing_display'
target -c 'ALTER TABLE community_profile DROP CONSTRAINT community_profile_user_id_fkey'
reject 'Account erasure foreign keys differ from the reviewed fixture' reconcile
target -c 'ALTER TABLE community_profile ADD CONSTRAINT community_profile_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE'
target -c 'ALTER TABLE community_badge_selection DISABLE TRIGGER ALL'
reject 'Account erasure foreign keys differ from the reviewed fixture' reconcile
target -c 'ALTER TABLE community_badge_selection ENABLE TRIGGER ALL'
if [[ "$with_completions" == true ]]; then
  target -c 'ALTER TABLE personal_problem_completion DROP CONSTRAINT personal_problem_completion_user_id_fkey'
  reject 'Account erasure foreign keys differ from the reviewed fixture' reconcile
  target -c 'ALTER TABLE personal_problem_completion ADD CONSTRAINT personal_problem_completion_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE'
else
  [[ $(target -c "SELECT to_regclass('public.personal_problem_completion') IS NULL AND to_regclass('public.personal_completion_write_limit') IS NULL") == t ]]
fi

target -c 'SELECT pg_sleep(20) /* isolated-writer-sentinel */' > "$scratch/session.log" 2>&1 &
busy_session=$!
for attempt in {1..30}; do
  if [[ $(target -c "SELECT exists(SELECT FROM pg_stat_activity WHERE pid<>pg_backend_pid() AND query LIKE '%isolated-writer-sentinel%')") == t ]]; then break; fi
  sleep .1
done
reject 'Restore database is not isolated' reconcile
target -c "SELECT pg_terminate_backend(pid, 4000) FROM pg_stat_activity WHERE pid<>pg_backend_pid() AND query LIKE '%isolated-writer-sentinel%'" > /dev/null
wait "$busy_session" || true
[[ $(rollback_state) == t ]]
echo 'PASS approval, wrong target, concurrent session, drift, stale session and rollback refusal'

[[ $(reconcile) == RECONCILED ]]
[[ $(reconcile) == ALREADY_RECONCILED ]]
baseline > "$scratch/after.json"
cmp -s "$scratch/before.json" "$scratch/after.json"
outcome() {
  "$1" <<'SQL'
SELECT NOT EXISTS(SELECT FROM "user" WHERE id='synthetic-restore-a')
 AND NOT EXISTS(SELECT FROM account WHERE "userId"='synthetic-restore-a')
 AND NOT EXISTS(SELECT FROM session WHERE "userId"='synthetic-restore-a')
 AND NOT EXISTS(SELECT FROM verification WHERE id='fixture-verification-a')
 AND NOT EXISTS(SELECT FROM community_profile WHERE user_id='synthetic-restore-a')
\if :with_completions
 AND NOT EXISTS(SELECT FROM personal_problem_completion WHERE user_id='synthetic-restore-a')
 AND NOT EXISTS(SELECT FROM personal_completion_write_limit WHERE user_id='synthetic-restore-a')
\endif
 AND NOT EXISTS(SELECT FROM coaching_inquiry WHERE contact='synthetic-restore-a@example.invalid')
 AND NOT EXISTS(SELECT FROM account_deletion_evidence WHERE subject_id='synthetic-restore-a')
 AND NOT EXISTS(SELECT FROM authored_problem WHERE slug='private-draft')
 AND EXISTS(SELECT FROM authored_problem WHERE slug='licensed' AND state='published'
             AND owner_id='__physcratic_deleted_principal_v1__'
             AND published_revision_id='10000000-0000-4000-8000-000000000001')
 AND EXISTS(SELECT FROM authored_problem WHERE slug='stale-rights'
             AND owner_id='__physcratic_deleted_principal_v1__' AND state='archived' AND published_revision_id IS NULL)
 AND (SELECT count(*) FROM account_deletion_outbox WHERE state='pending' AND pathname IN (
   'author-media/synthetic-restore/pending.png','solution-evidence/synthetic-restore/held.png'))=2
 AND (SELECT count(*) FROM account_deletion_receipt_store)=2
 AND NOT EXISTS(SELECT FROM account_deletion_mutation)
 AND NOT EXISTS(SELECT FROM pg_proc WHERE proname='restore_erasure_execute');
SQL
}
[[ $(outcome target) == t ]]
if [[ "$scenario" != arming-unknown ]]; then [[ $(outcome source_db) == t ]]; fi
if [[ "$scenario" == arming-unknown ]]; then
  [[ $(source_db -c "SELECT EXISTS(SELECT FROM \"user\" WHERE id='synthetic-restore-a')") == t ]]
fi
reject 'Verified account required' target -c "SELECT account_deletion_execute('synthetic-restore-a','EXPIRED-synthetic-restore-a','NONFUNCTIONAL-HASH',repeat('a',64))"
reject 'permission denied' target -c 'SET ROLE restore_runtime; SELECT account_deletion_execute(NULL,NULL,NULL,NULL)'
[[ $(target -c "SHOW listen_addresses") == '' ]]
target -c "UPDATE account_deletion_receipt_store SET expires_at=now()-interval '1 second' WHERE actor_tag<>'unrelated-tag'"
reject 'Existing reconciliation receipt conflicts with restored account' reconcile
echo 'PASS real dump/restore and normal-erasure parity, idempotency, other-account and ACL preservation, publication and held cleanup'
