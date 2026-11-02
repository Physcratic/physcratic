# Final Neon preflight and release execution plan — preparation only

**Staging migrations: NO-GO. Reviewed Blob patch push/deploy: NO-GO.**
Recovery is not demonstrated under exhausted branch capacity. Effective endpoint
bindings, inherited aliases, current remote schema and test-mail restrictions
also remain unverified. This package performs no remote SQL or resource writes.

Base/local branch: `codex/physcratic-authoring-completion` at
`4e18931e1c3e2f18271e6ff9f274a158c0c40f9a`. Preserved byte-for-byte:

- `work/physcratic-staging-blob.patch`, SHA256
  `6d9efad40f3383f03a80c56c8498f78d1f887485d40ef66380e651357354d5c9`.
- `work/physcratic-staging-blob-reviewed.patch`, SHA256
  `c67bf522b3c3101125466fa5f5de139ebb3e1e3abcfc8987fbf28a4872c9ad59`.
- `work/physcratic-staging-blob-followup.patch`, SHA256
  `4166a391ace042901dde22fd92e96316b02fee39c60b3bffe5b2b07bf354b259`.
- `AUTHORING_STAGING_VALIDATION.md`, SHA256
  `2e535c88b954f8e7f220bc685bf6901356cdd2928c4b913f25f1011432117c7c`.

All six migration UP files are unchanged. The previous 307/307 tests, exact PG18.6
upgrade/preservation checks and three browser-suite results remain recorded,
without claiming they validate today's remote state.

## What was and was not inspected

Read-only provider metadata was fetched for the specified project: project record,
branch inventory, snapshot inventory, and Vercel environment names/types/scopes
with **decryption disabled**. No connection-string retrieval, remote SQL, restore,
branch creation, configuration change, live user/mail/Blob operation, push,
merge or deployment occurred. All SQL execution in this task is disposable local
PostgreSQL 18.6, and all storage/mail transport tests are mocked.

Confirmed metadata:

- Vercel `neuterions-projects/financial-dashboard`,
  `prj_phm4794zl2QBICu5MMbLFxcHAfFq`: all seven supplied variables have Preview
  overrides for exactly `codex/physcratic-authoring-completion`. Presence/type/scope
  do not verify secret values or the environment of an existing deployment.
- `AUTHORING_STAGING_BLOB_STORE_ID` has Preview-wide value
  `store_3XHvtHs2UM4ZFD5d`. No custom-prefixed staging read/write token is present.
- Neon project `divine-mode-82940461` has three ready branches: main,
  physcratic-integration (`br-solitary-thunder-b7h5q79t`), physcratic-staging.
  The project API reports PG major version 18; the supplied server version is
  18.6, which is also the exact locally tested version. No remote SHOW was run.
- Snapshot `snap-bitter-cloud-b75hikb1`, name
  `physcratic-integration-pre-0004`, is listed as manual, source
  `br-solitary-thunder-b7h5q79t`, created **1 November 2026 18:21:53 Asia/Makassar**
  (`2026-11-01T10:21:53Z`), reported full size 33,431,552 bytes. This confirms
  existence, not restoration success, capacity, contents or current freshness.

The branch limit is exhausted according to the supplied operator evidence. The
project response does not expose an authoritative available-restore-slot budget;
its branch logical-size limit is not a branch-count limit. No capacity exception
for a restore has been established.

## Read-only preflight — separate from every write statement

Artifacts: `scripts/authoring-release/preflight-readonly.sql` and its SELECT-only
include `catalog-readonly.sql`. The wrapper uses `BEGIN ... REPEATABLE READ READ
ONLY`, bounded statement/lock timeouts, catalog SELECTs and exact table counts,
then COMMIT. There is no DDL, DML, temporary table, advisory lock or schema repair.
The psql `\gexec` input is generated solely as SELECT statements with `%I`-quoted
catalog identifiers. Permission/RLS-limited counts are unavailable, never zero.

