# Explicit SQL migrations

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

## Restored authentication shared limiter

### Auth rate-limit migration

`20261031_auth_rate_limit.sql` is additive and reviewed against locked Better Auth 1.7.14:
`better-auth/db.getAuthTables({rateLimit:{storage:'database'}})` and Kysely PostgreSQL adapter.
Expected table is quoted `rateLimit`: adapter-generated text id PK, required unique text key,
required integer count, required bigint lastRequest (epoch milliseconds). No user/Terms rows touched.
Drizzle declaration mirrors the table for engineering visibility; Better Auth uses pg/Kysely directly.

No migration runner executes this on startup/build/deploy. Do not run against a live database without
separate authorization. First review existing schema: CREATE intentionally fails on a name collision.
Use a reviewed database session and `psql --set ON_ERROR_STOP=1 --file migrations/20261031_auth_rate_limit.sql`
with the connection selected externally, never paste credentials into history/logs. Transaction + bounded
lock/statement timeout prevent partial table/index creation. Record migration hash/application in deployment records.

Isolated verification: start disposable postgres:16 on loopback with a *_test database, then set ONLY
AUTH_TEST_DATABASE_URL and run `pnpm test:auth:pg`. The test refuses non-loopback/non-*_test URLs,
creates a random schema, applies this exact SQL, runs real concurrent HTTP requests and drops that schema.
It never reads DATABASE_URL. Do not use an SSH tunnel to point this test at a live/staging database.
Default `pnpm test` skips this suite without the explicit URL; a skip is not concurrency evidence.

Rollout: inspect redacted deployed auth schema and backup/restore readiness; apply additive SQL to isolated
staging, validate tests/permissions and full auth smoke, then separately authorize production schema-first
rollout before deploying this code. Missing table/DB failure blocks auth rather than reverting to memory.
App role needs SELECT/INSERT/UPDATE/DELETE on rateLimit; migration role needs DDL privileges.

Rollback: restore prior application version FIRST while retaining this harmless additive table/index.
Prior code returns to memory limits, which weakens global abuse protection: monitor or restrict registration
until repaired. Never DROP/TRUNCATE while any instance uses DB storage, and never delete user/consent data.
A future separately approved cleanup migration may remove the table only after all old deployments stop using it.
Persisted keys contain normalized client IP/path; agree retention, access and cleanup before production.
Built-in opportunistic pruning is not a TTL guarantee for one-off keys; see engineering release checklist.

### Integration Preview scope (not verified)

The source branch's staging configuration was scoped to `codex/auth-hardening`.
Do not assume those database, origin, CAPTCHA or email allow-list overrides apply to
`codex/integrate-auth-authoring-v1`. Inspect the actual Preview branch settings and
confirm database isolation before any push-triggered Preview execution or smoke test.
No migration or deployment is performed by this integration. Existing staging migrations
must be inspected rather than reapplied; no production migration is authorized.
