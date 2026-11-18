# Public worked solutions: owner review package

Preparation only. No application, build, deployment or import runs these files.
Installation, Production SQL/grants and exposure are NOT authorized by the source
implementation mission. Never run the historical B6 operator to install0020.
This is a single additive migration, not another migration runner.

## Exact materials and source

`SOURCE_COMMIT` pins the implementation source. Independently approve that commit,
this package's SHA-256 manifest and the up/down hashes before execution. The package
may be committed later than its pinned source without changing executable source.
Use the package from its independently approved package/PR commit, not a checkout
of SOURCE_COMMIT alone. For each non-package manifest entry, compare its bytes
with the same path at SOURCE_COMMIT. Package entries are bound by this manifest.
Verify that approved checkout and every manifest entry. A merge SHA alone does not
prove installed schema or effective serving flags. Do not substitute newer main.

Schema diff: two columns on `authored_revision`, `solution_policy text NOT NULL
DEFAULT 'legacy-private-v1'` and nullable `solution_consented_at timestamptz`, plus
an equality/policy consistency CHECK. Existing rows retain legacy behavior. Public
consent must be sealed when a NEW revision is published, never updated into an old
revision. Existing revision immutability protects the fields. No attempt, answer,
reveal, draft, media object or consent identity record is rewritten or deleted.

Function diff: CREATE OR REPLACE of the two existing0009 achievement functions
excludes public-policy revisions, including before candidate scanning. Signatures,
owners and ACLs remain intact. No attempt trigger or0018 wrapper/backup is changed.
Required prerequisites are existing0001–0007 and0009, plus the actual installed
release/ledger state.0020 does not install0019 or activate any future feature.
The supplied preflight additionally expects0018's installed metadata, because its
preservation is an explicit release gate. Stop if the actual baseline differs.

Privilege diff: NONE proposed. Tested table-level SELECT/INSERT granted BEFORE
ALTER covers new revision fields. Existing publication/media locks still need the
already-reviewed UPDATE column rights. No UPDATE/DELETE/TRUNCATE on attempts,
schema CREATE, role/owner membership or new privileged function is needed. Local
real LOGIN qualification is evidence of this source contract, not proof of actual
Production ACLs. The owner must confirm serving-role/binding and inspect effective
rights, inherited membership and PUBLIC access before installation.

## Separate approvals and stop conditions

The owner must separately approve exact target/project/branch/endpoint/database,
operator and source/package hashes, migration window and backup/recovery evidence.
Current expected binding to reconfirm: project `divine-mode-82940461`, branch
`br-quiet-dawn-b7m2zrt3`, endpoint `ep-snowy-heart-b7c1220y`, database `neondb`.
Do not reuse an expired snapshot or assume a six-hour history setting establishes
all retained-copy lifetimes. Record a currently usable restore point, retention and
expiry, access restrictions, actual restore qualification and restoration owner.
Preserve deployed code AND restricted binding recovery references.

Stop on source/hash mismatch, wrong target/role, unavailable backup/restore proof,
noncanonical prerequisite ledger, existing0020 row/schema mismatch, unknown function
owner/ACL, missing runtime rights, concurrent migration, timeout, connection loss or
unexpected data. Never grant extra rights, repeat cutover, disable triggers, edit
historical migrations, delete evidence, enable deletion/practice or run Production
acceptance writes to make a check pass. Feature exposure stays OFF throughout install.

## Owner-operated installation and ledger

Use a clean LF checkout and the existing approved psql connection with verify-full
TLS and private password prompt. Never put a connection string/password in arguments,
logs or this package. Reconfirm the endpoint in Neon separately: database name alone
cannot identify a branch. No commands below were run against Production here.

1. Independently verify `SOURCE_COMMIT`, pinned manifest and each file checksum.
   Retain metadata-only before evidence from `preflight.readonly.sql` with the
   actual `runtime_role` variable. Confirm0001–0007/0009 and installed0018 against
   canonical source checksums and original provenance. Do not replay them.
2. Validate absent0020 ledger entry and absent policy columns. An existing identical
   verified0020 is a verification-only case, never a reason to replay SQL. Mixed
   schema/ledger state is a STOP requiring investigation.
