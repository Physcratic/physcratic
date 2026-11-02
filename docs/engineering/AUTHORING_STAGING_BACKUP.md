# Staging logical backup and recovery — prepared, not remotely executed

This procedure is for **only** Neon project `divine-mode-82940461`, branch
`br-solitary-thunder-b7h5q79t`, direct endpoint `ep-green-waterfall-b7qaw260`,
database `neondb`, PostgreSQL **18.6**. It requires separate operator authorization
for remote reads/backup and, later, for any remote recovery writes. No command in
this document was run against Neon. Never substitute Production credentials or
an inherited `DATABASE_URL_UNPOOLED`/`POSTGRES_*`/`PG*` value.

The existing snapshot `snap-bitter-cloud-b75hikb1` is retained. Its existence is
not a usable recovery guarantee under the exhausted branch limit. A tested
logical backup provides a second method, but only when its storage, keys,
restore destination, privileges and cutover are established. Until then the
migration approval's recovery flags must remain false.

## Establish identity, space, privileges and backup custody

1. Securely compare the effective **branch-specific Preview** environment with
   Production using `operator.mjs audit-env-stdin`, as described in the blocker
   follow-up. Confirm the Preview endpoint, database and distinct Production
   endpoint. Separately bind the direct endpoint to the specified Neon branch in
   provider metadata. SQL server IP/database/version alone cannot prove a branch.
2. After remote read permission, collect `preflight-readonly.sql`,
   `baseline-supplement-readonly.sql` and `backup-metadata-readonly.sql` using the
   verified direct service below. Review complete object coverage, RLS/SELECT
   visibility, extensions/versions, encoding/locale, owners/ACLs/default ACLs,
   role memberships and large objects. Unexpected foreign servers/subscriptions
   require separate review. No password hashes/globals dump is needed.
3. Use a dedicated, operator-controlled encrypted volume **outside every Git
   checkout**, with a fresh mode-0700 directory, files mode 0600, no shared sync
   folder or CI artifact upload. Reserve space for the full archive, integrity
   output and an uncompressed restore with indexes (budget at least four times
   measured DB size, then verify actual free disk/inodes). Do not delete shared
   files or branches. Use PG18.6 clients; `pg_dump --version`, `psql --version`
   and `pg_restore --version` must all report 18.6.
4. Select and independently verify the full fingerprint of an existing approved
   backup encryption public key. Keep its private recovery key separately, with
   a named custodian and retention/access policy. Confirm the custodian can
   decrypt a test message. Do not create a new real backup key just for this
   release, export a private key to the repository, or treat encryption without
   a recoverable key as a backup.

Create an explicit service without exposing a URI/password in arguments, logs
or shell history. The following is a future operator procedure, not permission:

