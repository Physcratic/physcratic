# Final authoring Preview environment remediation — plan only

Project: `neuterions-projects/financial-dashboard`,
`prj_phm4794zl2QBICu5MMbLFxcHAfFq`. Preview branch:
`codex/physcratic-authoring-completion`. No remote mutation, deployment, push,
migration, live account, email or Blob operation is authorized by this document.

The reviewed application/CI/migration package is unchanged. Existing evidence,
patches and `AUTHORING_STAGING_VALIDATION.md` remain intact. The latest operator
evidence is `work/vercel-env-remediation/AUDIT_MANIFEST-v2.json`; the previous
plan and evidence are archived under that directory's `revisions/`. Do not commit private
inputs or any secrets. This plan adds no product code or diagnostic endpoint.

## Decision about empty branch overrides

Vercel documents that a branch-specific Preview variable overrides the default
Preview value. The current upstream CLI explicitly represents an empty string
and warns that it needs confirmation. Neither fact proves that a zero-length
override safely suppresses an inherited credential in this project's **hosted
Function**. There are no authoring-branch empty alias overrides to observe now.
CLI success, an API record, `env pull`, or local `env run` is not hosted runtime
proof; write-only Secret omission from a pull is especially not proof of absence.

**Empty override shadowing is NOT CERTIFIED for this release.** It is not being
declared universally unsupported. Testing the complete platform behavior would
require an approved configuration change and a fresh deployment, both prohibited
in this task. Do not depend on an untested precedence edge case to isolate data.

The actual application guard was tested in **25 isolated local Node processes**:
absent aliases and true zero-length values permit only the explicitly pinned
staging DB options; each nonempty alias refuses initialization; whitespace,
newlines, `0`, `false`, literal quotes and the string `undefined` also refuse;
wrong primary endpoint refuses; normal Production behavior is preserved. These
tests run the real `runtimeDatabaseOptions`, not a replacement implementation.
No connection is opened. This is local Node evidence, not a hosted Vercel test.

If an operator later wants the narrower branch-only empty-override strategy,
first test a nonsecret canary under the same project/branch/variable type and
policy, on a protected deployment that leaves the stable alias untouched. Verify
the **server Function's** resolved empty value and absence of the inherited
sentinel. Before allowing staging operations also verify every real alias is
absent/empty at runtime. Use exact `value: ""`, not a space, `"\"\""`, `null`,
`0` or a placeholder. An empty stdin file is not reliable evidence that the CLI
submitted an empty value. If any stage rejects, drops or falls back, stop and use
the scope-removal plan below. Do not relax app checks or team secret policies.

## Recommended fallback: remove Preview from shared alias targets

For each existing shared PostgreSQL alias, remove **only** `preview` from its
target list. Currently confirmed targets are `production, preview, development`;
the resulting targets must be **`production, development`**. Value, type, key,
record ID, Production membership and Development membership stay unchanged.
Do not decrypt, copy, rotate, blank or replace a Production credential. Do not
delete the variable or remove its Production target.

Confirmed aliases and exact target changes:

| Name | Current scope | Required scope | Value operation |
| --- | --- | --- | --- |
| `DATABASE_URL_UNPOOLED` | Production + Preview + Development | Production + Development | None |
| `POSTGRES_URL` | same | same required scope | None |
| `POSTGRES_PRISMA_URL` | same | same required scope | None |
| `POSTGRES_URL_NO_SSL` | same | same required scope | None |
| `POSTGRES_PASSWORD` | same | same required scope | None |
| `POSTGRES_HOST` | same | same required scope | None |
| `POSTGRES_USER` | same | same required scope | None |
| `POSTGRES_DATABASE` | same | same required scope | None |
| `PGUSER` | same | same required scope | None |
| `PGDATABASE` | same | same required scope | None |
| `PGHOST_UNPOOLED` | same | same required scope | None |

The operator has now supplied the complete names-only inventory: twelve shared
PostgreSQL names, comprising the eleven aliases above plus `DATABASE_URL`.
This resolves the earlier connector truncation as a names-list blocker. The
additional shared names are `NEON_AUTH_BASE_URL` and `NEON_PROJECT_ID`.
`PGHOST`, `PGPASSWORD` and `POSTGRES_URL_NON_POOLING` are not in the supplied
inventory; do not create empty records or schedule changes for those names.
Re-list metadata for freshness immediately before execution; a newly appearing
alias requires an updated reviewed diff.

