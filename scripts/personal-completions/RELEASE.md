# Personal completions owner release runbook

Status is NO-GO for Production. This procedure requires named owner authorization for the exact commit, checksums, database, roles, deployment and flag. Work on the checkout and rehearsal below uses synthetic data. Builds and startup never run these SQL files.

## 1. Approve the source and target

1. Start from a clean LF checkout of the independently reviewed final commit. Compare the commit and the manifest's own SHA-256 against the signed-off review. From the repository root run:

   ```sh
   git rev-parse HEAD
   git status --porcelain
   sha256sum scripts/personal-completions/PACKAGE_SHA256SUMS
   sha256sum -c scripts/personal-completions/PACKAGE_SHA256SUMS
   sha256sum -c scripts/activation/PACKAGE_SHA256SUMS
   sha256sum -c scripts/runtime-role/PACKAGE_SHA256SUMS
   ```

   The current CI manifests bind their current source. Verify historical release packages at their recorded package and source commits. Preserve their hashes and evidence.

2. Require green exact-head GitHub checks, independent review, and evidence that both build and runtime scopes leave `PERSONAL_COMPLETIONS_ENABLED` unset for any initial integration. Confirm there is no competing migration 0025 and reconcile any overlapping source before relying on the checks.
3. In separately authorized read-only inspection, verify the actual database project, branch, endpoint, PostgreSQL version, trusted migration owner, and installed ledger. Compare every installed row and hash with the owner's approved ledger. Establish that 0025 is absent, the two names are free, the account/authoring objects and 0018 are installed and qualified, and the owner and runtime-role baseline are the ones intended. Stop for discrepancies. Migration 0024 belongs to external medals and has a separate release process. The historical operator for 0001 through 0018 also has its own fixed scope. Use the owner-approved single-migration procedure for 0025.
4. Record the current and rollback build SHA, prior flag state, actual serving LOGIN on pooled and direct bindings, named operator and incident owner, change window, and privacy-safe metrics. Use the owner-approved runtime verifier contract and identity/TLS checks. Provider and serving LOGIN evidence must independently agree. Do not put a DSN, session cookie, cursor, raw account ID, or request body in the report.

## 2. Qualify erasure and recovery before activation

