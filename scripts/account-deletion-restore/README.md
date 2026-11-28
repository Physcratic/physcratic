# Disposable PostgreSQL erasure reconciliation

This tool replays a separately authorized erasure on one restored synthetic account. The supported target is a labelled, auto-removing PostgreSQL 18.7 Docker container on the local Unix socket with no network, published ports or external mounts. The account ID must start with `synthetic-`. The runner accepts no database URL.

## Run the rehearsal

From the repository root, with the repository dependencies installed and the `postgres:18.7-alpine` image already available locally:

```bash
bash scripts/account-deletion-restore/rehearse-local.sh
bash scripts/account-deletion-restore/rehearse-local.sh --post-0027 --lost-arm
bash scripts/account-deletion-restore/rehearse-local.sh --post-0027 --lost-erase
bash scripts/account-deletion-restore/rehearse-local.sh --post-0027 --pre-0027-checkpoint --without-completions
bash scripts/account-deletion-restore/rehearse-local.sh --post-0027 --post-erasure-checkpoint
```

The rehearsal installs the reviewed repository migrations through 0026 on a synthetic source, dumps it, and restores the dump into a separate database. It commits erasure on the source through the original account eraser, then signs a synthetic approval with a disposable reviewer key. The restore tool works on the recovered database where the old session is expired. The 0027 cases cover an armed checkpoint after loss of the arm response, a checkpoint before a committed erasure whose response is lost, a checkpoint before 0027 and without completions, and a checkpoint that already contains the matching committed receipt.

Expected output:

```text
PASS approval, wrong target, concurrent session, drift, stale session and rollback refusal
PASS real dump/restore and normal-erasure parity, idempotency, other-account and ACL preservation, publication and held cleanup
```

The rehearsal removes its local dump, keys and container on exit. It uses ordinary session credentials only for the synthetic source control. The restore executor never receives a session token or password.

## Run with an independently reviewed synthetic case

Keep all application connections and object cleanup workers disconnected from the recovery target. The target must be a running container created using `--network none --rm --label io.physcratic.purpose=disposable-erasure-restore` and PostgreSQL started with `-c listen_addresses=''`. Restore the trusted synthetic dump into `physcratic_restore_test`. Its database and reviewed erasure routines must have the existing `restore_owner` role as owner. The local socket administrator is the trusted executor.

The independent reviewer records the deletion authorization, its external reference, the exact restored subject and the rights and cleanup disposition. Keep that record and the signing key outside the recovery target. The operator gets the reviewer public key fingerprint through a separate trusted channel. Use an authorized synthetic record for each subject. The rehearsal shows how to assemble the JSON fields:

- Use `version: 1` only for a legacy 0026 source and target. Use `version: 2` for any 0027 source, including a restore point from before 0027. `caseId` is a unique UUID. `deletionRecord` is an opaque reference to the independently recorded authorization. `approvedAt` and `expiresAt` are UTC ISO timestamps spanning at most 24 hours.
- `containerId` is the full 64-character Docker ID. `database` is `physcratic_restore_test`. `subjectId` and `subjectFingerprint` identify the exact restored account. The fingerprint is the lowercase SHA-256 of the PostgreSQL UTF-8 text representation of `jsonb_build_array(id, "createdAt")` with the session time zone set to UTC. Compare the restored identifiers to the independent record before signing.
- `publications` lists each problem and exact revision independently approved to remain public. Each entry has `problemId`, `revisionId` and the lowercase SHA-256 `digest` of the PostgreSQL UTF-8 text representation of `jsonb_build_array(rights_basis, review_reference)`. The restored decision must match. The normal eraser archives unlicensed and stale-revision publications and preserves immutable history. The tool never republishes an archived revision.
- `cleanup` lists the independently recorded pending cleanup obligations for this case. Each entry has `provider` (`author`, `profile` or `medal`), `pathname` and a boolean `held`. `held: true` requires the existing upload hold to survive. `held: false` makes no claim about an existing hold. The inventory may be empty only if there are no applicable obligations in the independent record.

For version 2, retain the exact external arm-intent file created before arming. The independent reviewer verifies its custody, exact subject, source binding, approval and disposition references. If either acknowledgement may have been lost, reconcile that intent as a potentially committed erasure. An absent or expired receipt and a missing acknowledgement establish no negative outcome. Include these fields in the signed approval:

- `databaseOid` is the integer OID of the reviewed target database in the isolated container. `targetRevision` is `"0026"` or `"0027"`. Verify the restored checkpoint and its provenance independently before signing. The tool checks the container, database, OID, installed version and subject fingerprint.
- `sourceAuthorization` contains the original arm intent's `caseId`, its exact file `intentSha256` and `outcome` of `receipt-confirmed`, `arming-unknown` or `execution-unknown`. Use a different UUID for the outer recovery case. The signed file authorizes replay independently of that classification and the historic intent's expiry. Revoked or conflicting authorization present in the recovery point requires new independent reconciliation before replay.
- `tallyReferences` lists the verified source and restored submission IDs covered by the disposition. Verify unawarded submissions and downstream copies separately. The tool refuses an unreviewed restored award reference, a cleanup obligation missing from the target, or an unexpected pending job created by replay. A missing post-checkpoint obligation needs a separately reviewed recovery plan.

The reviewer signs the exact JSON bytes. The signature is a detached binary Ed25519 signature. Retain the same bytes for transparent retries.

```bash
openssl pkeyutl -sign -rawin -inkey reviewer.key -in approval.json -out approval.sig
```

The operator runs the following with the independently obtained `TRUSTED_KEY_SHA256` and the full `CONTAINER_ID`:

```bash
node scripts/account-deletion-restore/reconcile-local.mjs \
  "$CONTAINER_ID" approval.json approval.sig reviewer.pub "$TRUSTED_KEY_SHA256" arm-intent.json
```

For version 1 omit the final intent argument. Expect `RECONCILED` after commit. A post-erasure 0027 checkpoint with the matching source receipt and disposition returns `ALREADY_RECONCILED` without inserting another receipt. A replay of the **same active signed file** yields `ALREADY_RECONCILED` while the matching existing receipt and signed obligations remain. A refusal exits with status 1. After a lost acknowledgement, check the isolated target and retry the same signed bytes before expiry. An expired or missing receipt cannot stand in for evidence of erasure.

## Transaction and limits

The runner verifies the installed 0018 and 0026 ledger entries and, for a 0027 target, the exact 0027 ledger entry and authorization routines. It pins the eraser, companion routines and relevant trigger definitions. It compares the account deletion foreign-key graph and its enabled internal triggers with the canonical fixture, including transitive cascades and anonymization. 0019 and 0025 are compared separately when their tables exist. A missing or disabled path stops the transaction before the runner executes erasure.

The transaction locks the subject and uses a temporary security-invoker eraser after validating independent approval. On 0027 it first pins the live eraser and verifies that normalizing the live-only gate yields the exact reviewed 0026 eraser definition. No live request is armed, and no user credential is instantiated. It removes the temporary routine before commit. Account, session and credential checks after erasure run inside the transaction. The approved policy and existing mixed-evidence adjudications still apply. The original routine, privileges and migration ledger remain intact.

A signed pending obligation missing after replay, a changed publication-rights decision, or a stale evidence approval stops the transaction. The tool cannot infer provider outcomes, lost upload-token hashes or missing case decisions from a pathname. For a missing obligation, use a verified checkpoint containing it or obtain separate review of independently recovered cleanup records before retrying. Never release a restored database with an unresolved case. This tooling qualifies synthetic PostgreSQL reconciliation only. Provider cleanup, backup retention, and authorization for any live recovery remain outside its scope.
