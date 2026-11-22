# Phase B owner checklist: permissions, then separately approved B1

19 November 2026. Engineering preparation only. **No Production SQL or activation is authorized by this document.** This supersedes the pre-cleanup procedure previously at this path. The owner accepted the November 19 serving LOGIN sample and removed the temporary variable. Reconcile deployment and binding continuity before using this checklist. See the [accepted evidence and archived procedure](RUNTIME_LOGIN_ATTESTATION.md).

## Corrected B1 release gate

The previous activation was rolled back and accepted. Keep `COMMUNITY_PROFILES_ENABLED=false`. Sections below retain the earlier permission review. The accepted B1 grants do not need replay.

1. Independently review the PR 2 candidate and its exact-head tests. Confirm the registration disclosure, Privacy Notice and synthetic account acceptance plan.
2. Qualify 0022 against the current restricted role and recovery plan. Obtain separate installation approval for the exact source, target and checksum. Keep profiles OFF through installation and code release.
3. Obtain separate activation approval after confirming Production serves the corrected code with profiles OFF. Change only the Production flag during the owner-controlled activation.
4. Verify a new synthetic username is private until email verification. Verify an existing account is private until it acknowledges publication, even with old visibility set. Confirm the five public fields, neutral author attribution, no stale-account edits and continued statistics.
5. Deactivate a synthetic public profile. Check the next profile, attribution, achievement and applicable media reads deny access. Verify saved details remain editable and acknowledgement cannot reactivate the profile.
6. On a critical failure, route back to the verified profiles-OFF deployment and restore the saved Production flag to false. Retain the schema, profile rows and claimed usernames. An older profiles-ON deployment still uses the legacy rule and is unsuitable as a rollback target.

## 1. Confirm the accepted release gate and obtain the first exact approval

- The reviewed source for these commands is **5e929d7ff8c4cc93b0755fcf3c968396caed54b8**. The earlier owner-confirmed PR204 cleanup deployment was **dpl_A4rYge5pwgYzVMhD6JYgabQ8NexB** from **4f840e67f359e558d49f44a4b81966012638fc9a**. Before execution, verify the current Ready deployment ID, source SHA and actual physcratic.com assignment in financial-dashboard under neuterions-projects. Preserve the private reference to the accepted sample and confirm its deployment and binding context for the candidate. PR204 removed the instrumentation, and the owner confirmed removal of the temporary variable.
- Confirm profiles OFF, statistics ON, all unrelated gates unchanged. Confirm actual current accepted rollback deployment and private persistent restricted-binding recovery references through owner control-plane access independent of the app. Missing private confirmations do not authorize another deploy or credential change. Stop on relevant source/deployment/binding drift.
- In Neon confirm **divine-mode-82940461 / br-quiet-dawn-b7m2zrt3 / ep-snowy-heart-b7c1220y / neondb**, PG18.7 and restricted LOGIN **physcratic_runtime_app**. SQL database name alone cannot identify the provider branch. Use the approved private TLS-verified administrative/metadata connection; do not retrieve or paste credentials here. Record the executing administrative identity separately from serving LOGIN.
- Coordinate a permission-change window with no competing grants/DDL. Approve target, role, source, exact revoke artifact/hash, post-checks and stop/recovery scope. Revoke and profile grants require **separate approvals**; never run them as an unattended combined script. No full role provisioning, old favourites-grant replay, migration or automatic repair.

From a clean checkout pinned to the reviewed release, verify artifacts before opening the database session:

```bash
set -euo pipefail
test "$(git rev-parse HEAD)" = '5e929d7ff8c4cc93b0755fcf3c968396caed54b8'
sha256sum -c <<'HASHES'
dcec5ac29b8a363fc2fd42742ffb7fce89e0a45522e4ffb25a505b5cfc7e28d2  scripts/activation/revoke-authored-problem-id.review.sql
ec8b59b652501014ec3f390b8fab7865ab51ecfa17581b68ff5b96c14215a1bd  scripts/activation/profiles-grants.review.sql
HASHES
```

If the release has advanced, stop and review the diff/CI, then explicitly approve the new source rather than changing this assertion silently. Use the released artifacts, not an unreviewed working copy.

## 2. Open private psql and perform read-only prechecks

From that checkout, use an **already configured owner-controlled service** with TLS `sslmode=verify-full` and approved private authentication. The following placeholder must be replaced with its existing private service name; it is not a connection string, credential-setup instruction or environment change to Vercel:

```bash
psql -X -w -v ON_ERROR_STOP=1 -v runtime_role=physcratic_runtime_app \
  'service=<EXISTING_APPROVED_OWNER_SERVICE> sslmode=verify-full'
```

`-w` fails if existing private authentication is unavailable. Do not add a password/URL to shell arguments/history, enable SQL echoing, invoke privileged functions as probes or use SET ROLE as LOGIN evidence.

