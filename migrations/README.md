# Explicit SQL migrations

Phase8A verified0001–0006 unchanged, ordering/additivity/rollback and absence of
build/startup/deploy migration hooks. Only disposable local DBs were migrated;
shared/production ledger state was not accessed or verified. See
[release gates and0005/0006 checksums](../docs/engineering/AUTHORING_RELEASE_BLOCKERS.md).

## Phase 7 discovery indexes (0006)

`0006_authored_discovery.up.sql` is additive after0005: immutable public metadata
search function, published UUID keyset index, revision full-text/JSONB/difficulty
indexes only. No content import, publication, extension or private table change.
SQL is authoritative; Drizzle records the indexes. Apply separately using the
existing advisory lock, reviewed checksum/source-commit ledger and explicit
target selection below. No application startup/build migration exists. Word search
returns generic503 until its search function is installed. Down drops only the
four indexes/function and preserves publications/history; disposable up/down/up
and index usability checks pass. No shared or production migration was run.
See [discovery handoff](../docs/engineering/AUTHORED_LIBRARY.md).

`0001_problem_authoring` is the first additive feature migration. It changes no old table and has no runtime/build hook. SQL is authoritative for deferred foreign keys, reverse part/key completeness constraints and immutability/sealing triggers, which Drizzle's table declarations cannot fully represent. Do not run Drizzle schema push against this schema: it can discard these invariants.

Use PostgreSQL 17 and an explicitly selected disposable/staging database. Do not use ambient `DATABASE_URL` for local verification. Back up and inspect the target before any separately approved deployment. No production migration is authorized by Phase 1.

Bookkeeping: reserve monotonically increasing migration IDs; apply once in a transaction with an advisory migration lock and a reviewed ledger. The deployment operator must record migration ID, SHA256 of the reviewed up file, source commit and execution result in its migration ledger. A duplicate apply fails on existing tables, rather than silently skipping schema drift. No ledger or migration runs automatically in the application.

## Disposable verification

Start a local container without published ports: `docker run --rm -d --name physcratic-phase1-pg -e POSTGRES_PASSWORD=local-test-only postgres:17-alpine`.
Wait for `docker exec physcratic-phase1-pg pg_isready -U postgres`.
Use `docker exec -i physcratic-phase1-pg psql -U postgres -v ON_ERROR_STOP=1` for the following inputs:

1. Bootstrap ONLY in this empty test DB: `CREATE TABLE "user" (id text PRIMARY KEY);`.
2. Send `BEGIN;`, the complete up file, and `COMMIT;`.
3. Send the test SQL file. It creates an author and verifies owner/version/identity constraints, cross-problem pointers, immutable revision/keys, late parts and empty-revision rejection.
4. Send `BEGIN;`, the complete down file, and `COMMIT;`.
5. Send the up file in a transaction again; verify the existing user survived. Remove the container with `docker rm -f physcratic-phase1-pg`.

Phase 1 verification ran this up/test/down/up round trip successfully on PostgreSQL 17, with existing user count still 1. This is not verification against the live production schema.

## Publication transaction contract (Phase 2)

Validate the entire draft using `publishableDraftSchema`, ownership/email verification, optimistic version and permitted media before writing. Insert `authored_revision_part` and `authored_revision_private_part` rows first, then the matching `authored_revision` as the final sealing insert, and update the problem pointer, all in one transaction. Deferred foreign keys require every part to have exactly one key and no orphan private rows. Final revision insertion verifies document part IDs/modes match relational part identities. Child rows and revision must share the same inserting PostgreSQL transaction (deferred xmin check); advisory locks serialize seal/insertion races. Assemble these inserts without separately released savepoints: PostgreSQL subtransactions can have different xmins and are conservatively rejected. This special order is required; the normal autocommit insert order will fail.

Never mutate/delete sealed revision, part or key rows. To edit, copy to draft and publish a new revision number. Removing the published pointer hides current publication while retaining history. Keys, draft hints and draft solutions live only in separate private tables; no new route reads these tables in Phase 1. JSON payload semantic validation, verified ownership authorization and media permissions belong to the typed service boundary, not these SQL checks.

Private table access uses the existing trusted application database role; it is not a standalone RLS/security-definer authorization system. Do not expose raw tables through generic clients. Add staff/authored APIs only in later phases. Author media storage tables are deferred to Phase 4; the Phase 1 content contract reserves media IDs without enabling upload/reference authorization.

## Rollback

Roll back application exposure first and retain historical revisions/keys once real data exists. The down file permanently deletes all authored content and keys, and is allowed only in a disposable DB or separately approved recovery before authored data exists. No production down migration is part of this change.

## Phase 2 write limiter (0002)

Apply `0002_authored_write_limit.up.sql` explicitly in a reviewed transaction after 0001. It adds only one fixed-minute counter row per author; atomic upserts enforce 60 write requests/minute across instances. It has no startup/build hook and changes no existing tables. Record ID/checksum/commit in the same reviewed ledger procedure. Disable authoring API writes before down migration; the down file drops only rate-limit state, preserving all authored revisions and private keys.