```bash
set +x
set -euo pipefail
umask 077
# Replace this directory with the approved encrypted volume, outside Git.
backup_dir=$(mktemp -d /approved/encrypted-volume/physcratic-pre0004.XXXXXXXX)
IFS= read -rs -p 'Verified STAGING direct URL: ' STAGING_BACKUP_DIRECT_URL
export STAGING_BACKUP_DIRECT_URL
python3 - "$backup_dir" <<'PY'
import os, re, sys
from pathlib import Path
from urllib.parse import urlsplit, parse_qs, unquote
try:
    u = urlsplit(os.environ['STAGING_BACKUP_DIRECT_URL'])
    assert u.scheme in ('postgres','postgresql') and u.username and u.password
    assert re.fullmatch(r'ep-green-waterfall-b7qaw260\.[a-z0-9.-]+\.neon\.tech', u.hostname or '')
    assert u.path == '/neondb' and parse_qs(u.query).get('sslmode') in (['require'],['verify-full'])
    user, password = unquote(u.username), unquote(u.password)
    assert not any(c in user + password for c in '\x00\r\n')
    def conf(v): return "'" + v.replace('\\','\\\\').replace("'","\\'") + "'"
    def pgpass(v): return v.replace('\\','\\\\').replace(':','\\:')
    directory = Path(sys.argv[1]).resolve()
    assert directory.is_dir() and directory.stat().st_mode & 0o077 == 0
    assert not any((p/'.git').exists() for p in [directory,*directory.parents])
    service = '[physcratic_staging_backup]\nhost='+u.hostname+'\nport='+str(u.port or 5432)+'\ndbname=neondb\nuser='+conf(user)+'\nsslmode=verify-full\nsslrootcert=system\nchannel_binding=require\nconnect_timeout=10\n'
    passfile = ':'.join(map(pgpass,[u.hostname,str(u.port or 5432),'neondb',user,password]))+'\n'
    for name, text in [('service.conf',service),('passfile',passfile)]:
        fd=os.open(directory/name,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
        with os.fdopen(fd,'w') as f: f.write(text)
except Exception:
    raise SystemExit('STAGING_BACKUP_SERVICE_REFUSED') from None
PY
unset STAGING_BACKUP_DIRECT_URL
# env -i prevents all inherited libpq aliases/options/service defaults.
staging_psql() {
  env -i PATH="$PATH" PGSERVICEFILE="$backup_dir/service.conf" \
    PGPASSFILE="$backup_dir/passfile" PGSERVICE=physcratic_staging_backup \
    psql -X -qAt -v ON_ERROR_STOP=1 "$@"
}
```

If TLS/channel binding, role visibility or a required extension fails, stop;
never disable verification, use Production's password, or omit objects. File
paths and key fingerprints are not connection strings; keep diagnostics private
because catalog definitions can contain sensitive literals. Do not echo secrets.

## Capture a full consistent backup, including legacy tables

Quiesce **all** staging writers and DDL, scheduled cleanup, auth traffic and
administrative clients before capture, and retain that quiescence through
migration/post-commit validation. Sequences and large objects make writer
quiescence necessary even with an exported MVCC snapshot. Record who verified it;
absence of visible sessions is not proof that no new request can arrive.

Use two trusted terminals on the same host and private directory. Configure
`backup_keyring` and `backup_recipient` with the approved public key location and
full fingerprint. `backup_keyring` is outside the repository; no real private key
is placed in the restore container. Check `gpg` exit status on every pipeline.

**Terminal A, snapshot holder:**

```bash
staging_psql
```

Enter these SQL/meta-commands interactively, leaving the session open afterward:

```sql
BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY DEFERRABLE;
SELECT current_database(),current_user,current_setting('server_version'),current_setting('transaction_read_only');
SELECT pg_export_snapshot();
```

Expect `neondb`, the approved backup role, `18.6`, `on`. Record the exported
snapshot ID privately; it is a transaction identifier, not a credential. Do not
COMMIT/ROLLBACK Terminal A until Terminal B has finished. Avoid a provider/session
timeout invalidating the holder; loss of this session invalidates the capture.

**Terminal B, same snapshot and explicit service:**

```bash
IFS= read -r -p 'Exported snapshot ID: ' backup_snapshot
[[ "$backup_snapshot" =~ ^[0-9A-Fa-f]+-[0-9A-Fa-f]+-[0-9]+$ ]]
source_integrity() {
  printf '%s\n' 'BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY;' \
    "SET TRANSACTION SNAPSHOT '$backup_snapshot';" \
    '\i scripts/authoring-release/backup-integrity-readonly.sql' 'ROLLBACK;' |
    staging_psql
}
source_integrity | gpg --homedir "$backup_keyring" --batch --recipient "$backup_recipient" \
  --encrypt --output "$backup_dir/source.integrity.gpg.partial"
env -i PATH="$PATH" PGSERVICEFILE="$backup_dir/service.conf" \
  PGPASSFILE="$backup_dir/passfile" PGSERVICE=physcratic_staging_backup \
  pg_dump --format=custom --snapshot="$backup_snapshot" \
  2> "$backup_dir/pg_dump.stderr.private" |
  gpg --homedir "$backup_keyring" --batch --recipient "$backup_recipient" \
    --encrypt --output "$backup_dir/neondb.dump.gpg.partial"
source_integrity | gpg --homedir "$backup_keyring" --batch --recipient "$backup_recipient" \
  --encrypt --output "$backup_dir/source-after.integrity.gpg.partial"
# Rename only after all three commands/pipelines succeed; keep .partial on failure.
mv "$backup_dir/neondb.dump.gpg.partial" "$backup_dir/neondb.dump.gpg"
mv "$backup_dir/source.integrity.gpg.partial" "$backup_dir/source.integrity.gpg"
mv "$backup_dir/source-after.integrity.gpg.partial" "$backup_dir/source-after.integrity.gpg"
```

