# Account erasure permits and independent custody

**Code and disposable qualification only.** Keep `ACCOUNT_DELETION_ENABLED` unset. Owner-approved policy, custody, operators, provider rehearsals, installation and activation are separate gates.

## Prerequisites

- Approve the exact checkout and `sha256sum -c scripts/account-deletion-authorization/PACKAGE_SHA256SUMS`. Require the reviewed 0024 Tally reference. Install 0026 separately through its [reviewed operator package](../account-deletion-0026/README.md). Verify the eraser, staff and ordinary LOGIN boundaries. The operator acting as the trusted erasure owner may issue permits. The erasure LOGIN can execute the existing gated routine. The staff LOGIN can review evidence and run leased cleanup. The scripts add no service grants.
- With deletion off and older erasure entry points fenced, review the forward-only 0027 up file, ownership, installation transaction and exact ledger pin. Use the common migration advisory lock and commit the reviewed migration body, assertions and ledger together in the approved window. The up file owns a transaction by itself. A wrapper must verify the original bytes before extracting its single outer transaction. Obtain separate owner approval before execution. Keep the old self-service build and native auth deletion out of service.
- Approve a restricted encrypted case location recoverable independently of PostgreSQL, named primary and backup custodians, access controls and retention. Generate a fresh random 32-byte binary key per case using the existing approved key store. Preserve an independently recoverable key copy in separate restricted custody. The encrypted case carries minimal identifiers and obligations. Keep key bytes, password, session and request tokens outside the case file, command line, transcripts and repository.

## Prepare and use a permit

1. Have the verified subject open a request in Settings using fresh proof. Use the opaque review reference from the response. Verify authority and exact stable subject before reviewing publication and mixed evidence, and complete the required independent approvals before recording scope. Keep subject verification and provider bindings in the restricted case workflow.
2. Use PowerShell 7, Node 22 and psql with the approved direct endpoint, trusted CA and existing `PGPASSFILE`. Share no credentials. The operator command forces client `verify-full`. On the approved target, call `ReviewScope` to obtain the stable subject fingerprint, verified address digest and recorded award IDs. Independently verify Tally on the approved form and downstream copies, including submissions without awards. Produce a restricted JSON review with those exact fingerprints, a named evidence `reference`, and `submissions` entries with `id`, `kind` (`awarded` or `unawarded`) and `dispositionRef`. Use an empty array only after verifying an empty match. Unresolved identity matching or incomplete evidence requires review before issuing a permit. Pending, verified dispositions stay pending in custody. Fence changes to external matches during the handoff or re-review and record them before proceeding.
3. Record the intent. The scope includes exact revision and evidence decisions, registered paths, held state and each reservation's digest. The helper creates a fresh authenticated encrypted file, flushes it and reads it back. Failure produces no permit. Back up the encrypted bytes independently of the database. Before arming, the backup custodian must retrieve and decrypt that copy using the independently recovered key, verify the case against the scope and communicate the exact verified digest. The issuer relies on this custody decision. The database can enforce the pinned digest and current scope.
4. Arm only the verified case. Confirm the same digest from the recovered copy. The SQL rechecks subject, scope and expiry, and the trusted role is the only issuer. Have the subject sign in again if needed and retry in the original tab. The guarded eraser requires fresh proof and a current permit. It writes the matching receipt and consumes the request in the same transaction as erasure and outbox creation. If scope changes, keep the record, disarm the exact digest and review a fresh intent.

```powershell
# Fill these from separately reviewed private evidence, then keep the case files outside the repository.
$case = @{
    Endpoint = $ApprovedDirectHost
    Port = $ApprovedPort
    Database = $ApprovedDatabase
    Login = $ApprovedOperatorLogin
    Owner = $ApprovedEraserOwner
    ServerVersion = $ApprovedServerVersion
    CaseId = $VerifiedCaseId
}
$operator = '.\scripts\account-deletion-authorization\operate.ps1'
& $operator -Action ReviewScope @case
& $operator -Action RecordIntent @case -IntentFile $NewEncryptedFile -KeyFile $PrimaryKeyFile -TallyReviewFile $ReviewedTallyFile

# The backup custodian runs this against the independently retrieved bytes and key.
node scripts/account-deletion-authorization/case-record.mjs verify $RecoveredCaseFile $RecoveredKeyFile $RecordedDigest

# Run only after independent read-back and approval. Use the digest from that custodian.
$recovered = @{IntentFile=$RecoveredCaseFile; KeyFile=$RecoveredKeyFile; IntentSha256=$IndependentlyVerifiedDigest}
& $operator -Action Arm @case @recovered
& $operator -Action Status @case @recovered
```