Run these read-only statements before either separately approved operation (repeat in any new connection):

```sql
\set ON_ERROR_STOP on
\pset pager off
BEGIN READ ONLY;
SET LOCAL statement_timeout='5s';
SET LOCAL lock_timeout='1s';
SELECT current_database(),current_user,session_user,
       current_setting('server_version_num') AS server_version_num;
SELECT 1 / CASE WHEN
  :'runtime_role'='physcratic_runtime_app'
  AND current_database()='neondb'
  AND current_setting('server_version_num')='180007'
  AND EXISTS(SELECT 1 FROM pg_stat_ssl WHERE pid=pg_backend_pid() AND ssl)
  AND EXISTS(SELECT 1 FROM pg_roles WHERE rolname=:'runtime_role' AND rolcanlogin
    AND NOT (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls))
  AND NOT EXISTS(SELECT 1 FROM pg_roles a CROSS JOIN pg_roles r
    WHERE a.rolname=:'runtime_role' AND r.oid<>a.oid AND pg_has_role(a.oid,r.oid,'MEMBER'))
  AND has_schema_privilege(:'runtime_role','public','USAGE')
  AND NOT has_schema_privilege(:'runtime_role','public','CREATE')
  THEN 1 ELSE 0 END AS target_role_tls_guard;
COMMIT;
```

Any SQL error terminates this scripted session through ON_ERROR_STOP. If an interactive session remains open, stop and ROLLBACK as needed; do not proceed with a failed transaction. Match the printed administrative identity against the owner-approved identity. Preserve the accepted actual-serving LOGIN evidence separately.

Select the grant contract explicitly, then run both metadata inventories:

```sql
SET physcratic.audit_contract='batch-a';
\i scripts/activation/runtime-readonly.sql
\i scripts/runtime-role/verify.readonly.sql
```

Compare the returned ledger with the last accepted Production baseline, 0001 through 0018, and verify its checksums and original provenance against `scripts/production-upgrade/migrations.json`. The repository also contains 0019, 0020 and 0021. A source commit or deployment does not establish that those migrations ran. #209 adds the 0021 Arena key constraint change to source. It requires separate owner approval and ledger verification and is outside this Phase B permission window. If the live ledger includes later rows, or if any baseline row is missing or differs, stop and reconcile the read-only evidence with the owner before proceeding.

The audit contract applies only to this psql connection. Before revocation, the only permitted unresolved effective privilege finding is the independently confirmed UPDATE(id) overgrant. Require valid constraints and indexes, enabled triggers, approved ownership, default ACLs and routine paths, a nonprivileged role, the exact 35-table baseline and Batch A, and zero hidden table-wide, inherited or PUBLIC authority. Missing six profile rights is `expected_missing_disabled`. If id is already absent or B1 rights already exist, stop to reconcile state instead of replaying operations.

**ON_ERROR_STOP does not turn audit finding rows into errors.** Read the entire inventory and final findings. The explicit guards below cover the narrow mutations; manual independent acceptance of the full inventories is mandatory. Do not pipe these multi-result audits to a simplistic empty-output check.

## 3. Execute only the independently approved narrow revocation

After prechecks and exact revoke approval, guard that the actual mutable column set is precisely the expected pre-revoke set, with no table-wide UPDATE:

```sql
BEGIN READ ONLY;
SELECT 1 / CASE WHEN
  NOT has_table_privilege(:'runtime_role','public.authored_problem','UPDATE')
  AND (SELECT array_agg(a.attname::text ORDER BY a.attname)
       FROM pg_attribute a WHERE a.attrelid='public.authored_problem'::regclass
       AND a.attnum>0 AND NOT a.attisdropped
       AND has_column_privilege(:'runtime_role',a.attrelid,a.attnum,'UPDATE'))
      = ARRAY['id','published_revision_id','state','updated_at']::text[]
  THEN 1 ELSE 0 END AS pre_revoke_guard;
COMMIT;
\i scripts/activation/revoke-authored-problem-id.review.sql
```

The approved file is transactional, has bounded lock/statement timeouts and revokes only UPDATE(id) from the fixed runtime role. It does not undo inherited/PUBLIC/table-wide rights; those are a STOP condition, not authority for wider REVOKEs.

Immediately, in the same connection:

```sql
BEGIN READ ONLY;
SELECT 1 / CASE WHEN
  has_any_column_privilege(:'runtime_role','public.authored_problem','UPDATE')
  AND NOT has_table_privilege(:'runtime_role','public.authored_problem','UPDATE')
  AND (SELECT array_agg(a.attname::text ORDER BY a.attname)
       FROM pg_attribute a WHERE a.attrelid='public.authored_problem'::regclass
       AND a.attnum>0 AND NOT a.attisdropped
       AND has_column_privilege(:'runtime_role',a.attrelid,a.attnum,'UPDATE'))
      = ARRAY['published_revision_id','state','updated_at']::text[]
  THEN 1 ELSE 0 END AS post_revoke_guard;
COMMIT;
SET physcratic.audit_contract='batch-a';
\i scripts/activation/runtime-readonly.sql
\i scripts/runtime-role/verify.readonly.sql
```