`bash scripts/test-problem-authoring.sh` creates an isolated PostgreSQL17 container bound to a random localhost port, applies both migrations, runs original sealing SQL regressions and API handler integration, tests limiter down/up, and removes the container. It never uses ambient DATABASE_URL. Sessions are injected for handler tests; production continues to use Better Auth. To run the full suite with database tests enabled, pass the installed pnpm command to the script; without AUTHORING_TEST_DATABASE_URL, the DB integration test explicitly skips. No production migration is authorized by this test script or phase.

## Phase 4 private author media (0003)

Apply `0003_author_media.up.sql` explicitly after 0002 in the same reviewed transaction/ledger procedure. It creates registry/quota/draft/revision binding tables and sealing/lifecycle triggers; it changes no legacy auth/practice/archive tables. Use a **private** Vercel Blob store with the existing server-only `BLOB_READ_WRITE_TOKEN`; public stores are not supported. No client receives a Blob path/URL/token.

Publication must insert media bindings alongside revision parts/private keys **before** the final revision insert, in one transaction without released savepoints. Exact bidirectional document/private-image correspondence, same-problem/purpose FKs, ready-state checks, immutability and deferred xmin equality protect historical retention. Application operations lock problem/draft then media rows, serializing reference changes with retirement.

The proxy serves statement assets only while the problem is published, bound to its current or explicitly selected historical revision. Unpublish revokes anonymous historical reads too; private solution assets remain owner-only. PDFs download with attachment/nosniff/sandbox headers; file-signature/structure checks do not sanitize PDF contents or replace antivirus scanning.

Cleanup is owner-triggered, at most five objects per request. Ready unlinked objects wait 24 hours; pending/deleting objects wait one hour. Saved drafts and immutable historical bindings block retirement. Retirement marks the row first, deletes storage second and registry last; failures keep a retryable tombstone. Ambiguous recent PUT failures keep a tombstone for at least an hour and repeat deletion to catch late completion. Unsaved recovery references older than the grace period can require replacement; the UI warns before cleanup. Deleting the final orphan also removes an otherwise empty never-published problem, recovering its quota slot.

Rollback application exposure first. `0003_author_media.down.sql` **refuses any nonempty media registry**; never delete registry/history while physical objects or published bindings exist. Empty-registry up/down/up, populated rollback refusal, legacy sealing SQL, exact missing/extra media bindings, failure cleanup and concurrency are covered by disposable PostgreSQL integration with memory storage. No production migration/storage operation is authorized here.

## Phase 6A immutable student attempts (0004)

Apply explicit `0004_authored_attempts.up.sql` after0003 in a reviewed transaction using the existing ledger/checksum procedure. It adds only attempt/rate tables, FKs/checks/indexes and a new trigger; prior schema/data is unchanged. No application build/start migration hook exists. SQL is authoritative for strict JSON/outcome checks and immutable/current-publication guards; do not schema-push these away.

Each attempt stores only the authenticated student's normalized submitted answer, exact immutable problem/revision/part selection, outcome/reason/engine version, timestamp(3), ordinal and fixed no-reveal policy. It stores no private marking keys. Composite FKs preserve exact revision/part consistency. User/key uniqueness and unique positive bigint ordinals per user/revision/part supplement API serialization without a lifetime practice cap. API ordinals are exact decimal strings; indexed maximum lookup avoids counting all historical attempts. User FK RESTRICT and immutability preserve history rather than silently cascade-delete it.

Student API transactions lock per-user advisory namespace first, then current published parent FOR SHARE through grading/insert/commit. Existing publish/unpublish takes FOR UPDATE. The grader reuses that PoolClient; it does not wait for a second pool connection. Canonical idempotency replay is own-record retrieval even after unpublish; new attempts require the current published pointer. Only the rolling100/day quota is enforced under that same per-user lock; rate counts are atomic persistent fixed-minute upserts.

Disable submission exposure before rollback. The down file refuses any existing attempts; do not destroy historical student work/keys/revisions to roll back application exposure. Empty up/down/up, populated refusal, strict/FK/immutability/current-publication checks, publication races, retries and limits run only on disposable PostgreSQL in tests. No production migration is authorized by this phase.

Premerge policy revision corrects the still-unreleased0004 directly: attempt_number is bigint with CHECK>0, retains ordinal uniqueness, and has no1..10 CHECK. No production corrective migration is run. no-reveal-v1 prevents automatic disclosure on submission/grading; a future explicit student-initiated solution view may be separately authorized, but is not implemented by this migration/API. Long-lived history stays immutable/indexed/paginated; no purge or new lifetime storage cap is introduced.

## Community achievement showcase (0009)