Preserve ciphertext and status history through lost arming or erasure acknowledgements. The exact active arm can be retried after reconciling its state. A matching receipt from the verified source together with account, credential and session absence supports database confirmation. Missing or expired receipts, unavailable source, changed hashes and unknown responses remain uncertain until independently adjudicated. An exact `Disarm` records revocation in the database. Confirm its outcome before replacing the permit. Track Tally and pending or held object obligations separately even when live database erasure is confirmed. Never clear a hold based on object presence, absence or age.

## Restore and release boundary

Restore only to an isolated copy with service and worker access closed, including old aliases and credentials. Before reconnecting any erasure LOGIN, use the trusted owner to run `SELECT public.account_deletion_fence_restored_permits();` on the reviewed 0027 restore target and record its returned epoch in the independent recovery approval. Any restored or previously recorded permit from the old epoch is stale. A checkpoint before 0027 stays isolated while reconciled and until its approved 0027 fence is installed. Preserve all potentially committed requests and independently authorize reconciliation of each exact subject. The [synthetic restore rehearsal](../account-deletion-restore/README.md) exercises the boundary and is limited to disposable Docker targets.

The owner must approve actual independent storage and key recovery, named operators and reviewers, privacy and retention terms, real provider/Tally rehearsals, and a restore procedure with the actual provider access closed until independent verification. None of the synthetic outcomes attests physical backup expiry, unknown upload completion or live custody. Reopen only after the approved reconciliation confirms erased subjects and revived credentials are absent, B and other unaffected accounts are preserved, held and external obligations survive, and any later evidence restrictions or disposal decisions carry forward. Keep any unresolved recovery target isolated.

## Rehearse against the existing private staging store

Use the existing read-write token for `physcratic-authoring-staging` only. Confirm the store is private and Preview-only and has included usage headroom. The runner checks the embedded ID `3XHvtHs2UM4ZFD5d` exactly before starting. Its masked prompt keeps the credential out of command history, fixture files and command arguments. The patched fixture and provider probe use `PHASE5B_BLOB_TOKEN`. Only the filtered loopback app child gets the SDK's `BLOB_READ_WRITE_TOKEN` binding. The Vercel project configuration stays unchanged.

From Windows PowerShell 5.1, run the launcher in the reviewed worktree. Reuse the original native-kit checkout, its existing dependencies and its unchanged native runner. The reviewed worktree needs the same dependencies, which can be reused via a directory junction. Keep the original Windows fixture and checkpoint on 55439.

```powershell
& .\scripts\account-deletion-authorization\rehearse-blob.ps1 `
    -NativeCheckout (Read-Host 'Original clean native-kit checkout') `
    -NativeRunner (Read-Host 'Path to the existing Invoke-Phase5bNative.ps1')
```

The launcher builds the disposable database on `127.0.0.1:55440`, uploads the three exact synthetic fixture objects, and starts the original pinned app on `127.0.0.1:3318`. The synthetic sign-in, private proxy, origin probes and one eligible leased cleanup run automatically. Expect `BLOB_FIXTURES_READY`, `APP_ACCESS_VERIFIED_BEFORE`, the four origin probe results, `HELD_JOB_AND_RECEIPT_UNCHANGED`, `APP_ACCESS_VERIFIED_AFTER`, `TERMINAL_ACKNOWLEDGED_HELD_PENDING` and `BLOB_REHEARSAL_PASSED`. The launcher stops the app and keeps the separate fixture cluster and evidence. Keep `blob-fixtures.json` private.

An unexpected provider response, including a lost acknowledgement, stops the pass. Preserve the fixture and reconcile the exact object and job before any retry. Successful execution leaves the unrelated synthetic control object and the held obligation intact. Qualification covers the author and legacy solution-evidence binding using the store token. Preview OIDC and any other store bindings require their own evidence.