The report inspects current database, server version/number, current/session role,
transaction mode, server address, schemas and schema privileges; public relations,
owners, RLS and SELECT visibility; auth/ledger columns/defaults; ledger constraints
and all six ledger fields; migration-owned constraints, indexes/readiness,
functions, triggers/enabled states and policies. Other public functions have
signatures/security metadata/source digests rather than arbitrary source bodies.
Exact counts cover public ordinary/partitioned tables. Views/foreign tables and
other schemas are inventoried, not treated as empty or automatically approved.
The write runner refuses partition/inheritance/foreign-table cases pending a separate
preservation review. Actual Better Auth schema adequacy still requires review of
the captured auth columns; migration checks do not bootstrap or repair auth.

**No actual remote drift classification is claimed in this report.** The earlier
three zero row counts do not prove other tables empty. SQL server identity/address
does not prove a Neon project, branch or endpoint; bind those through the secure
operator comparison below before running any remote preflight.

Future read-only command, only after separate permission for remote SQL:

```sh
# Inject the approved DIRECT target URL securely as AUTHORING_RELEASE_DIRECT_URL.
# Never put a URL/password in argv, shell history, logs, chat or a checked-in file.
umask 077
node scripts/authoring-release/operator.mjs collect-readonly \
  --remote-readonly-approved --out /approved/private/location/preflight.json
```

The explicit URL must name `ep-green-waterfall-b7qaw260` on `.neon.tech`, direct
rather than `-pooler`, database `neondb`, with complete credentials and required
TLS. The runner verifies TLS certificates/hostname and never consults inherited
`DATABASE_URL_UNPOOLED`, `PG*` or `POSTGRES_*` to choose its target. Driver errors
are reduced to fixed codes/SQLSTATE, never printed verbatim. Outputs are created
exclusively with mode 0600; credential-shaped catalog text is redacted. Counts
can time out: an incomplete result is a stop, not evidence of zero rows.

The standalone psql SQL is also executable using an independently verified,
operator-managed named service and secure password source. Do not use ambient
PGHOST/PGDATABASE defaults or pass a secret URI. Raw catalog output must remain
private and be screened before sharing; prefer the redacting guarded collector.
Neither command is authorized to run remotely in this task.

## Expected schema and ledger results

The local PG18.6 canonical catalogs are `scripts/authoring-release/baselines/v3.json`
through `v6.json`. They are generated from unchanged reviewed SQL, not Neon.
Comparison excludes environment-specific OIDs/owners from canonical schema
matching but retains exact column types/order/nullability/defaults, constraint
definitions/names/validation, index definitions/validity, trigger definitions and
enabled state, function definitions/properties, table persistence and RLS/policies.
An extra index/constraint/trigger or changed historical function is drift.

The real ledger contract is preserved: six NOT NULL columns: `id text` primary
key; `sha256 text` with lowercase 64-hex check; `source_commit text`;
`applied_at timestamptz DEFAULT clock_timestamp()`;
`applied_by text DEFAULT CURRENT_USER`; `result text CHECK(result='verified')`.
No alternate ledger or inferred historical rows are created.

The historical prefix must match:

| ID | SHA256 | source_commit / result |
| --- | --- | --- |
| `0001_problem_authoring` | `83ec2e53f95829aa6932a327dfd0362a3c197e190ddbcfb00a67d24a05c93d09` | `b191dd03d62aa4b01e7a3f08272b2417643f0d53` / `verified` |
| `0002_authored_write_limit` | `c10cd7ecb9d6da65e0e95012a7dd199edac02e7a54b4fc8de86bb6c59bdc553b` | same historical source / `verified` |
| `0003_author_media` | `db4e91998388dafd964507571fc408f2f74fdd8b1af466469674911dc4b6db3a` | same historical source / `verified` |