The imported transaction deliberately omits `DEFERRABLE`; PostgreSQL refuses
snapshot import into a DEFERRABLE transaction. `pg_dump --snapshot` imports the
same exporter snapshot; do not combine it with `--serializable-deferrable`.
No `--schema`, `--table`, data exclusion, `--clean` or `--create` is used. All
database schemas/data, legacy `solution_attempt`, auth secrets stored as DB data,
sequences and large objects are included. Cluster globals/role passwords,
Vercel environment secrets and Blob object bytes are **not** included.

Terminal A may now `ROLLBACK;` and `\q`. Securely preserve the read-only catalog,
metadata and preflight reports alongside the encrypted backup. Record target
binding, capture time, PG versions, exporter ID, ledger prefix/checksums, package
digest and writer-quiescence evidence in an encrypted backup manifest. Compute
SHA256 of ciphertext files, sign/store the manifest in approved off-host custody,
and verify a second encrypted copy. Ciphertext hashes alone do not prove a
restorable archive. Do not commit any of these files, service files or credentials.

## Rehearse the actual backup on a disposable local PostgreSQL 18.6

After separate approval to handle this staging backup locally:

1. Verify ciphertext checksums and approved key fingerprint. Decrypt only on the
   trusted encrypted-volume host. The operator supplies private-key access via
   normal GPG agent/pinentry, never a passphrase argument or repository file.
2. Create a fresh `postgres:18.6-alpine` container with `--network none`, no host
   mounts, no published port and no staging/Production environment secrets.
   Reserve its local storage first. Initialize an empty `restore_check` database.
   Review/install the same trusted extension versions and non-login owner/policy
   role placeholders if required. Do not silently omit an unavailable extension.
3. Stream and validate the archive TOC, then restore atomically:

```bash
gpg --homedir "$recovery_keyring" --decrypt "$backup_dir/neondb.dump.gpg" |
  docker exec -i "$restore_container" pg_restore --list > "$backup_dir/toc.private"
gpg --homedir "$recovery_keyring" --decrypt "$backup_dir/neondb.dump.gpg" |
  docker exec -i "$restore_container" pg_restore -U postgres -d restore_check \
    --single-transaction --exit-on-error --no-owner --no-privileges
docker cp scripts/authoring-release "$restore_container:/audit"
printf '%s\n' 'BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY;' \
  '\i /audit/backup-integrity-readonly.sql' 'ROLLBACK;' |
  docker exec -i "$restore_container" psql -X -qAt -U postgres -d restore_check \
    -v ON_ERROR_STOP=1 > "$backup_dir/restored.integrity.private"
gpg --homedir "$recovery_keyring" --decrypt "$backup_dir/source.integrity.gpg" \
  > "$backup_dir/source.integrity.private"
gpg --homedir "$recovery_keyring" --decrypt "$backup_dir/source-after.integrity.gpg" \
  > "$backup_dir/source-after.integrity.private"
cmp "$backup_dir/source.integrity.private" "$backup_dir/source-after.integrity.private"
cmp "$backup_dir/source.integrity.private" "$backup_dir/restored.integrity.private"
```

