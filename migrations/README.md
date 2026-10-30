# Auth rate-limit migration

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