| Current verified state | Classification and only permissible new suffix |
| --- | --- |
| Exact schema v3 and exact three-entry ledger | 0004–0006 absent; candidate plan is 0004→0005→0006. |
| Exact schema v4 and matching contiguous four-entry ledger | Candidate suffix 0005→0006. |
| Exact schema v5 and matching contiguous five-entry ledger | Candidate suffix 0006. |
| Exact schema v6 and matching six-entry ledger | Already complete; no migration to run. |
| Schema v4/v5/v6 but ledger still ends at 0003 | Unledgered schema: HARD STOP, even if definitions match. |
| Any partial objects, wrong checksum/source/result, gap, unexpected ledger suffix, disabled guard, invalid index, extra/missing constraint, unknown version or mismatch | HARD STOP. No replay, repair, drop/recreate, schema push or DOWN. |

The missing suffix must have these exact hashes, also pinned in the runner:

- 0004: `e52abd4fa47e2c8abdc609fdc79c32c2f78a284df90b859463ae217abed7e423`.
- 0005: `65dfc1a1137cf963b7e579931fde6d8c315d0bfb8dbd6c465a8cc70d741335e4`.
- 0006: `3ed763699a4e58512604fe6b738dc7e8440c1f2291501e1c29fa2da07dd8a37f`.

For schema v3, expect 11 migration-owned tables; v4 adds student rate/attempt;
v5 adds three permission/media/reveal tables; v6 adds four discovery indexes and
the search function. All detailed definitions are in the canonical files. Counts
are observations to preserve, not prerequisites that all tables equal zero.

## Recovery assessment and rollback

Neon's official [Backup & restore](https://neon.com/docs/guides/backup-restore)
documents that one-step snapshot restore changes the branch ID while retaining
its name/connection binding and creates an `(old)` backup branch. Multi-step
restore creates a new branch for inspection before moving computes/settings.
The exposed API likewise supports prepare/finalize, not a proven quota-free
destructive overwrite. **Specifying an existing target is not evidence that no
additional branch capacity is needed.** PITR also creates a backup branch and is
not a demonstrated workaround for this quota or this branch's eligibility.

No usable recovery path has been established at the current limit and no restore
has been rehearsed. Migration execution remains NO-GO even if schema preflight is
clean. Do not delete or overwrite shared branches to make room. Obtain explicit
approval to increase/reserve capacity or an independently supported recovery
method, then perform an approved isolated rehearsal. Verify snapshot access,
capacity for the restored/backup branch and inspection compute, schema, ledger,
auth data, retained records and endpoint movement. Record role/permission and
provider evidence. Reconfirm the branch/endpoint mapping after any finalization.

The snapshot predates execution. Establish whether any subsequent writes need
preservation; if so, obtain an approved fresh/supplemental backup and tested
reconciliation rather than discarding them. A database snapshot does not restore
private Blob objects; preserve their registry/object correspondence and do not
run destructive cleanup during recovery.
Selecting a replacement snapshot or changing a branch binding requires rebinding
the package/approval to those resource IDs and re-reviewing checksums and tests;
the current package pins the supplied snapshot and branch deliberately.

Before COMMIT, any failure rolls back all suffix DDL and ledger inserts. After a
COMMIT attempt with an uncertain response, stop and inspect the ledger/schema in
a fresh read-only session; never blindly retry. After a confirmed COMMIT, disable
exposure and prefer a reviewed forward fix. Restoring a backup or moving computes
needs separate explicit recovery approval and reconciliation of later writes.
Do not run destructive DOWN migrations or remove historical attempts/reveals/media.

## Reviewed write procedure — currently disabled

Use the separate `operator.mjs execute-missing-suffix` command only after migration
approval. `approval-template.json` is deliberately false/incomplete. Copy it to a
private path outside the committed package, fill actual evidence and obtain the
operator's explicit approval; editing JSON is not authentication or authorization
by itself. Required attestations include isolated target vs Production, current
schema, correct migration role, quiesced writers, rehearsed usable recovery with
reserved capacity, and a common lock agreed by every migration actor.