The logical inventory compares all non-system ordinary/materialized tables,
including tables outside public, with duplicate-sensitive sorted row SHA256s and
counts; sequence values/called state; large-object pages/OIDs; columns/defaults,
constraints, index definitions/readiness, triggers/enabled states, function
definition digests and extension versions. It refuses unreadable/RLS-filtered
tables and foreign tables. Physical OID/xmin/ctid equality is **not** expected after
restore. Rows are hashed on the server; no plaintext row data is printed.

Also run the canonical v3 preflight on the restored database (the normal remote
CLI refuses a non-target name; use psql and compare its report, do not weaken the
endpoint guard). Confirm all original ledger fields, three exact historical
checksums/source, auth prerequisites, legacy records and private records. Review
schema-only archive/restore definitions for types/domains/views/policies and any
extension objects beyond the logical inventory. Restore does not validate every
constraint's old data: explicitly review NOT VALID constraints and invalid
indexes. Do not mark the rehearsal successful with unresolved differences.

`--no-owner --no-privileges` is **local content rehearsal only**. It does not prove
that Neon ownership, ACLs, default privileges, SECURITY DEFINER owners, RLS roles
or application-role access can be restored. Capture and review those separately;
the real recovery must restore the approved owners/ACLs using sufficient staging
privileges. Do not copy local postgres/trust authentication or permissive grants
to Neon. Keep dumps encrypted; dispose only this rehearsal's container/private
plaintext according to the approved retention policy, never shared resources.

## Recovery with no spare branch slot — still an unproven operator gate

A candidate logical method is a **new database on the same isolated staging
branch**, followed by a quiesced rename cutover. It consumes database/storage
capacity and requires Neon support/quotas, CREATE DATABASE, ownership/role grants,
ability to connect to a management DB and rename both DBs, and zero active
connections. Local postgres success does not establish any of those permissions.
Provider confirmation and an approved staging rehearsal are required. If those
cannot be established, reserve branch capacity for a supported snapshot restore;
otherwise migration execution stays **NO-GO**.

Future recovery procedure, separately approved, never an automatic error handler:

1. Keep the application and all cleanup/writers stopped. Verify the exact staging
   endpoint/branch, original database and incident ledger. Determine COMMIT state
   read-only; never rerun migrations after an uncertain COMMIT.
2. Create a fresh approved recovery database on that branch. Restore the full
   verified archive into it without `--clean`, drops, or changes to `neondb`.
   Restore owners/ACLs with an audited role mapping; refuse unsupported objects.
3. Validate the same logical manifest, expected schema/ledger and application
   role access. Reconcile any post-backup writes and Blob registry/object state.
   Do not discard later records or delete Blob objects.
4. Only after a cutover approval and zero connections to both databases, connect
   to the approved management DB and run **separately**:

```sql
-- WRITE PROCEDURE, NOT PREFLIGHT. Names must be approved and confirmed unused.
ALTER DATABASE neondb RENAME TO neondb_retained_incident;
ALTER DATABASE neondb_recovery_approved RENAME TO neondb;
```

These are distinct steps: if the second rename fails, keep traffic stopped and
inspect names before any action. Do not retry a migration or drop the retained
original. Revalidate endpoint/database mapping, ledger, full counts/fingerprints,
ACLs and approved smoke tests before reopening traffic. Restoring the connection
name does not prove old pooled connections are gone; terminate/drain only the
explicitly approved staging sessions. Never terminate sessions on another DB.

The synthetic local rehearsal script exercises full encrypted dump/restore,
integrity/mutation/corruption checks and a retained-original rename cutover:
`bash scripts/authoring-release/backup-rehearsal-local.sh`. It creates only its
own network-isolated container, temporary key and synthetic archive outside Git,
and removes only those task-owned resources afterward. It is evidence for the
mechanics, **not evidence of a captured real backup or a usable Neon restore**.