1. Apply the exact scripts to a disposable schema with the approved ordinary and erasure roles. Rehearse with synthetic A and B, including a mark waiting behind a deletion and another committed mark before deletion. Verify both of A's tables are empty, A's old session cannot read or recreate data, B's rows and original timestamps remain, and ordinary roles cannot execute the eraser or delete accounts. Confirm the existing eraser routine owner, SECURITY DEFINER setting, fixed trusted search path, ACLs and definition remain unchanged before and after 0025. The migration creates no routines.
2. Require evidence of the actual approved 0018 erasure service or an owner-approved operational erasure path. Record policy authority, staffing, cleanup and retry handling, publication rights and media obligations from [the account deletion runbook](../../docs/engineering/ACCOUNT_DELETION_READINESS.md). Resolve the erasure path before accepting real marks. The current erasure route requires 0026. Support intake, staff-only review/cleanup and isolated replay do not supply an operational deletion alternative. A separately qualified path can satisfy this gate if it preserves verified authorization, erasure, publication, file, Tally and recovery obligations. Keep both tracks under separate owner approval. [Phase 5B owner decision](../../docs/engineering/ACCOUNT_DELETION_READINESS.md#phase-5b-owner-decision)
3. Obtain actual provider backup and PITR retention and expiry terms. Approve an independently recoverable and access-restricted record of erasure obligations since any restore point. A ledger restored with the database cannot suffice by itself. Rehearse an isolated restore with access and writes closed, reapplied erasures, independent reconciliation of both completion tables and existing media outbox obligations, and a check of unaffected accounts. Keep any restored copy isolated until the operator approves reopening. Never reactivate erased credentials. An unqualified restore path remains blocked.

## 3. Install migration 0025 with exposure off

Schema-only 0025 has no dependency on 0026. Under separate approval it can install with `PERSONAL_COMPLETIONS_ENABLED` unset at build and runtime and with the runtime grant delta deferred. Both tables must remain empty and inaccessible to the serving LOGIN. That adds no new completion data to recovery. The existing risk of resurrecting other data remains, including through the install recovery checkpoint. Use only an approved checkpoint and retain the ledger and both empty tables through ordinary app rollback. A restore from before 0025, if separately approved and safe to reopen, needs its schema and ledger reconciled before any future completion exposure.

1. Take the approved recovery checkpoint. Reconfirm the exact database, current owner and installed ledger at the start of the change window. Apply the reviewed **up** file once as the approved owner, in a single bounded transaction with psql `-X -v ON_ERROR_STOP=1`. The commands below are for the authorized operator's reviewed connection and source checkout.

   ```sql
   BEGIN;
   SET LOCAL lock_timeout = '2s';
   SET LOCAL statement_timeout = '30s';
   SELECT pg_advisory_xact_lock(hashtextextended('physcratic:authoring:migrations:v1', 0));
   -- Reconfirm the approved ledger and 0025 absence while holding the lock.
   \i migrations/0025_personal_completions.up.sql
   ```

2. Before recording success and committing, confirm the approved owner owns both relations, no unexpected default ACL applied, both are empty, and both account FKs have `ON DELETE CASCADE`. Check the completion table has exactly `user_id`, `problem_key`, and `completed_at`, the composite primary key and history index exist, and the timestamp default comes from the server. Compare the preflight routine inventory unchanged. Record `0025_personal_completions`, the exact up-file SHA-256, source commit and verified result in the approved production ledger in the same transaction. Any failed assertion or unexpected lock, ACL, object, or ledger state requires rollback of the transaction. After commit, independently verify the schema and ledger on the approved target.
3. Separately approve and apply the grant delta while the feature remains off. Run as the approved grantor with psql `-X -v ON_ERROR_STOP=1 -v runtime_role=...` and `-v completion_owner=...` using the reviewed identifiers.

   ```sql
   BEGIN;
   SET LOCAL lock_timeout = '2s';
   SET LOCAL statement_timeout = '10s';
   \i scripts/personal-completions/runtime-grants.review.sql
   \i scripts/personal-completions/runtime-delta.readonly.sql
   ```

   The delta query must return zero findings before commit and after commit. The broader baseline verifier may now report SELECT and DELETE on the mark table, SELECT and INSERT on the limiter, and their approved column privileges. Reconcile only those listed in the exact delta. Treat every other difference as a blocker. Do not replay historical grants. An erasure, staff, or unrelated role needs no direct grant on the new tables. Check the actual scoped LOGIN, ownership, memberships, grant options, and PUBLIC and inherited privileges. Keep log output free of user data.

## 4. Qualify activation and monitor

1. With synthetic accounts on the exact release configuration, rehearse feature OFF with the old schema and ON with 0025 and the reviewed grants. Match build and serving flags. Use separate A and B sessions and a guest, and verify mark, retry, unmark, timestamps, owner history, filtering, pagination and stale-cursor recovery. In a safely disposable target also verify unavailable storage, withdrawal, account erasure and rollback. Do not turn on another feature to satisfy these tests.
2. An owner must independently approve the release and exact flag change. Verify the serving LOGIN and target again. Enable only `PERSONAL_COMPLETIONS_ENABLED=true` on the approved build and serving scope. Start with the already approved bounded synthetic acceptance. Stop if feature gates, privacy, receipts, sorting or existing public/favourite/grading responses differ. Verify no-store and that logs omit completion data, account headers, cookies, and request bodies. Use durations, statuses and counts for operational monitoring.
3. Define acceptable error/latency thresholds from approved environment evidence. Monitor account isolation, stale resets, database pool occupancy, failures, timeouts, and support contacts. A local benchmark gives an engineering baseline for comparison.

## 5. Roll back safely

1. On a privacy incident or material regression, the authorized owner disables the feature at runtime and serves a reviewed build with the flag unset. Confirm the private API fails closed, personalized Arena headers receive the ordinary result, and old-schema public behavior is intact. Verify new writes stopped and existing records and erasure processing remain intact.
2. Retain both tables, data and the migration record for ordinary feature or code rollback. Fix and rehearse before reapplying any exposure. Revoking the specific grant delta is a separately reviewed, owner-operated option after application rollback when required for incident containment. Preserve the restricted erasure service and its approved operation.
3. The down file is for an explicitly authorized empty completion-table cleanup only. Check for dependencies, active requests, the ledger and a recovery point. Apply in one transaction with exposure off and verify the guarded refusal on a populated table. A restore for another incident requires Step 2's reconciliation before user traffic resumes. Never restore a deleted account to make rollback succeed.