Proposed lock, matching prior local tests:
`pg_advisory_xact_lock(hashtextextended('physcratic:authoring:migrations:v1',0))`.
This is a reviewed **proposal**, not evidence of an existing common remote lock.
If the operational lock differs, reconcile and re-review the package; do not let
parallel operators use different lock keys.

The code in `core.mjs:executeSuffix` implements this exact transaction:

1. Verify package checksums and all six original SQL hashes. Require the approved
   package digest, actual release SHA, role, target, snapshot/recovery evidence,
   and an explicit list of approved missing migration IDs. In normal mode the
   package must be committed in that SHA and the tracked checkout must be clean.
2. Connect only to the explicitly approved direct endpoint/database with verified
   TLS. Begin READ WRITE, bounded lock/statement timeouts, acquire the common
   transaction advisory lock and EXCLUSIVE-lock the existing ledger.
3. Reinspect live schema/ledger, require an exact recognized prefix and approved
   suffix. Never execute 0001–0003. Lock every pre-existing ordinary public table
   in SHARE ROW EXCLUSIVE mode in stable order to block DML; operators must also
   quiesce writes/DDL. Refresh READ COMMITTED metadata after waiting, rejecting
   changed relation inventory or prefix. This avoids migrating on a stale
   pre-lock snapshot. Independent uncoordinated DDL is outside the lock contract.
4. Stream server-side SHA256 row-image/xmin/ctid hashes for pre-existing rows and
   record table OIDs/counts internally. No application rows or private hashes are
   logged. This includes unrelated public tables and the original ledger rows.
5. Apply **only** approved suffix files in sequence. Immediately after each UP,
   insert into the existing ledger in the **same transaction**:

   ```sql
   INSERT INTO public.physcratic_integration_migrations
     (id,sha256,source_commit,result)
   VALUES ($1,$2,$3,'verified');
   ```

   Parameters are that file's exact ID/hash and the approved full release SHA;
   applied_at/applied_by use the existing defaults. Reclassify after each step.
6. Require final canonical v6/ledger and exact preservation of every prior
   row-image/xmin/ctid/table-OID fingerprint. Only new ledger rows/new suffix
   objects differ. Commit once. Any pre-commit failure rolls back the whole suffix.
7. Independently validate using a new read-only connection: schema v6, all six
   ledger rows/checksums, new rows' exact approved source SHA, counts, constraints,
   triggers, valid indexes and reviewed auth/base schema. Record sanitized result,
   release/deployment/resource IDs and preservation outcome, not credentials/data.

Future gated commands (NOT authorized now):

```sh
# A private approved record, never edits to the packaged false template.
node scripts/authoring-release/operator.mjs execute-missing-suffix \
  --approval /approved/private/location/migration-approval.json
node scripts/authoring-release/operator.mjs verify-postcommit-readonly \
  --remote-readonly-approved --approval /approved/private/location/migration-approval.json \
  --out /approved/private/location/postcommit.json
```

Run the post-commit command even if the commit response was lost, rather than
retrying the write command. The expectation file binds new source commits and
package digest; an expired execution window does not prevent read-only inspection.
The runtime role must remain distinct from migration authority as approved by
the operator. No role grants or auth bootstrap are part of these migrations.

## Secure effective environment/alias verification

Both configured branch values and the environment of a pinned deployment must be
verified. Existing deployments retain their old environment snapshot; seven new
overrides do not retroactively update the deployed 4e18931 runtime. Never test it
with writes to find out which DB/Blob store it uses.

Use a privileged trusted runtime/build context or securely bound deployment
configuration attestation. Compare Preview and Production values **in memory**;
emit only nonsecret endpoint IDs, pooled/direct status, database-match booleans,
credential-presence booleans and secret-equality booleans. No passwords, raw URL,
connection query parameters, secret digests, JWTs or environment dumps. The pure
helper `runtime-audit.mjs` and `operator.mjs audit-env-stdin` perform this comparison
without network calls. Feed a secure private pipe, never paste JSON secrets into
shell history or write them to repository/log files. Do not decrypt via chat.