Explicit additive operator migration after the authored schema 0001–0006 and community profile 0007; optional media 0008 is independent. Do not edit/replay earlier migrations or schema-push away SQL guards. No startup/build migration hook exists. Keep `COMMUNITY_ACHIEVEMENTS_ENABLED` OFF until 0009 and runtime grants are verified; profiles must also be enabled. The default-off route gate precedes auth/DB imports, so shipping code needs no new production schema.

0009 adds ordered 0–2 badge preferences, a shared per-account write bucket, two partial indexes, invoker-rights eligibility functions and a guard only on the new preference table. Existing auth, publication, grading and immutable history remain untouched. Counts use current published identities and complete current-revision unassisted automatic receipts, excluding self-authored/manual/static work. Counts cap at 50; over 2,000 sparse candidate identities yields unavailable solver progress. Public reads revalidate preferences live; invalid preferences remain dormant until eligibility returns or the owner replaces them.

See `docs/engineering/COMMUNITY_STATUS.md` for precise semantics, reviewed grant statements, ledger/transaction procedure and the user-owned deployment sequence. Index creation locks existing authored tables: use a quiet migration window, bounded lock/statement timeouts and rollback on failure. Never apply staging/production SQL during a coding batch. The down file is disposable-only and refuses populated selections. Disable exposure and preserve data for production rollback. Disposable PostgreSQL tests verify up/down/up with existing private profiles and run without 0008 or private-key runtime grants.


## Community medal showcase (0011)

`0011_community_medal_showcase.up.sql` requires installed 0009 and 0010. It preserves saved selections/order and extends the two-slot guard with owned, currently approved medals. Install its validation-function runtime EXECUTE grant **in the same transaction before COMMIT**, including when medal flags remain off, because earned-only writes also use the new CHECK. The approved-medal view additionally needs runtime SELECT. Exact prerequisites, grants, default-off UI/showcase flags and user-owned production procedure are in `docs/engineering/COMMUNITY_STATUS.md`. Never replay or edit 0001–0010. Down refuses any stored medal selection; preserve production data and roll back exposure with flags.


## Community favourites and verified solve counts (0012)

0012 requires authored 0001–0006 and Better Auth, independently of profile/achievement migrations. Install once via the reviewed owner ledger procedure, with trusted `search_path`, bounded lock/statement timeouts and the exact runtime grants in `docs/engineering/COMMUNITY_STATUS.md`. Only the trigger owner writes atomic totals; runtime receives SELECT on totals, SELECT/INSERT/DELETE on favourites and SELECT/INSERT/UPDATE on the shared limiter. Publication row locks retain existing authored UPDATE permission. The new attempt scan index needs a quiet migration window. Keep `COMMUNITY_PROBLEM_STATS_ENABLED` OFF until installation/grants are verified. Down refuses saved favourites. Future static Arena additions require an additive SQL allowlist update. No production SQL or deployment is performed by this repository change.


## Threaded discussions and reactions (0013)

0013 is additive after authored 0001–0006 and Better Auth, independently of 0007–0012. It adds bounded discussion/reaction storage, immutable ancestry/version guards, score maintenance, shared limits and duplicate hashes. Exact owner transaction, ledger and column-level runtime grants are in `docs/engineering/COMMUNITY_STATUS.md`. Runtime cannot delete comments, change identity/score or execute privileged trigger functions. The score trigger pins its owning schema and pg_temp last. Account deletion anonymizes authorship and removes reactions without removing threads. Down refuses existing discussion history. Keep `COMMUNITY_COMMENTS_ENABLED` OFF. Batch 4 additionally locks production even when that flag is true; Batch 5 moderation/reporting must review and replace the launch lock before production enablement. No production SQL or deployment is performed by this change.

## Contest participation (0014)

`0014_contest_participation.up.sql` is the byte-identical rename of this branch's former `0012_contest_participation.up.sql`. Number 0012 belongs to the immutable community problem statistics migration, and 0013 belongs to community discussions. Neither migration is changed. No open pull request reserved 0014 when this collision was reconciled.

For a fresh installation, verify the existing legacy `contest` and `contest_registration` tables. Prepare an owner-reviewed execution package that records the source filename, checksum and commit in the migration ledger atomically with 0014. The source contains its own BEGIN/COMMIT, so incorporate the ledger write before that COMMIT in the reviewed execution package rather than nesting the unchanged file inside another transaction. Preserve the source file byte-for-byte. Do not replay earlier migrations or run schema push.

If the former contest 0012 was already applied, preserve its original filename, checksum and commit as historical provenance. Inspect the existing contest tables, columns, constraints and indexes against the exact SQL before recording an operator-reviewed adoption of 0014. Do not automatically replay the renamed file, overwrite a ledger entry or mark community 0012 installed because contest 0012 ran. `IF NOT EXISTS` is not proof that an existing object has the expected definition. Existing contest data must not be dropped or recreated to resolve this numbering collision. This repository reconciliation performs no database or ledger writes and authorizes no production enablement.