**Leave shared `DATABASE_URL` unchanged**, including its Production, Preview and
Development membership and stored value. Keep its existing authoring-branch
Preview override with staging-only credentials. `DATABASE_URL` is the app's
intended primary variable, not an unused alias; the guard rejects missing or
wrong-endpoint primary credentials before connecting. Removing Preview from
this shared primary record is not required for this minimal plan.

Leave `NEON_AUTH_BASE_URL` and `NEON_PROJECT_ID` unchanged. Current application
runtime code does not reference them and uses the explicit pg pool and Better
Auth configuration. They are not alternate connection inputs and do not match
the alias-denial rule. Do not use them to select this release's database/auth
service or add a Neon Auth feature. Neither requires a Production edit.

The exact minimum is **eleven target-only alias edits plus one new branch-only
allowlist record**. No changes to the seven existing branch overrides or these
three shared records are needed, provided the existing values meet their already
reviewed requirements.

Include every effective Preview variable matching the unchanged guard:

```text
^(PG[A-Z_0-9]*|POSTGRES(?:_|$)|DATABASE_URL_)
```

No name matching that rule may retain a nonempty effective authoring Preview
value. If inventory reveals a branch-specific alias, remove only that Preview
alias binding after identifying its consumers; do not edit a different branch's
record. A new/different target/name/ID is a stop for an updated scope plan.

Operator procedure, after explicit configuration approval:

1. Capture names, IDs, targets, type, branch, custom-environment and integration
   linkage metadata without values. Review other Preview branches' reliance on
   these aliases. Scope removal affects future deployments of **all** Preview
   branches; it is not branch-only. Preserve their isolated `DATABASE_URL`
   overrides and approve any additional non-Production remediation they need.
   Do not copy Production credentials into other Preview branch overrides.
2. The known rows have integration-store content hints. Verify per-variable
   target edits are supported and persistent under integration synchronization.
   If the provider manages/recreates them, obtain a supported **Preview-only**
   integration rescope that leaves its Production connection unchanged. Do not
   disconnect the integration/store or use an all-target delete/reconnect.
3. Update each reviewed row by its exact ID with a **target-only PATCH**:

```http
PATCH https://api.vercel.com/v9/projects/prj_phm4794zl2QBICu5MMbLFxcHAfFq/env/REVIEWED_ENV_ID?slug=neuterions-projects
Content-Type: application/json

{"target":["production","development"]}
```

`value` is optional on this endpoint. Omit it entirely, along with key/type/
gitBranch/customEnvironmentIds; never supply `value: ""` on the shared record.
The private `alias-scope-plan-v2.json` records the eleven known IDs and expected before/after
scopes. It is intentionally unauthorized and is not an auto-executing script.
If the API/integration requires changing or resubmitting Production's value,
stop and use a provider-supported scope operation instead. Do not fetch the
password to complete the PATCH. Sanitize response output to metadata only.

4. Re-list complete metadata. Assert the same IDs/types/Production memberships,
   Development memberships and no unexpected bindings; confirm only the approved
   target fields changed in the provider audit record. Never print or hash
   passwords. Verify the integration has not restored the Preview bindings.
5. Verify the effective authoring environment has no nonempty matching alias.
   Existing deployments retain their old environment; project metadata alone
   does not remove credentials from a running deployment.

This edits shared records' **Preview membership**, not their Production values
or Production membership. If policy forbids even this metadata edit, or other
Preview dependencies cannot be safely resolved, remain NO-GO until an approved
supported isolation method exists. A custom environment/project is not a drop-in
substitute: the reviewed guards pin this exact Preview/project/branch.

## Exact authoring environment to retain or set

Scope `Preview` + Git branch `codex/physcratic-authoring-completion`, with no
Production or Development target, for these existing seven and new allowlist:

| Name | Required value / action |
| --- | --- |
| `DATABASE_URL` | Retain the staging-only secret. Complete credentials for `ep-green-waterfall-b7qaw260` (app pooler allowed), `/neondb`, sslmode=require/verify-full. Verify locally without disclosing the URI. |
| `BETTER_AUTH_SECRET` | Retain the branch-only strong secret; verify it differs from Production without requesting/displaying either value. |
| `BETTER_AUTH_URL` | `https://financial-dashboard-git-codex-physcr-54d12a-neuterions-projects.vercel.app` |
| `NEXT_PUBLIC_SITE_URL` | Same exact stable origin, no trailing slash. |
| `AUTHORING_STAGING_BLOB_ENABLED` | `1` |
| `RESEND_API_KEY` | Retain the approved branch-only mail secret; no new key required by this plan. |
| `RESEND_EMAIL_DOMAIN` | Retain the verified sender domain only, without scheme or mailbox; sender is `accounts@<domain>`. |
| `STAGING_VERIFICATION_EMAIL_ALLOWLIST` | **Create the missing branch override**, containing the explicitly approved controlled test mailbox addresses only, comma/newline separated. Use Secret/sensitive type. Actual addresses must be chosen by the operator, never replaced with documentation examples. |