3. On the separately approved operator connection, use ONE transaction, ON_ERROR_STOP,
   lock_timeout2s and statement_timeout30s. Acquire the same migration exclusion lock
   as the existing release packages. `pg_try_advisory_xact_lock(hashtextextended(
   'physcratic:authoring:migrations:v1',0))` MUST be true, otherwise abort.
4. In that transaction, recheck target identity and absence of0020. Apply ONLY the
   reviewed `migrations/0020_authored_public_solutions.up.sql`. Check the new columns,
   CHECK, default, function definitions, unchanged owner/ACL and unchanged attempt
   guard/0018 backup receipts. Compare aggregate legacy counts to before evidence.
5. Only after those checks, insert one ledger receipt into
   `public.physcratic_production_migrations(id,sha256,source_commit,applied_by,result)`:
   id=`0020_authored_public_solutions`, sha256=exact UP digest from this manifest,
   source_commit=exact `SOURCE_COMMIT`, applied_by=`current_user`, result=`verified`.
   The existing ledger supplies applied_at. Do not overwrite a previous row.
   Commit schema/function changes AND receipt together. No ledger receipt before
   verification and no separately committed migration followed by a later receipt.
6. Reconnect, run postflight plus preflight, and retain redacted metadata evidence.
   Expect zero public revisions before exposure, every old revision legacy, zero
   inconsistent consent and unchanged function ownership/ACL/guard receipts. A lost
   commit acknowledgement is resolved by fresh schema+ledger+hash verification.
   Never blindly rerun the migration after an ambiguous response.

This procedure intentionally does not grant a caller-controlled erasure override
or install an application-facing operator endpoint. Installation needs an already
approved schema/function owner, not a broader ordinary runtime role.

## Activation, rollback and failure recovery

Source default `AUTHORED_PUBLIC_SOLUTIONS_ENABLED` is OFF. Keep it OFF until the owner
separately approves exposure after schema, serving version, runtime ACL and browser
acceptance evidence. Saved variables do not update already-running Functions.
Confirm actual alias/source/configuration. Old serving instances may only create
legacy revisions; do not expose public publication until all serving serializers,
client receipt contracts, statistics and DB eligibility are compatible.

Authorize synthetic acceptance separately: legacy private remains private; explicit
republication creates a new public-policy revision; guests/unverified/verified users
see only solutions and explicitly attached files; no keys/hints; stale/history/draft
files denied; unpublish denies fresh reads; successful answers remain personally
solved while verified solves are unknown and solver achievements excluded. Check
old cached clients, keyboard, mobile/themes, retry and existing legacy reveals.
Any privacy, consent, isolation or misclassified-independence defect stops exposure.
Monitor503/permission/lock failures, latency and anonymous request/storage load.
Existing bounded reads are not a claim of a distributed anonymous rate limiter.

On pre-commit failure, roll back the transaction, retain failure evidence and verify
schema/ledger state before considering a separately reviewed retry. On uncertain
commit, reconnect and inspect first. Never infer failure merely from a client timeout.

After installation but before public consent exists, prefer leaving the harmless
additive schema installed when rolling back app exposure. The down SQL is qualified
for empty public state, takes ACCESS EXCLUSIVE before inspecting consent and refuses
any public-policy revision, even if archived. If an owner separately chooses that
rollback, use one reviewed transaction and the same migration lock. Retain original
installation evidence and an explicit rollback receipt. Do not delete or falsify the
original ledger row or use the old B6 verifier as authority for the extended schema.

Once public consent exists, populated down is forbidden. Disable public exposure
through an owner-approved serving release, keep policy/evidence and conservative
eligibility active, and use a forward correction. Never roll back to code that
labels public-policy attempts unassisted. No database reset, historical conversion,
physical media cleanup or deletion is part of rollback. Delivered copies cannot be
recalled. Any restore must reconcile later consent/revocation/publication and any
account-erasure records before the restored branch can serve users.

Installation status remains NO-GO until the owner closes the live evidence and
approval gates. Source CI, disposable PG and synthetic browser results alone do
not authorize installation or prove a restore is usable.
