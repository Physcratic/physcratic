# Account deletion authorization handoff

**Local qualification only.** Keep deletion off. Migration 0027 requires the 0024 external medal reference, 0026 and the trusted routine owner. Install and ledger approval, operator staffing, scope and recovery policy approval, and service activation are separate decisions. The existing 0025 schema-only release remains independent.

## Operator sequence

1. Receive verified, explicit account-erasure authorization and ask the subject to open the pending request using Settings and fresh proof. Verify the opaque case reference belongs to the exact stable subject. Review publication, file and external dispositions before arming. Reuse the two independent mixed-case decisions where required. Capture verified Tally and other external obligations before any automatic cascade can erase the links. Fence changes to those external matches until the request is resolved, or record every change through the approved independent process before it can become invisible.
2. Use a restricted encrypted location outside the database and independently recoverable by the backup custodian. Put the approval, scope and disposition there with their named owners. The operator script takes the approved direct endpoint, LOGIN, owner, server version, case UUID and a new private intent path. Configure the existing trusted CA via `PGSSLROOTCERT` and use the approved password file. Invoke `RecordIntent` and enter the verified stable subject, references and short UTC expiry. It captures the database scope and saves the exact arm-intent file before any arming. Verify its human-readable scope and independent recovery with the backup custodian. Preserve the original bytes and reported checksum. A filesystem flush and local read-back cannot prove backup or encryption.
3. Invoke `Arm` with the same target and exact intent file and independently checked `IntentSha256`. Enter the typed confirmation only after custody is confirmed. The database rechecks subject, current scope and expiry. The app and other service LOGINs have no arm, disarm or scope access. The user reauthenticates and retries from the original tab. Scope changes require a new review, an exact `Disarm`, and a fresh external intent. A revoked digest cannot be reused. Access and review terms for the identifying external files follow the owner policy.
4. Use `Status` with the pinned intent and preserve the evidence outside the rollback point. A committed receipt has the same opaque ID and pins the consumed intent digest. Use it with the source checks before reporting a confirmed erasure. A pending request may have an active, expired, revoked or different intent. A connection loss around arming or execution, absent or expired receipt, and source loss are all possible unknown outcomes. Preserve every arm-intent, including one whose arming acknowledgement was lost. Never attribute a receipt to another intent for the same case without reconciling their authorization and disposition references. If the source is lost, both uncertain arming and uncertain execution may represent a committed erasure. Keep restore targets isolated and send all such records for independent reconciliation and explicit replay and reopen approval. A local record or working consent flow does not authorize Production recovery.
5. Install only under the usual common migration lock and reviewed ledger procedure while every old erasure entry point is fenced. The service remains off across the upgrade. 0027 alters the existing eraser in place and retains its OID and ACLs. It requires live scope under read committed isolation and takes a short fail-fast lock on file, publication and Tally registries to rule out in-transaction scope changes. Recheck effective roles, including no inherited owner access, no protected-table DML and no routine default-grant drift. At current volume a lock conflict means retry the same request. The original mixed-case, proof, receipt, outbox and hold guards still apply.

Use the same PowerShell options across all case commands. Set the approved CA and password file in the shell before running these commands. The backup custodian supplies the independently verified digest after retrieving the recorded file.

```powershell
$case = @{
    Endpoint = Read-Host 'Approved direct database hostname'
    Port = [int](Read-Host 'Approved database port')
    Database = Read-Host 'Approved database name'
    Login = Read-Host 'Approved named operator LOGIN'
    Owner = Read-Host 'Approved trusted erasure owner'
    ServerVersion = [int](Read-Host 'Approved server_version_num')
    CaseId = [guid](Read-Host 'Opaque deletion request reference')
    IntentFile = Read-Host 'New case file path in approved encrypted storage'
}
& .\scripts\account-deletion-authorization\operate.ps1 -Action RecordIntent @case

# Run separately after independent custody and scope review.
$pin = Read-Host 'Independently verified ARM_INTENT_RECORDED digest'
& .\scripts\account-deletion-authorization\operate.ps1 -Action Arm @case -IntentSha256 $pin
# Inspect the outcome without retrying an uncertain arm or erasure.
& .\scripts\account-deletion-authorization\operate.ps1 -Action Status @case -IntentSha256 $pin
```

The [disposable recovery adapter](../account-deletion-restore/README.md) verifies a separate signed recovery approval and the retained arm intent across the 0027 boundary. Any actual recovery retains its separate approval and qualification requirements. A rollback to historical app code on an upgraded database cannot bypass the database guard. A database rollback to a point before 0027 requires the same external reconciliation and restored traffic remains closed.

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