Leave the existing Preview Blob connection in place:
`AUTHORING_STAGING_BLOB_STORE_ID=store_3XHvtHs2UM4ZFD5d`, plus its managed webhook
public key and platform OIDC configuration. No manually entered OIDC JWT or new
Blob RW token. Leave the Production-capable shared Blob token unchanged; reviewed
author-media and legacy evidence operations cannot fall back to it in staging.

`BETTER_AUTH_TRUSTED_ORIGINS`: leave absent if absent. If inherited with extra
origins, add a branch-only Preview override equal to the exact stable origin
above. The app intentionally refuses other values. Do not replace an existing
Production origin variable. Do not manually spoof `VERCEL`, `VERCEL_ENV`, project
or Git identity; verify Vercel supplies the expected system values. No reCAPTCHA
variables or new product flags are needed.

## Create and verify the email allowlist safely

In this project's Environment Variables settings, create a **new** record named
`STAGING_VERIFICATION_EMAIL_ALLOWLIST`, type Secret, target Preview, Git branch
exactly `codex/physcratic-authoring-completion`. Privately enter the approved
controlled mailboxes (1–50 valid addresses, total raw value <=4096 characters).
No wildcards/domain-only entries/display names/trailing comma/empty entries.
The sender trims and lowercases exact addresses; plus aliases are distinct.
Keep the Preview-wide and other branches' existing records unchanged. Do not
use an unqualified upsert or edit the Preview-wide record by mistake.

For checking without sending mail, privately construct stdin JSON containing
`configured` (the proposed value) and `approved` (the independently approved
address array), and run from the repository root:

```sh
node --import tsx --conditions=react-server \
  work/vercel-env-remediation/check-allowlist-stdin.mjs < /approved/private/input.json
```

Keep that input outside Git, mode 0600; prefer an in-memory secret-broker pipe.
The checker invokes the real server recipient/link guard, refuses extra or
missing addresses, checks an unlisted synthetic recipient is rejected, and
prints booleans/count only. It never imports the sender or makes HTTP requests.
Never log the input, verification tokens, API keys or addresses. If Vercel's
Secret is write-only, absence from an env pull is not evidence about its stored
value; use metadata plus authorized runtime verification, not a permissive guess.

The old READY deployment is still `dpl_CairGvgTKpWzVX2QPGAYqcni9qYJ`; it does
not contain these local mail/origin/DB guards. Setting a branch allowlist alone
does not add enforcement to that old code. Maintain deployment protection and
keep live signup/resend acceptance closed until the reviewed source is deployed.

## Remaining execution order and gates

1. **Configuration approval:** approve the exact metadata diff, other Preview
   impact, integration persistence and branch allowlist. Execute only the
   approved config plan; verify effective values locally without sending any
   Production password/connection string to this assistant or audit logs.
   Record a nonsecret attestation that Production uses a different endpoint.
2. **Remote read-only approval/preflight:** use the preserved guarded collector
   and READ ONLY supplements. Require exact canonical v3, six-column ledger
   contract and all three historical hashes/source; complete auth prerequisites,
   function definitions, columns/defaults, constraints, trigger modes, index
   definitions/readiness, privileges/RLS and counts of every public table.
   The new independent findings (PG18.6, origin mode, 15 validated/enabled FKs,
   selected absent suffix objects and four zero counts) strengthen the evidence
   but do not replace that full comparison. Confirm `authored_student_rate`
   and every suffix helper/overload/object are absent. Legacy `solution_attempt`
   is distinct. Required result is EXACT_MISSING_SUFFIX, prefix/catalog=3,
   missing only 0004,0005,0006. Any partial/unledgered/drift state is a stop.