Require row-lock capability true, id UPDATE false, exactly three legitimate columns, every authored column `update_state=match`, all baseline/Batch A rights intact, six profile privileges expected missing, all forbidden checks false and final verifier **zero rows**. There must be no effective forbidden column findings. Inspect approved42501/connection/error aggregates. No Production write/lock probe is authorized by this metadata procedure.

**STOP here.** Record accepted results and obtain independent approval for the profile grant artifact. Never restore id merely to silence an old verifier. A failed post-check stops further permissions and activation; do not automatically regrant, restore or widen rights. Any corrective operation requires new exact owner authorization.

## 4. Execute only the independently approved profile delta

Reconfirm the exact hash/target/role, source/binding and previous accepted audit. If reconnecting, repeat section2 and select batch-a. Before the profile grant, fail closed if any effective column or table SELECT/INSERT/UPDATE profile right already exists:

```sql
BEGIN READ ONLY;
SELECT 1 / CASE WHEN NOT EXISTS (
 SELECT 1 FROM (VALUES ('public.community_profile'),('public.community_profile_write_limit')) t(name)
 CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE')) p(privilege)
 WHERE has_table_privilege(:'runtime_role',t.name,p.privilege)
    OR has_any_column_privilege(:'runtime_role',t.name,p.privilege)
) THEN 1 ELSE 0 END AS pre_profile_grant_guard;
COMMIT;
\i scripts/activation/profiles-grants.review.sql
```

No flag change accompanies this operation. It adds exactly SELECT/INSERT/UPDATE on community_profile and community_profile_write_limit, plus already-held schema USAGE. It adds no DELETE, sequences, media, achievement or privileged-function permissions.

Immediately run:

```sql
BEGIN READ ONLY;
SELECT 1 / CASE WHEN (
 SELECT count(*)=6 FROM (VALUES ('public.community_profile'),('public.community_profile_write_limit')) t(name)
 CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE')) p(privilege)
 WHERE has_table_privilege(:'runtime_role',t.name,p.privilege)
) AND NOT has_column_privilege(:'runtime_role','public.authored_problem','id','UPDATE')
THEN 1 ELSE 0 END AS post_profile_grant_guard;
COMMIT;
SET physcratic.audit_contract='b1';
\i scripts/activation/runtime-readonly.sql
\i scripts/runtime-role/verify.readonly.sql
```

Require six profile rows `present`, no `missing_required`, no forbidden table/column/grant-option/routine rights, id still false, exact baseline/Batch A preserved, and final verifier **zero rows**. Future practice rights remain expected missing while OFF. Review ownership/PUBLIC/default ACL/routine inventories too; zero final findings is necessary, not sufficient. On any error/finding, stop before activation. Keep profiles OFF and do not automatically undo grants or change credentials.

## 5. Separate B1 activation approval and acceptance

Permission reconciliation is not activation authority. Before any profile flag change, the owner must supply a monitored privacy/support address, takedown process and accountable owner, rollback operator, observation duration, and numeric error/latency/quota thresholds. These remain unresolved; no contact or threshold is invented here. Retain independent deployment AND binding recovery access. Public snapshots already delivered cannot be recalled; moderation remains OFF and any case-specific remedy needs separate authority.

Only after these prerequisites, accepted permission evidence, independent exact-release review/CI and explicit approval of synthetic acceptance identities/writes may the owner approve and release COMMUNITY_PROFILES_ENABLED=true. Preserve statistics ON and unrelated gates OFF. No migration or credential change.

Perform desktop and physical-phone synthetic acceptance: optional no-profile state; private creation and fresh guest API/page404; explicit publication with only handle/displayName/bio/educationLevel/favoriteTopicIds; cross-account isolation; stale A form with B cookie409 before B write/quota; unverified/expired denial; normalized unique immutable handle; second-device withdrawal with fresh guest404; no-store/noindex and non-identifying metadata; no unrelated controls.

Stop on privacy/isolation/consent failure, wrong source/role, permission drift or approved threshold breach. Under **separately approved** rollback authority, release only profiles OFF and verify API503/page404/hidden controls while retaining rows and statistics ON. Flag OFF is not erasure. No DELETE, DOWN migration, restore, credential edit or provider reconfiguration is authorized.

## Decisions

Permission engineering: GO to independent review and exact owner approvals. Production execution: HOLD until sections1–4 are separately authorized and run by the owner. Profile activation: NO-GO until permission evidence and privacy/support/health/activation gates are complete. The November 19 sample is accepted for its recorded deployment and pool. Reconcile any deployment or binding drift with the owner before proceeding.