For `DATABASE_URL`, parse URL.hostname, recognize endpoint ID before `-pooler`
and require `ep-green-waterfall-b7qaw260`, database `neondb`, complete credentials.
Production's parsed endpoint must be present and different, then verify both
endpoint→branch→project bindings using provider metadata. Compare the auth secrets
privately as distinct. Record deployment ID/SHA, environment, branch, actor/time
and variable-scope evidence. A redacted/irretrievable Secret, encrypted metadata
or CLI env pull omission means UNKNOWN; do not substitute guesses.

Metadata confirms the following shared Production/Preview/Development entries
with no authoring override: `DATABASE_URL_UNPOOLED`, `POSTGRES_URL`,
`POSTGRES_PRISMA_URL`, `POSTGRES_URL_NO_SSL`, `POSTGRES_HOST`, `PGHOST_UNPOOLED`,
`POSTGRES_PASSWORD`, `POSTGRES_USER`, `PGUSER`, `PGDATABASE`, `POSTGRES_DATABASE`.
The shared `DATABASE_URL` also exists, but this branch has its own override.
Inspect every URL/host alias securely, and associate separate credential parts
with their host/database. Unknown bindings are not safe. Current application DB
code reads only `DATABASE_URL`; unused inherited credentials are still exposed
to its process and tooling. Never use inherited `DATABASE_URL_UNPOOLED` for the
migration merely because its name sounds suitable. Under separate configuration
approval, remove unnecessary Preview exposure or scope all required aliases to
the isolated target; leave Production settings intact. No such changes were made.

For Blob, the local reviewed adapter and both legacy routes pass only the explicit
staging OIDC/store pair and reject missing/mismatched configuration, including an
explicit staging marker with Production identity. Ordinary Production and other
Previews retain their behavior. The 40 SDK/mock checks pass again with the shared
legacy token present. Provider metadata confirms the intended custom store ID,
but actual Function OIDC authorization is still unverified. After separate
deployment/read-only-storage approval, run the guarded no-upload store-selection
check from `AUTHORING_STAGING_BLOB.md`; never probe the shared store or retry with
default credentials. No manual OIDC token or new Blob token is required.

## Origins and test-mail recipients

Explicit `BETTER_AUTH_URL` must equal
`https://financial-dashboard-git-codex-physcr-54d12a-neuterions-projects.vercel.app`;
the actual handler was locally tested at this origin previously. It anchors
verification links/callbacks but does not remove inherited trusted `VERCEL_URL`,
`VERCEL_PROJECT_PRODUCTION_URL`, or optional `BETTER_AUTH_TRUSTED_ORIGINS`.
Audit the exact deployment's resolved `auth.$context.trustedOrigins` and submission
origin set in a trusted server context; allow only explicitly approved origins.
Do not log the entire auth context/options. Approve a broader set explicitly or
separately authorize a scoped stable-only auth correction and retest it.

`STAGING_VERIFICATION_EMAIL_ALLOWLIST` is present Preview-wide in metadata,
with overrides for other branches. **This branch's `sendVerificationEmail` never
reads it.** The new mocked audit test confirms that an out-of-list synthetic
address still reaches the mocked Resend request. Nothing was actually sent.
Neither sender-domain verification nor the existence of an API key proves a
recipient restriction. No provider-side recipient policy was verified.

Thus controlled test-mail restrictions are NOT ESTABLISHED. Before a deployment
can expose registration/resend, separately authorize and test fail-closed staging
recipient enforcement in code or prove an equivalent provider/relay restriction
covering every mail path, including signup, unverified sign-in and resend. Missing
or malformed recipient configuration must not silently permit arbitrary mail.
This task audits that gap; it does not alter product/auth/mail behavior. Required
email verification still prevents unverified sign-in; missing mail config can
leave an unverified user after a generic success response. Rate limits are
per-process memory, not a distributed recipient-control substitute. No reCAPTCHA
variables are needed by this branch.

