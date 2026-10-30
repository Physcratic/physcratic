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