3. **Real backup/recovery approval:** follow `AUTHORING_STAGING_BACKUP.md` for
   explicit direct staging service, writer quiescence, one exported read-only
   snapshot, full PG18.6 custom dump streamed to approved encryption, separate
   keys/off-host custody and same-snapshot logical fingerprints. Restore the
   **real** archive on network-isolated local PG18.6; compare schema/ledger,
   counts/row hashes, sequences, large objects and legacy data. Review owners/
   ACLs/roles/extensions separately. Snapshot existence and four zero counts
   do not waive this. Establish an actually usable supported recovery target
   and real privileges/storage under the branch limit, or stay NO-GO.
4. **Candidate review/approval:** decide explicitly how to handle the branch's
   main lag; no automatic merge/rebase. Review all retained patches and this
   documentation delta; create a clean reviewed local commit when authorized.
   Bind the full commit SHA, exact package checksum, expected role, common
   advisory lock, quiescence and rehearsed recovery evidence to a private
   authorized copy of the approval template. Never enable flags on the packaged
   false template. Current operational package digest remains
   `2399168145f2fcc158983956e07eba44504e7611705d11ac3c8249ecbe06743b`.
5. **Migration write approval:** execute the preserved suffix-only runner from
   that committed package with the separately approved direct staging URL.
   Apply unchanged 0004→0005→0006 UP files and ledger rows in the same locked
   transaction; never reapply 0001–0003 or repair the ledger. Independently
   validate post-COMMIT on a new read-only connection, including source SHA and
   unchanged prior records. Failure before COMMIT rolls back. Uncertain COMMIT
   means inspect, not replay; no destructive DOWN.
6. **Push/deploy approval:** ensure automatic Preview deployment/exposure is
   controlled, then normal fast-forward push of the approved source commit to
   the exact authoring branch, with no force flags. Push the reviewed changes'
   contents, not private `work/` evidence, backups or credentials. Require fresh
   CI for that SHA (PG18.6, package/mail guard, types/lint/tests/build), browser
   evidence and matching READY Preview deployment. Failed CI stays unexposed.
7. **Actual hosted runtime verification, before write acceptance:** verify
   project/branch/Preview identity and reviewed deployment SHA, then make an
   authorized uncached read-only request to
   `GET /api/authored-problems/library?q=runtime-isolation-check` on the stable
   Preview alias, using protected access without tokens in URL/logs. This route
   is force-dynamic Node.js and imports the real guarded pool. A fresh successful
   application response demonstrates staging DB guard initialization and a read
   through its pinned DB options; it cannot initialize with a nonempty matching
   alias on the verified authoring Preview. A failure is a stop, not evidence of
   the wrong cause. Pair this with complete metadata and trusted effective-value
   inspection; do not use an old deployment, cache, protection login page, local
   CLI run or spoofed identity as evidence. No new public env/debug endpoint is
   needed. Only a later such deployment can close the hosted runtime gate.
8. **Separately approved live staging acceptance:** controlled test mailbox/user,
   stable-origin signup→verification→fresh sign-in, author draft/media/publish,
   library discovery, student attempts/history and explicit solutions. Verify
   mail reaches only approved addresses and Blob objects use only the private
   staging store with OIDC. Keep Production/shared Blob untouched. Do not send
   an unlisted live email as an experiment; the negative transport test is mocked.

Do not restore Production-capable Preview aliases or delete the branch allowlist
to make an old build run during rollback. Stop staging traffic and investigate
or return to an explicitly reviewed isolated release. Database recovery needs
its own approval and validated reconciliation, never a blind snapshot restore.

## Evidence and sources

This turn: 25 isolated local OS-environment checks and 8 recipient/database/origin/
mail-transport regression tests pass; no DB connection or external HTTP is made
by these tests. Earlier 314 tests, all three browser suites, PG18.6 upgrade/record
preservation, encrypted synthetic restore, TypeScript/lint/build evidence remain
preserved and are not relabeled as hosted runtime verification. No app code,
CI, migration, canonical baseline or previous package checksum changed here.

- [Vercel branch/environment management](https://vercel.com/docs/environment-variables/manage-across-environments)
- [Changes apply only to new deployments](https://vercel.com/docs/environment-variables/managing-environment-variables)
- [REST target-only PATCH fields; value optional](https://vercel.com/docs/rest-api/projects/edit-an-environment-variable)
- [Upstream CLI empty-value warning, not hosted runtime proof](https://github.com/vercel/vercel/blob/main/packages/cli/src/util/env/validate-env.ts)

**Current decisions: NO-GO staging migrations and NO-GO push/deploy** until the
stated configuration, complete preflight, real recovery and execution approvals
are in place. Local reviewed code remains ready; no fail-closed check was relaxed.
