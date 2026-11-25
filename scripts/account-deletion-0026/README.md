# Account deletion operational qualification and migration 0026

**Account deletion remains NO-GO. Keep `ACCOUNT_DELETION_ENABLED` unset.** The reviewer reported serving commit `ee23638`, no 0026 installation, six ready author media records, three registered legacy solution evidence records, zero profile media and internal medal claims, and both `ACCOUNT_DELETION_ENABLED` and `VERCEL_BLOB_RETRIES` unset. These are reviewer observations. Refresh them on the approved target under the writer hold. A reported count of six ready records leaves the count of other author media, existing outbox jobs and prior receipts to be checked. If the reported inventory is complete and all paths are distinct, the backfill holds nine paths.

Installing schema 0026 with uploads safely configured and deletion off is a separate owner decision from releasing account deletion. This package is for an explicitly approved window. The checkout, package manifest, plan, endpoint binding, writer hold and recovery evidence each require review before use.

## Vercel Blob evidence

| Operation | Established behavior | Release implication |
| --- | --- | --- |
| One SDK attempt | Physcratic pins `@vercel/blob` **2.8.2**. Its `dist/chunk-XKVPKJPO.js` reads `VERCEL_BLOB_RETRIES` through `getRetries()`. Unset or empty selects **10 retries**, in addition to the initial attempt, for eligible network or provider failures. The string `0` prevents SDK retries. The non-multipart path issues a PUT and parses a successful JSON response. All four application upload paths use private storage, fixed paths, no overwrite and no multipart option. The SDK sends one request ID for the SDK call and includes an attempt number on retries. | An application invocation can make several upstream requests with the old setting. Single attempt bounds requests issued by this SDK invocation. It does not attest the behavior of upstream proxies, the provider, a different writer or older attempts. [Vercel SDK `put()` reference](https://vercel.com/docs/vercel-blob/using-blob-sdk#put) |
| Successful or interrupted PUT | Vercel documents the result as metadata for the created blob. A normal resolved single PUT is the acknowledgement the app records. The docs describe an `AbortSignal` option. The pinned client forwards it to the transport. The application gives PUT a 10-second local timeout. A timeout, connection drop, process interruption, missing app acknowledgement or provider error leaves the server outcome unknown. | The public contract does not describe a terminal-status lookup or a maximum late-commit lifetime for aborted requests. It does not establish that a successful response closes every earlier attempt on an old path. Request a written guarantee for terminal single-attempt success and a documented way to settle uncertain writes. [Vercel SDK reference](https://vercel.com/docs/vercel-blob/using-blob-sdk#put) |
| `del()` and retry | The docs describe deletion by URL or pathname and up to one minute for removal from Vercel CDN caches. The pinned SDK sends `POST /delete` with `{ urls }`, awaits an API result and does not synthesize successful deletion on a `not_found` error. Its generic response handler throws for such an error. The public API reference does not specify the exact response when deleting a path that is already absent. | Retry of the same stable pathname without concurrent writers must be qualified on the actual private-store binding, including absent-path response and lost acknowledgement. The 60-second CDN figure is a cache window. It provides no bound on late writes or physical backup retention. [Vercel deletion reference](https://vercel.com/docs/vercel-blob/using-blob-sdk#del) [Vercel caching](https://vercel.com/docs/vercel-blob#caching) |
| Observing a path | The pinned SDK implements private `get(path, { access: 'private', useCache: false })` by requesting `cache=0`. Vercel documents this as a read from origin of the latest content. `head`, listing, ETag, overwrite protection, TTL and origin reads report or constrain current state. | Existing or absent data, old timestamps, conditional writes and conventional cache expiry provide no proof that a different accepted PUT cannot still commit. `ifMatch` does not fence future requests. Confirm retained-copy and deletion guarantees separately. [Vercel private storage](https://vercel.com/docs/vercel-blob/private-storage#consistent-reads) [Vercel overwrite and cache guidance](https://vercel.com/docs/vercel-blob#overwriting-blobs) |

### What can run on existing infrastructure

The reviewed code, current private bindings, existing outbox/operator endpoint and existing database can perform single-attempt uploads and leased retry. Blob is available on all plans. Vercel documents included Hobby usage and distinguishes it from paid usage. The owner can rehearse with synthetic paths on an **existing approved isolated nonproduction store** if suitable access and quota already exist. No new store, tier, seat, monitor or scheduler is needed by the application. The reviewer has not established the existence or available quota of that rehearsal binding. Vercel's Hobby comparison lists no email support. The Support Center can be checked for the current team's case entitlement without a purchase. A public community answer does not prove the provider's terminal state for the nine paths. [Vercel usage and pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing) [Vercel Hobby plan](https://vercel.com/docs/plans/hobby) [Vercel Support Center](https://vercel.com/docs/support-center)

**Provider confirmation required.** Ask Vercel for the following through an existing entitled, private support channel. The owner can send the request below. No request has been sent.

1. Confirm what a successful single non-multipart private PUT response establishes on the serving Blob API version. Can a previously accepted request or an upstream replay for the same path still commit after that return?
2. Identify a terminal-status or cancellation mechanism for an interrupted request. Say whether an operator can provide store ID, exact pathname, UTC time range and any available `x-api-blob-request-id` or attempt number so support can confirm every accepted attempt is terminal. For old cases where no request IDs were retained, can support certify by store, path and window, or provide a documented maximum commit lifetime measured from a verifiable ingress fence that covers retries and proxies?
3. Confirm the exact expected outcome from repeating an unconditional DELETE by pathname in a private store after the original deletion succeeded but its acknowledgement was lost. Confirm the absent-path result, the origin read behavior after acknowledgement and the scope of the CDN propagation window.
4. Confirm what data, replicas, snapshots, backups or recovery copies can remain after DELETE, their actual expiry and access restrictions, and whether an active or restored copy can reintroduce a deleted object. Request facts the privacy notice and restore runbook can rely on. A product statement that a deleted blob is not user-restorable is narrower than a physical retention commitment.

If repeating DELETE on an absent path returns an error, the current operator will leave the job pending. Keep activation blocked until the behavior has a reviewed resolution. Manually completing a job would bypass the evidence requirement.

If Vercel cannot give usable confirmation through existing entitlement, keep the provider gate **blocked**. A successful rehearsal can demonstrate the exercised cases. It cannot prove a universal upper bound on interrupted writes. Do not switch plans or buy anything to qualify this package.

## Owner cutover with deletion off

1. Approve the reviewed repository checkout and manifest, the exact Neon project, branch and direct endpoint, the actual production LOGIN and migration owner, and the serving commit and flag evidence. Verify the direct hostname against the provider console and the serving database binding independently. The installer checks TLS, database, LOGIN, effective migration owner and version. SQL cannot attest which Neon branch a hostname is routed to.
2. Approve recovery instructions, name the executor and independent witness, and name who can reopen writes. Record the actual recoverable point and permissions in the private plan. Test restore with access closed, including the outbox, paths, ledger, and prior erasure obligations. Use the common migration advisory-lock key. Keep the existing approved writer and DDL hold mechanism active. A recovery point is for incident management under the approved restore process.
3. Under separately approved owner change control, stage and manually serve the reviewed code with **`VERCEL_BLOB_RETRIES=0`** and **`ACCOUNT_DELETION_ENABLED` unset** before upgraded-schema uploads are admitted. On 0026 the code rejects new reservations before provider I/O unless that setting and the narrow acknowledgement grant are present. The SDK setting also limits retries on other SDK calls that use its shared API request path. Existing outbox backoff still governs deletion retries.
4. Fence all upload **and cleanup** writers before gathering the held baseline. Cover the main and alternate deployment hosts, existing aliases, direct endpoints, older eligible previews and any standalone store writers or tokens with write authority. Include author media, legacy solution evidence, profile media, internal medal proof and the erasure operator. Keep disabled namespaces disabled. Verify on the existing infrastructure that old code cannot accept another write, and record the fence start and verified scopes. Draining app traffic and credentials does not prove earlier provider work has stopped.
5. Run `Inspect` while the writer hold is active. Review the full predecessor ledger against its approved hashes and verify the 0018 routine owners. Compare the counts with the reviewer observations, including other author media, existing outbox and receipts. Investigate every discrepancy. Capture the two reported digests into the private plan. Approve the completed plan checksum and window. Keep the hold through `Install` and independent `Verify`.
6. Install via the following commands while deletion remains off. Keep 0026 and any pending data through an application rollback. If install fails or the connection drops around commit, hold writers and run a fresh `Inspect` followed by `Verify` when the 0026 row exists. Never retry on an uncertain commit outcome. Resume only with an approved build using the new grant and setting, verified provider bindings, and successful off-state upload and ordinary cleanup checks on synthetic data in approved nonproduction. Confirm old public thumbnail caches have expired or been invalidated before deletion activation.

### Windows PowerShell and psql commands

Use a trusted PowerShell and psql 15 or newer with Git on PATH. The Windows-safe installer uses a UTF-8 LF SQL file for psql. Set `PGPASSFILE` to the existing protected libpq password-file path or use an equivalent existing libpq credential source. The installer uses `--no-password` so an unexpected password prompt fails. Keep secrets outside arguments and Git. Disconnect ambient `PGSERVICE`, `PGSERVICEFILE`, `PGHOSTADDR`, `PGOPTIONS` and `PGPASSWORD`. Use the approved CA file and direct host, never the pooled endpoint for the migration.

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

| Gate | Owner evidence |
| --- | --- |
| Tally | Inventory the verification form, unawarded and awarded submissions, certificate links, trash, exports, notifications and actual downstream copies. Rehearse verified matching and fallback for ambiguous matches. Record a restricted disposition independently before the app loses the reference, including cases that start in self-service. Assign primary and backup coverage for outstanding cases. |
| Roles and service binding | Attest the distinct ordinary, eraser and staff logins and their narrow effective permissions, trusted owner, actual database bindings, provider store mapping, and operational readiness while the deletion flag remains off. Keep internal medal verification disabled. |
| Privacy and retention | Approve and publish accurate notice and in-flow support copy for profile, attempts, account, registered objects, Tally, backups and people who cannot sign in. Approve retention basis, finite timers, access, review, disposal, holds and rights review. Choose archive-only or revision-specific continuing display. |
| Independent review and support | Name two qualified independent reviewers for mixed cases and backup coverage, prove the request handoff and support channel, and approve queue cadence, alert threshold, outage handling and secure evidence access. |
| Backup reconciliation | Approve actual Neon and provider retention and expiry, access restrictions, an independently recoverable erasure-obligation record, and an isolated restore rehearsal. Verify all erased accounts, blobs and external obligations, as well as unaffected accounts, before traffic. Keep restore paths isolated or prohibited when reconciliation cannot be proved. |
| Activation | Require provider confirmation and synthetic rehearsal, an accepted held-path reconciliation, all of the preceding evidence and separate written owner approval for the flag and manual deployment. If any item remains open, leave deletion off. |

Further operational detail is in the [account deletion readiness runbook](../../docs/engineering/ACCOUNT_DELETION_READINESS.md).

## Reproduce the local evidence

From the clean candidate checkout use Node 22 and the pinned pnpm version for the SDK probe. Use Bash, a local Docker daemon, PowerShell, psql, OpenSSL and Python for the installer rehearsal. Both commands use synthetic data. The SDK probe points only at a loopback stub. The installer rehearsal creates and removes its own PostgreSQL container and generates a temporary TLS certificate and plan outside the checkout.

```sh
pnpm install --frozen-lockfile
node scripts/account-deletion-0026/sdk-probe.mjs
bash scripts/account-deletion-0026/rehearse-local.sh
sha256sum -c scripts/account-deletion-0026/PACKAGE_SHA256SUMS
```

The SDK probe verifies request and attempt counts, an interrupted request whose outcome the synthetic provider controls, and propagation of a simulated DELETE `not_found` error. The installer rehearsal uses PostgreSQL 18.7, verifies nine held paths and the actual runtime LOGIN, checks refusal on checksum, inventory, ACL and replay drift, and injects a ledger failure after the migration and grant to prove atomic rollback. These are synthetic tests. The PowerShell and psql binaries were exercised on Linux. Actual Windows host, Production role bindings, provider storage behavior, and physical retention remain separate qualification items.
