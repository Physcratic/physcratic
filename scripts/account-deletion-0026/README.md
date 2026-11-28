# Account deletion operational qualification and migration 0026

**Account deletion is blocked on operational qualification and owner approval. Keep `ACCOUNT_DELETION_ENABLED` unset.** The default gate is full provider closeout. The proposed [staged alternative](#staged-erasure-owner-checklist) requires a separate approval and still requires terminal evidence to release a hold or confirm cleanup. The reviewer reported serving commit `ee23638`, no 0026 installation, six ready author media records, three registered legacy solution evidence records, zero profile media and internal medal claims, and both `ACCOUNT_DELETION_ENABLED` and `VERCEL_BLOB_RETRIES` unset. These are reviewer observations. Refresh them on the approved target under the writer hold. A reported count of six ready records leaves the count of other author media, existing outbox jobs and prior receipts to be checked. If the reported inventory is complete and all paths are distinct, the backfill holds nine paths.

Installing schema 0026 with uploads safely configured and deletion off is a separate owner decision from releasing account deletion. This package is for an explicitly approved window. The checkout, package manifest, plan, endpoint binding, writer hold and recovery evidence each require review before use.

## Vercel Blob evidence

| Operation | Established behavior | Release implication |
| --- | --- | --- |
| One SDK attempt | Physcratic pins `@vercel/blob` **2.8.2**. Its `dist/chunk-XKVPKJPO.js` reads `VERCEL_BLOB_RETRIES` through `getRetries()`. Unset or empty selects **10 retries**, in addition to the initial attempt, for eligible network or provider failures. The string `0` prevents SDK retries. The non-multipart path issues a PUT and parses a successful JSON response. All four application upload paths use private storage, fixed paths, no overwrite and no multipart option. The SDK sends one request ID for the SDK call and includes an attempt number on retries. | An application invocation can make several upstream requests with the old setting. Single attempt bounds requests issued by this SDK invocation. It does not attest the behavior of upstream proxies, the provider, a different writer or older attempts. [Vercel SDK `put()` reference](https://vercel.com/docs/vercel-blob/using-blob-sdk#put) |
| Successful or interrupted PUT | Vercel documents the result as metadata for the created blob. A normal resolved single PUT is the acknowledgement the app records. The docs describe an `AbortSignal` option. The pinned client forwards it to the transport. The application gives PUT a 10-second local timeout. A timeout, connection drop, process interruption, missing app acknowledgement or provider error leaves the server outcome unknown. | The public contract does not describe a terminal-status lookup or a maximum late-commit lifetime for aborted requests. It does not establish that a successful response closes every earlier attempt on an old path. Request a written guarantee for terminal single-attempt success and a documented way to settle uncertain writes. [Vercel SDK reference](https://vercel.com/docs/vercel-blob/using-blob-sdk#put) |
| `del()` and retry | Vercel documents that `del()` returns `void` and that a delete action “won't throw if the blob url doesn't exist.” The method accepts URLs and pathnames. The pinned client sends `POST /delete`. The local stub deliberately injects an API `not_found` error to exercise generic error propagation. | Repeat deletion of an absent blob has a documented no-throw contract. Rehearse repeat deletion by registered pathname and lost acknowledgement on the approved private-store binding. This rehearsal is still outstanding. The documented CDN cache window is up to 60 seconds. It provides no bound on late writes or physical backup retention. [Vercel deletion reference](https://vercel.com/docs/vercel-blob/using-blob-sdk#del) [Vercel caching](https://vercel.com/docs/vercel-blob#caching) |
| Observing a path | The pinned SDK implements private `get(path, { access: 'private', useCache: false })` by requesting `cache=0`. Vercel documents this as a read from origin of the latest content. `head`, listing, ETag, overwrite protection, TTL and origin reads report or constrain current state. | Existing or absent data, old timestamps, conditional writes and conventional cache expiry provide no proof that a different accepted PUT cannot still commit. `ifMatch` does not fence future requests. Confirm retained-copy and deletion guarantees separately. [Vercel private storage](https://vercel.com/docs/vercel-blob/private-storage#consistent-reads) [Vercel overwrite and cache guidance](https://vercel.com/docs/vercel-blob#overwriting-blobs) |

### What can run on existing infrastructure

The reviewed code, current private bindings, existing outbox/operator endpoint and existing database can perform single-attempt uploads and leased retry. Blob is available on all plans. Vercel documents included Hobby usage and distinguishes it from paid usage. The owner can rehearse with synthetic paths on an **existing approved isolated nonproduction store** if suitable access and quota already exist. No new store, tier, seat, monitor or scheduler is needed by the application. The reviewer has not established the existence or available quota of that rehearsal binding. Vercel's Hobby comparison lists no email support. The Support Center can be checked for the current team's case entitlement without a purchase. A public community answer does not prove the provider's terminal state for the nine paths. [Vercel usage and pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing) [Vercel Hobby plan](https://vercel.com/docs/plans/hobby) [Vercel Support Center](https://vercel.com/docs/support-center)

**Provider confirmation required.** Ask Vercel for the following through an existing entitled, private support channel. The owner can send the request below. No request has been sent.

1. Confirm what a successful single non-multipart private PUT response establishes on the serving Blob API version. Can a previously accepted request or an upstream replay for the same path still commit after that return?
2. Identify a terminal-status or cancellation mechanism for an interrupted request. Say whether an operator can provide store ID, exact pathname, UTC time range and any available `x-api-blob-request-id` or attempt number so support can confirm every accepted attempt is terminal. For old cases where no request IDs were retained, can support certify by store, path and window, or provide a documented maximum commit lifetime measured from a verifiable ingress fence that covers retries and proxies?
3. Confirm what data, replicas, snapshots, backups or recovery copies can remain after DELETE, their actual expiry and access restrictions, and whether an active or restored copy can reintroduce a deleted object. Request facts the privacy notice and restore runbook can rely on. A product statement that a deleted blob is not user-restorable is narrower than a physical retention commitment.

Repeat DELETE belongs in the private-store rehearsal. For a synthetic path with a confirmed terminal write, simulate a lost first acknowledgement, call `del()` by pathname again and verify origin absence. If the binding returns an unexpected error, keep the job pending and investigate the discrepancy against the documented contract.

Without provider confirmation, full closeout stays blocked. A separate staged approval can permit database erasure with open per-path obligations once the checklist below passes. A successful rehearsal demonstrates the exercised cases. A universal PUT deadline and physical backup expiry require separate evidence. Keep unknowns open and use existing entitlement only.

## Owner cutover with deletion off

1. Approve the reviewed repository checkout and manifest, the exact Neon project, branch and direct endpoint, the actual production LOGIN and migration owner, and the serving commit and flag evidence. Verify the direct hostname against the provider console and the serving database binding independently. The installer checks TLS, database, LOGIN, effective migration owner and version. SQL cannot attest which Neon branch a hostname is routed to.

   The installer forces libpq to verify the approved hostname and CA with `sslmode=verify-full` and `gssencmode=disable`. Each psql invocation emits `\conninfo` and runs the pinned SQL on that same connection. Keep the client TLS output and the separate `backend_ssl` and `backend_tls_protocol` observation. An approved Neon proxy can terminate client TLS while the compute reports `backend_ssl=f` and a null protocol. Preserve both observations and the independently reviewed provider binding. [Neon secure connections](https://neon.com/docs/connect/connect-securely)
2. Approve recovery instructions, name the executor and independent witness, and name who can reopen writes. Record the actual recoverable point and permissions in the private plan. Test restore with access closed, including the outbox, paths, ledger, and prior erasure obligations. Use the common migration advisory-lock key. Keep the existing approved writer and DDL hold mechanism active. A recovery point is for incident management under the approved restore process.
3. Under separately approved owner change control, stage and manually serve the reviewed code with **`VERCEL_BLOB_RETRIES=0`** and **`ACCOUNT_DELETION_ENABLED` unset** before upgraded-schema uploads are admitted. On 0026 the code rejects new reservations before provider I/O unless that setting and the narrow acknowledgement grant are present. The SDK setting also limits retries on other SDK calls that use its shared API request path. Existing outbox backoff still governs deletion retries.
4. Fence all upload **and cleanup** writers before gathering the held baseline. Cover the main and alternate deployment hosts, existing aliases, direct endpoints, older eligible previews and any standalone store writers or tokens with write authority. Include author media, legacy solution evidence, profile media, internal medal proof and the erasure operator. Keep disabled namespaces disabled. Verify on the existing infrastructure that old code cannot accept another write, and record the fence start and verified scopes. Draining app traffic and credentials does not prove earlier provider work has stopped.
5. Run `Inspect` while the writer hold is active. Review the full predecessor ledger against its approved hashes and verify the 0018 routine owners. Compare the counts with the reviewer observations, including other author media, existing outbox and receipts. Investigate every discrepancy. Capture the two reported digests into the private plan. Approve the completed plan checksum and window. Keep the hold through `Install` and independent `Verify`.
6. Install via the following commands while deletion remains off. Keep 0026 and any pending data through an application rollback. If install fails or the connection drops around commit, hold writers and run a fresh `Inspect` followed by `Verify` when the 0026 row exists. Never retry on an uncertain commit outcome. Resume only with an approved build using the new grant and setting, verified provider bindings, and successful off-state upload and ordinary cleanup checks on synthetic data in approved nonproduction. Confirm old public thumbnail caches have expired or been invalidated before deletion activation.

### Windows PowerShell and psql commands

Use a trusted PowerShell and psql 15 or newer with Git on PATH. The Windows-safe installer uses a UTF-8 LF SQL file for psql. Set `PGPASSFILE` to the existing protected libpq password-file path or use an equivalent existing libpq credential source. The installer uses `--no-password` so an unexpected password prompt fails. Keep secrets outside arguments and Git. Clear ambient `PGSERVICE`, `PGSERVICEFILE`, `PGHOSTADDR`, `PGOPTIONS`, `PGPASSWORD` and `PGSSLNEGOTIATION`. Use the approved CA file and direct host, never the pooled endpoint for the migration.

```powershell
$PackageCommit = (Read-Host 'Owner-reviewed package git SHA').Trim()
$ManifestSha = (Read-Host 'Owner-reviewed manifest SHA-256').Trim()
git fetch origin
if ($LASTEXITCODE) { throw 'Fetch failed' }
git checkout --detach $PackageCommit
if ($LASTEXITCODE -or (git rev-parse HEAD) -cne $PackageCommit -or (git status --porcelain)) {
    throw 'Wrong or dirty checkout'
}
$manifest = '.\scripts\account-deletion-0026\PACKAGE_SHA256SUMS'
if ((Get-FileHash -LiteralPath $manifest -Algorithm SHA256).Hash.ToLowerInvariant() -cne $ManifestSha) {
    throw 'Wrong package manifest'
}
$env:PGSSLMODE = 'verify-full'
$env:PGSSLROOTCERT = Read-Host 'Approved CA bundle path'
$env:PGPASSFILE = Read-Host 'Existing protected libpq password file path'
$Plan = Read-Host 'Private plan JSON path outside the checkout'

# First copy approval-template.json there and fill the target/evidence fields.
$PlanSha = (Get-FileHash -LiteralPath $Plan -Algorithm SHA256).Hash.ToLowerInvariant()
$installer = '.\scripts\account-deletion-0026\install.ps1'
& $installer -Action Inspect -PackageCommit $PackageCommit -ManifestSha256 $ManifestSha -Plan $Plan -PlanSha256 $PlanSha

# After review, put the two held digests and approved evidence into the private plan.
# Record windowEndsUtc as UTC with seconds, for example yyyy-MM-ddTHH:mm:ssZ.
# Use the plan SHA approved independently by the owner, not a freshly accepted local value.
$ApprovedPlanSha = (Read-Host 'SHA-256 of the plan explicitly approved for install').Trim()
& $installer -Action Install -PackageCommit $PackageCommit -ManifestSha256 $ManifestSha -Plan $Plan -PlanSha256 $ApprovedPlanSha

# Use a separate connection from the held deployment and preserve redacted evidence.
& $installer -Action Verify -PackageCommit $PackageCommit -ManifestSha256 $ManifestSha -Plan $Plan -PlanSha256 $ApprovedPlanSha
```

`Inspect` and `Verify` use read-only transactions. `Verify` compares the original writer-held inventory and expects all backfilled markers to be intact. Run it before reopening writers or resolving markers. Inspect can still read the ledger and current inventory later. The manifest pins the canonical 0026 bytes to `3b904c1eb01fc75e5446744acc90474cdbe4aba62c6dffc95b9f7c35bfc6c78a`. The file contains its own `BEGIN;` and `COMMIT;`. After checking the original bytes the wrapper extracts only that transaction's body. Its outer transaction holds the advisory and table locks, matches the approved digests, applies that body, grants only the acknowledgement routine, verifies the backfill and privileges, then records the original up-file hash and source `ee236380364a0a0f96145ac1ac753cb5cca11c4f`. Any failed assertion aborts the transaction including the grant and ledger. Do not use `psql -1` with the original wrapped up file and a separate ledger script.

The application-only runtime access added here is ordinary `EXECUTE` on `public.account_deletion_upload_finished(text,text,text)` for the one named serving LOGIN. The package checks direct ACL, effective privileges, grant option, PUBLIC, unsafe memberships, trusted schema and owner, protected deletion tables and old eraser/cleanup metadata. Run the existing baseline role verifier plus this delta. The historical baseline verifier predates 0026 and will report the reviewed acknowledgement grant as a direct security-definer grant. Every unexplained deviation remains a blocker. Verify the actual ordinary serving login on pooled and direct bindings independently. Verify separate eraser and staff service logins against the function scopes in the B6 readiness runbook before activation. [Runtime role attestations](../runtime-role/README.md) [B6 readiness](../../docs/engineering/ACCOUNT_DELETION_READINESS.md)

## Reconcile held paths

1. From a separately authorized restricted session on the independently verified target, run the inventory below while the hold is active. Capture paths only in the restricted evidence workspace. Do not copy raw pathnames, account IDs, connection details, credentials or certificate files into GitHub or public support. Map each path to the actual approved store and writer from serving and historical runtime evidence, including any old store binding. Treat distinct author and legacy evidence paths separately even when both use the author storage adapter.

   ```sql
   BEGIN READ ONLY;
   SET LOCAL statement_timeout = '5s';
   SELECT u.provider,u.pathname,u.recorded_at,(u.token_hash IS NULL) AS pre_upgrade,
          o.state AS outbox_state
   FROM public.account_deletion_pending_upload u
   LEFT JOIN public.account_deletion_outbox o USING(provider,pathname)
   ORDER BY u.provider,u.pathname;
   COMMIT;
   ```

2. For the six ready author records, match the historical acknowledgement and all prior attempts where evidence exists. Readiness indicates that the application finalized a row. For the three legacy evidence records, registration preceded PUT and there is no stored provider outcome field. Inspect existing private logs for timestamps, requests and gaps. Reconcile plausible unregistered orphans from older compensating cleanup separately with verified ownership and terminal evidence. Preserve any live registered object needed by another user, a valid publication, or an evidence hold.
3. Record a private per-path decision with store, exact path, captured marker timestamp, route/deployment and attempt scope, provider evidence reference, named operator, independent sign-off and any remaining retention obligation. Only accept one of the provider-backed routes above that covers **all** previously accepted attempts and proves they can no longer commit. Record `unresolved` for every other path. Repeat evidence-based reconciliation for future ambiguous writes from the existing case intake. Neither `head`, `list`, consistent `get`, object age, checkout changes, an empty queue response, nor repeating `del` authorizes releasing a marker.
4. With separate authorization for one exact **pre-upgrade** row, an authorized owner can apply a terminal disposition in a private psql session. Set the three psql variables from the sealed case through an approved private input method. Check the provider reference and approval outside SQL. Use the returned count to confirm one exact old marker. This action permits an already queued job to be claimed. It does not delete an object, bypass an evidence hold, fabricate an eligible outbox job for a live account, or complete a receipt.

   ```sql
   \set ON_ERROR_STOP on
   BEGIN;
   SET LOCAL lock_timeout = '2s';
   SET LOCAL statement_timeout = '5s';
   DELETE FROM public.account_deletion_pending_upload
   WHERE provider=:'reviewed_provider' AND pathname=:'reviewed_path'
     AND recorded_at=:'reviewed_recorded_at'::timestamptz AND token_hash IS NULL;
   -- COMMIT only if the provider-backed, independently approved row was the exact DELETE 1.
   -- Otherwise ROLLBACK and inspect.
   ```

   For a later interrupted write with a capability hash, require a separate owner-reviewed disposition matching the exact row and case. Do not log or expose the capability. When eligible, drain the ordinary leased cleanup endpoint under approved operator credentials after activation. An owner-approved rehearsal must show that a provider miss or retry cannot prematurely complete a different obligation.

## Remaining owner decisions before activation

Use the [single Phase 5B closing checklist](../../docs/engineering/ACCOUNT_DELETION_READINESS.md#minimum-owner-evidence-to-close-phase-5b). Keep the manual Tally check and custody result with the existing restricted release evidence. The migration cutover, exact service LOGIN attestation and activation still require their own owner decisions.

## Reproduce the local evidence

From the clean candidate checkout use Node 22 and the pinned pnpm version for the SDK probe. Use Bash, a local Docker daemon, PowerShell, psql, OpenSSL and Python for the installer rehearsal. Both commands use synthetic data. The SDK probe points only at a loopback stub. The installer rehearsal creates and removes its own PostgreSQL container and generates a temporary TLS certificate and plan outside the checkout.

```sh
pnpm install --frozen-lockfile
node scripts/account-deletion-0026/sdk-probe.mjs
bash scripts/account-deletion-0026/rehearse-local.sh
sha256sum -c scripts/account-deletion-0026/PACKAGE_SHA256SUMS
```

The SDK probe verifies request and attempt counts, an interrupted request whose outcome the synthetic provider controls, and propagation of a deliberately injected API error. The injection tests client error handling. Vercel separately documents success for deletion of an absent blob. The PostgreSQL 18.7 installer rehearsal checks direct TLS and proxy TLS with a plaintext compute, and refuses a wrong hostname, an untrusted CA and a plaintext endpoint. It verifies nine held paths and the actual runtime LOGIN, checks refusal on checksum, inventory, ACL and replay drift, and injects a ledger failure after the migration and grant to prove atomic rollback. These are synthetic tests. The installer binaries were exercised on Linux. The owner separately completed native Windows erasure and restore reconciliation. The actual Windows installer host, serving role bindings, applicable provider evidence and physical retention remain separate.

## Staged erasure owner checklist

Use the [Phase 5B closing checklist](../../docs/engineering/ACCOUNT_DELETION_READINESS.md#minimum-owner-evidence-to-close-phase-5b) for staffing, retention, manual Tally, custody and recovery. Keep 0025 and the 0026/0027 deletion track separately authorized. The default is full provider closeout. An explicitly approved staged release may confirm database erasure with registered cleanup pending. Preserve the exact marker and pending job until terminal evidence covers every relevant write.

For an uncovered in-use private binding or authentication mode, use the isolated probe below. Verify a terminal repeat deletion, a late or held object that stays inaccessible through the app, an unrelated control and surviving publication access where applicable. Reuse the accepted authoring staging token evidence within its recorded scope.

For ordinary cleanup, send one same-origin `POST /api/admin/account-deletion` per eligible job using the existing private admin client, a recent verified admin session and `{"password":"<current admin password>","action":"cleanup","payload":{}}`. Keep credentials and sessions out of history and traces. `processed: 1, completed: true` confirms that job's acknowledgement. `completed: false` means retry, and `processed: 0` means no job was eligible.

For a confirmed-present held object, first verify the exact store and path, subject, permission and absence of surviving publication, evidence or other-account dependencies. Use the individually authorized single-object operation. Verify origin absence and app denial. Preserve the held marker, pending job and pending receipt. Recheck open paths and leave failures or reappearance open. A current origin check establishes neither terminal state nor physical expiry.

Under the separately authorized 0026/0027 cutover, keep exposure off while doing the writer hold, installer and postflight, and verify the actual dedicated service LOGINs and the trusted authorization operator. Pause on an unsafe binding, privacy exposure, unowned or overdue obligations, or an unreconciled recovery point. Preserve obligations through any pause or rollback.

### Synthetic private-store probe

Use a clean, reviewed LF checkout with the pinned SDK and node already installed. The tool only accepts an exact app namespace pathname with known synthetic bytes (up to 1 MiB). A legacy token encodes its store ID, and the OIDC mode requires an explicit preview or development token and store. Before using either, independently confirm the store and execution context are isolated. The tool cannot infer isolation from a store name or a token. Never use this procedure with live credentials, live paths or a store shared with Production. Do not paste credentials into a command or evidence record.

In Windows PowerShell, replace each angle-bracket value with the independently verified synthetic input. Use `PHASE5B_BLOB_OIDC_TOKEN` in place of `PHASE5B_BLOB_TOKEN` if the existing binding uses OIDC. Use one credential and three distinct paths per binding. The control is a known-present synthetic object outside either deletion job. Use the exact bytes stored after any transformation. The existing Windows restore fixture's held object was database-only. Use a separate synthetic provider fixture for this pass and leave that checkpoint and recovery evidence intact.

```powershell
& {
    $ErrorActionPreference = 'Stop'
    $probe = 'scripts/account-deletion-0026/provider-probe.mjs'
    $expected = '40a4e3e8ef361f65f70aff18c313001012ba6d719dfec6ec94f95cd35511c66f'
    if ((Get-FileHash -LiteralPath $probe -Algorithm SHA256).Hash.ToLowerInvariant() -cne $expected) {
        throw 'Probe checksum mismatch. Use the reviewed LF checkout.'
    }
    $store = '<approved isolated store ID>'
    $fixtures = @(
        @{ Mode = 'inspect'; Path = '<control pathname>'; File = '<control bytes>'; Result = 'ORIGIN_PRESENT_MATCHED' },
        @{ Mode = 'repeat'; Path = '<terminal pathname>'; File = '<terminal bytes>'; Result = 'REPEAT_DELETE_ORIGIN_ABSENT' },
        @{ Mode = 'held'; Path = '<held pathname>'; File = '<held bytes>'; Result = 'HELD_ORIGIN_ABSENT_KEEP_PENDING' }
    )
    if ($store -cnotmatch '^store_[A-Za-z0-9]+$' -or
        @($fixtures.Path | Sort-Object -Unique).Count -ne 3 -or
        @($fixtures.Path | Where-Object { $_ -match '[<>]' }).Count -ne 0) {
        throw 'Enter the approved isolated store and three distinct exact synthetic paths.'
    }
    foreach ($fixture in $fixtures) {
        $fixture.Hash = (Get-FileHash -LiteralPath $fixture.File -Algorithm SHA256).Hash.ToLowerInvariant()
    }
    $credentialVariable = 'PHASE5B_BLOB_TOKEN'
    if ($env:PHASE5B_BLOB_TOKEN -or $env:PHASE5B_BLOB_OIDC_TOKEN) {
        throw 'Use a fresh shell with no probe credentials loaded.'
    }
    $oldRetries = $env:VERCEL_BLOB_RETRIES
    $secret = Read-Host 'Existing approved nonproduction credential' -AsSecureString
    try {
        $plain = [System.Net.NetworkCredential]::new('', $secret).Password
        [Environment]::SetEnvironmentVariable($credentialVariable, $plain, 'Process')
        Remove-Variable plain
        $env:VERCEL_BLOB_RETRIES = '0'
        foreach ($fixture in ($fixtures + @($fixtures[0]))) {
            $result = & node $probe $fixture.Mode $store $fixture.Path $fixture.Hash
            if ($LASTEXITCODE -ne 0 -or $result -cne $fixture.Result) {
                throw 'Probe failed. Preserve pending obligations.'
            }
            Write-Output $result
        }
    } finally {
        Remove-Item -LiteralPath "Env:$credentialVariable" -ErrorAction SilentlyContinue
        if ($null -eq $oldRetries) {
            Remove-Item -LiteralPath 'Env:VERCEL_BLOB_RETRIES' -ErrorAction SilentlyContinue
        } else {
            $env:VERCEL_BLOB_RETRIES = $oldRetries
        }
        $secret.Dispose()
    }
}
```

Expect `ORIGIN_PRESENT_MATCHED`, `REPEAT_DELETE_ORIGIN_ABSENT`, `HELD_ORIGIN_ABSENT_KEEP_PENDING` and `ORIGIN_PRESENT_MATCHED` in that order. The terminal fixture's writers must be fenced before the unconditioned repeat by pathname. The held fixture uses the observed ETag for a single DELETE. Both modes check private origin and fixture content before writing. The final control verifies that the same binding can still read an unrelated expected object.

Run the following in an approved read-only psql session on the synthetic target immediately before and after the PowerShell block, with the leased worker paused in between. Enter the exact synthetic pending receipt UUID, provider and pathname. Expect one identical row with `state=pending`, the same job ID, attempts, held timestamp and total receipt pending count. Compare with the original app receipt. After this comparison, test the isolated worker separately. Expect acknowledgement of the absent terminal fixture, with the held job and marker intact. Verify the erased account's file routes deny access while its held object is still present and again after the probe. The unrelated account and any approved surviving publication should still work.

```sql
\prompt 'Synthetic receipt UUID ' receipt_id
\prompt 'Synthetic provider ' provider
\prompt 'Exact synthetic pathname ' pathname
BEGIN READ ONLY;
SET LOCAL statement_timeout = '10s';
SET LOCAL search_path = pg_catalog, public, pg_temp;
SELECT o.id, o.state, o.attempts, u.recorded_at AS held_since,
       (SELECT count(*) FROM public.account_deletion_outbox pending
        WHERE pending.deletion_id = r.id AND pending.state <> 'complete') AS pending_objects
FROM public.account_deletion_outbox o
JOIN public.account_deletion_pending_upload u USING (provider, pathname)
JOIN public.account_deletion_receipt_store r ON r.id = o.deletion_id
WHERE o.deletion_id = :'receipt_id'::uuid AND o.provider = :'provider'
  AND o.pathname = :'pathname' AND r.expires_at > transaction_timestamp();
ROLLBACK;
```

Each review, compare the private case list against this read-only queue tally. Count, classify, and track deadlines for held, due, leased and deferred jobs. Check separately for old markers without a deletion job. A live or retained object can have a marker with no job. Only erase a held object whose disposition is verified.

```sql
BEGIN READ ONLY;
SET LOCAL statement_timeout = '10s';
SET LOCAL search_path = pg_catalog, public, pg_temp;
WITH queue AS (
  SELECT CASE WHEN u.provider IS NOT NULL THEN 'held'
              WHEN o.state = 'leased' AND o.lease_until > transaction_timestamp() THEN 'leased'
              WHEN o.available_at <= transaction_timestamp() THEN 'due'
              ELSE 'deferred' END AS class,
         r.created_at
  FROM public.account_deletion_outbox o
  JOIN public.account_deletion_receipt_store r ON r.id = o.deletion_id
  LEFT JOIN public.account_deletion_pending_upload u USING (provider, pathname)
  WHERE o.state <> 'complete'
)
SELECT class, count(*) AS jobs, min(created_at) AS oldest_request
FROM queue GROUP BY class ORDER BY class;

SELECT count(*) AS markers_without_open_jobs, min(u.recorded_at) AS oldest_marker
FROM public.account_deletion_pending_upload u
WHERE NOT EXISTS (
  SELECT 1 FROM public.account_deletion_outbox o
  WHERE o.provider = u.provider AND o.pathname = u.pathname AND o.state <> 'complete'
);
ROLLBACK;
```

### Synthetic Tally pass

Use the [manual test and acceptance check](../../docs/engineering/ACCOUNT_DELETION_READINESS.md#one-manual-acceptance-check). The owner reviews submissions and records approved medals manually. The earlier PowerShell qualification helper is superseded.