## Approval and subsequent push/deploy sequence

1. Approve only the next read-only target/credential inspection and remote SQL
   preflight first. No such SQL has run here. Resolve actual drift, endpoints,
   scopes, role privileges, all aliases and the agreed lock contract.
2. Separately approve capacity/recovery work and demonstrate a usable restore
   path and freshness/preservation. Until then migrations remain NO-GO.
3. Resolve recipient enforcement and origins; securely verify effective branch
   values/Production separation. Presence of seven variables alone is insufficient.
4. Decide how to handle main. Fresh fetch observed main
   `eba0e0a0fbff9e3ff0fbfd7792cf41322ce7f487`: integration is **6 commits behind,
   12 unique ahead**. Remote authoring branch still equals 4e18931. Lag is not
   permission to merge/rebase. Either explicitly record deferral of those main
   changes or authorize integration in an isolated worktree, preserving this
   checkout; resolve conflicts and repeat all affected tests/browser/build and
   SQL/package/Blob reviews. No automatic merge/rebase/force push.
5. Prepare a reviewed local final commit on the integration history, explicitly
   staging approved source/test/docs/package paths; never `git add .` over work
   artifacts or secrets. Reconfirm remote refs and the final diff/package hashes.
   Bind the migration approval to that full commit and package digest. This task
   creates no commit and changes no existing patch artifact.
6. Separately approve the verified suffix execution with writes/serving exposure
   quiesced and recovery ready. Apply and independently validate before allowing
   code that needs 0004–0006 to serve. A push must not be used to bootstrap schema
   or test whether staging isolation is real; automatic Preview deployment may
   follow a push. If a deployment hold is needed, configuring it requires separate
   approval and is not done here.
7. Once explicitly authorized, use an ordinary fast-forward push of the approved
   commit to `codex/physcratic-authoring-completion`, e.g.
   `git push origin HEAD:refs/heads/codex/physcratic-authoring-completion` from the
   reviewed commit. Remote advancement is a stop; never add force flags. The
   branch-only env scopes apply to this exact destination, not a new branch name.
8. Require fresh GitHub CI for the exact final SHA (frozen install, typegen/types,
   zero-warning lint, full PG-backed tests/build) and the PG18.6/package/browser
   evidence. Do not reuse 4e18931's READY deployment or the old CI as proof of the
   new patch. Verify Vercel team/project, deployment ID/SHA and Preview identity.
   A failed build/CI stays unexposed and is investigated without shared writes.
9. Validate effective new deployment bindings/origins and guarded OIDC read-only
   selection, then obtain separate permission for isolated test users/mail/Blob
   writes and live workflows. No upload to the Production/shared Blob store is
   needed. Production merge/rollout remains a separate approval.

Current next action is review/authorization of the read-only and recovery steps,
not SQL execution or a push. The original local validation document and patches
remain intact for the next instruction.

## Local verification of this package

The release/CLI suite passes on disposable PG18.6: exact prefixes 3/4/5/6,
historical drift, partial/unledgered suffix, guard/constraint drift, gated
approvals, suffix-only execution from 3/4/5, rollback, preserved unrelated records,
separate post-commit read-only CLI checks and refusal of RLS-limited counts.
Standalone `preflight-readonly.sql` also passes an actual psql run in that local
container. The 40 existing Blob SDK/mock checks pass again. One additional
mock-mail audit confirms missing allowlist enforcement; its passing assertion
records a release gap, not a claim that the gap is safe. No mail is sent.

TypeScript and zero-warning lint pass. The earlier application test/browser/build
artifacts are preserved rather than relabeled as new remote validation. All 16
previously reviewed files, the three patch artifacts, validation document and
all six UP files retain their prior checksums. New files are confined to this
audit document and `scripts/authoring-release/`; evidence/logs stay in
`work/neon-release-audit/`. That directory's final audit manifest records package
checksums, provider-metadata scope and local test results without credentials.
