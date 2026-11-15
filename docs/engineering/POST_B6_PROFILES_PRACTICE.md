# Batch B: text profiles, authorship and practice decision

14 November 2026. Separate from [Batch A](POST_B6_ACTIVATION.md). No activation,
provider, role, migration or deployment action is authorized. Images, medals,
achievements, moderation, discussions, 0019 and account deletion remain OFF.

## Text-profile integration correction

The real-LOGIN PG18.7 rehearsal reproduced a first-profile PATCH from A's stale
form after the cookie switched to B. The original route created a public profile
for B and returned 201; the client detected the different userId only after the
write. That is a consent/account-binding defect, not a missing feature.

Own GET/PATCH now requires rejection-only `X-Community-Account` matching the
authenticated session. The server rejects 409 before profile reads, quota or
transaction. Settings and the setup prompt send the displayed account ID. The
client distinguishes ACCOUNT_CHANGED from a handle conflict and instructs a
reload. Public GET remains cookie-independent and unchanged. No identity is
authorized by this header and no new field becomes public.

## Profile release, after Batch A acceptance and separate approval

Use Batch A's exact SHA/binding/approval/evidence procedure. Record a separate
release note containing the reviewed/served SHA, effective flags, actual runtime
role, profile grant evidence, incident/takedown owner, approved synthetic account
scope and rollback configuration. Global exposure must be explicitly approved.

1. Review the current deployed SHA against the candidate containing the profile
   account guard. Keep all profile/attribution flags OFF while releasing that
   code through the approved owner mechanism. Existing stale JavaScript missing
   the header will fail closed 409; require a reload, never a temporary bypass.
2. Read-only audit `community_profile` and `community_profile_write_limit`
   SELECT/INSERT/UPDATE under the actual restricted runtime. No ownership/schema
   CREATE or profile DELETE is allowed. Existing publication reads are required
   for attribution. The small `scripts/activation/profiles-grants.review.sql`
   delta needs separate approval of exact target, role and file SHA-256 if any
   right is missing. Do not execute the full future-feature role template.
3. Name an actual support/privacy contact and profile-abuse/takedown owner before
   allowing public biographies. There is no profile-takedown staff endpoint in
   this scope, and moderation UI remains OFF. The owner must approve a case-
   specific administrative response process or retain the ability to disable
   all profile exposure. Such SQL is not authorized by this document. No0019
   implementation, report UI or new moderation feature is invented to close it.
4. Approve and apply **only `COMMUNITY_PROFILES_ENABLED=true`**. Leave authorship,
   media and achievements false. Confirm actual serving configuration, not just
   saved Vercel values. Settings gains the editor and optional setup prompt.
   Existing accounts have no backfilled profile. Private is the initial value.
   Settings may prefill the existing sign-up name; it is not published without
   save and explicit public visibility. Handle is permanent, normalized and
   unique; no rename promise. Profile image/badge controls remain absent.
5. Under separately approved synthetic writes, A saves a private profile and
   confirms guest `/u/handle` and public API404. A opts in, guest sees only
   handle/displayName/bio/educationLevel/favoriteTopicIds, then A withdraws from a
   second device and a fresh guest request returns404. Check desktop and a
   physical phone, guest/unverified Settings, existing account without a profile,
   optional Skip for now, and cookie switching while a first-profile form is
   unsaved. A stale-account request must409 without creating/editing B's profile.
   Do not log names, biographies or private responses. Keep proof references
   credential-free. Profile saves must be confirmed by a subsequent own read.
6. Stop on privacy/consent/isolation failure or sustained unavailable errors.
   The preapproved rollback sets profiles false and releases/verifies that
   configuration, leaving data intact. A previously delivered public page cannot
   be recalled remotely. A flag rollback is not erasure or a database rollback.

## Authorship release, separately after profile privacy acceptance

1. Confirm effective profiles true, authorship false and the current-publication
   read grants. The LOGIN rehearsal establishes that no achievement/medal rights
   are needed while those gates are OFF. Do not infer live grants from this test.
2. Obtain a separate owner approval for `COMMUNITY_AUTHORSHIP_ENABLED=true` with
   profiles still true. No other feature changes. Confirm served SHA/config.
3. Use an already-authorized synthetic publication. Arena's authored collection
   shows its opted-in profile display name/handle, while static Arena remains
   Published by Physcratic. The authored reader's name comes from its separate
   current-revision consent endpoint, not immutable publication JSON or auth
   identity. An empty/private/missing profile supplies no private fallback.
4. Withdraw visibility on device A. Reader device B clears on blur/hidden/error
   and expires the name within 15 seconds from the request start. Check a fresh
   reader request and refresh the collection and public profile. Collection and
   profile pages are request snapshots, not a remote-revocation broadcast. The
   guarantee is new-authorized reads plus the reader's bounded freshness, not
   erasure of screenshots, copied data or already delivered snapshots.
5. Missing rights/schema errors must produce unavailable/neutral behavior, never
   email, real auth name, user IDs, private work or cached cross-account profile
   data. Recheck after signing out and switching accounts. Do not intentionally
   break Production grants to exercise this; the focused local rehearsal does.
6. Rollback authorship false first if names are the issue. Rollback profiles
   false as well if profile exposure is unsafe. Owner verifies the serving
   configuration and reload behavior. Preserve saved profile rows and history.

## Practice blocker classification

| Requirement | Classification and actual conclusion |
| --- | --- |
| Durable own checks/progress and retry | Implemented in0017 and current server/client code. Exact-version sticky progress, immutable idempotent receipts, account header and unsaved guest fallback already have CI coverage. Not a new engineering blocker. |
| Controlled erasure of practice history | Implemented in0018 and account-deletion code/tests. Ordinary RESTRICT/immutability does not imply erasure is impossible: the privileged exact-row exception handles it. Do not edit historical FK/trigger SQL or grant runtime DELETE. |
| Account deletion UI must be public first | Not a technical dependency of the practice gate. But a functioning, authorized and qualified way to honor the existing erasure commitment IS a prerequisite. Keeping a route OFF without an alternative is not such a process. |
| Delivery channel while deletion remains OFF | Both current user and operator HTTP deletion routes use ACCOUNT_DELETION_ENABLED. They are unavailable with it false. There is no separately qualified out-of-band erasure CLI in this package. A promise to email support, direct broad DELETE or ad hoc function calls is insufficient. An owner-selected controlled backend process using the existing service contract must be reviewed/qualified, or practice stays OFF until a later separately approved deletion release. This is a missing operational delivery/qualification artifact, not a persistence algorithm defect. |
| Active-account retention | Owner already approved retaining progress/history while the account is active and controlled erasure on deletion. Do not demand a newly invented duration. Actual notices and implementation must match that policy. |
| Backup retention/expiry and restricted restore | Provider/operational facts still required. Obtain actual Neon retention/expiry, restoration access and how restored deletions are reconciled before traffic. No code/test proves immediate backup erasure or an invented provider promise. |
| Erasure permissions and policy | Existing service/functions require an explicitly approved policy row, proper dedicated roles/credentials and underlying owner rights. Ordinary runtime needs only the three practice-table grants, never deletion-service grants. Missing live evidence is a configuration/policy gate. |
| Private object cleanup | Relevant to any actual account-owned private objects, including pre-existing authoring media. Qualify the providers/namespaces actually in use. Do not require unused future profile/medal storage merely because0018 supports it; do not assume those namespaces contain no objects without authorized inventory evidence. |
| Evidence review and publication | Independent review is needed where actual mixed-subject records require adjudication, not a demand to launch discussions/medals. Existing safe default archives publications without a reviewed continuing-display rights decision. No new licence/Terms adoption is a prerequisite invented here. |
| Public deletion launch extras | Public passwordless/re-auth UI, full settings exposure, broad support staffing and future medal/discussion operations belong to their own release. The selected nonpublic erasure channel still must enforce identity, authorization, policy, applicable cleanup and restore obligations. |

## Exact owner decision to unblock a future practice proposal

Choose and document one option without changing ACCOUNT_DELETION_ENABLED now:

- **Continue holding practice** until the separately reviewed self-service/
  operator deletion release is operational. This preserves today's scope.
- **Commission and approve a controlled nonpublic erasure process** using the
  existing0018/service contracts, with the public gate remaining OFF. Name its
  operator, authenticated request/identity verification, service credential
  boundary, approved policy values, applicable independent review and cleanup,
  evidence of synthetic end-to-end erasure and restricted restore reconciliation.
  It requires its own scoped engineering/operational review. This package does
  not create a privileged backdoor or silently substitute a new procedure.

For either option, attach actual backup facts and the specific provider cleanup
evidence needed for existing account data. Only after that channel is ready may
the owner review a separate `PRACTICE_CHECKS_ENABLED=true` release. No requirement
to enable profile media, achievements, medals, discussions or0019 is added.

A future practice decision must also confirm actual runtime SELECT/INSERT on
practice_check_attempt and SELECT/INSERT/UPDATE on practice_check_part/rate,
exact served SHA and baseline flags, real session/email/origin behavior, phone
storage/keyboard behavior, pending-intent recovery and rollback ownership.
Own current-version history/dashboard must agree with a confirmed synthetic
receipt. Guest checks remain unsaved, and public static solve counts remain
unavailable. Rollback practice false retains immutable rows and original pending
keys. Do not treat an unconfirmed acknowledgement as a rollback or allocate a
new key blindly. These are existing contracts, not a request for another broad QA.

## Focused verification and review boundaries

The new LOGIN rehearsal extends only the uncovered real-route binding case:
private-by-default creation, first-profile stale-account rejection before quota,
exact public projection, current authored collection and reader attribution,
next-read withdrawal and unavailable behavior after a required SELECT is revoked.
Existing `community-profile.test.ts`, `authored-attribution.test.ts`, public-name
browser tests and account-deletion tests already cover their broader contracts.
They are cited rather than re-run as a comprehensive sweep.

See [the release-engineer review](POST_B6_RELEASE_REVIEW.md) for safeguards,
remaining evidence and ranked GO boundaries. Production readiness remains
UNKNOWN/NO-GO until the actual target prerequisites and owner decisions exist.

## Practice readiness evidence and owner gates, 15 November 2026

Audit base: `57286c4145bc39120465764f317aff0efe868ccb`. This section updates
provider facts without authorizing activation or superseding the existing
privacy/service contracts. PRs133/134 implemented persistence and UI integration.
The visible dashboard history uses `/api/problem-progress`, with explicit partial
source availability. It lists distinct current-version solved, in-progress and
not-graded problems. There are no placeholder correct/incorrect counters in
current main. `/api/dashboard` completion fields are null unless both sources are
available. Legacy practice attempts and reviewed archive notes are separate
statistics, never evidence of current all-part completion.

The current-catalogue defect was retained retired practice definitions in new
saves/counts. The correction excludes those identities from the default current
catalogue and preserves immutable history/exact retries. Per-version sticky
multipart correctness, unsupported/manual-only classification, account guards,
OFF gating and unsaved public checking are existing behavior, not new features.
Native imported archive checks intentionally remain unsaved. No historical work
that was never saved is reconstructed.

### Read-only live metadata, with explicit limits

Neon project `divine-mode-82940461` reports `history_retention_seconds=21600`
(six hours). Production branch `br-quiet-dawn-b7m2zrt3` is default/main, with
Vercel Production restrictions. Its automatic snapshot schedule is empty. The
snapshot list contains manual `snap-muddy-wildflower-b762d6kd`, created
13 November 2026 at 15:53:24 UTC. The response supplies no expiration, so its
retention/expiry is UNKNOWN. Independent November 2 pre-authoring/recovery branches
and archived integration still exist. A six-hour history window does not erase
those copies or establish a full provider backup policy. No snapshot, branch,
compute or setting was changed, and no restore or Production SQL was executed.

Current effective Vercel flags, database role/binding, negative privileges,
erasure-service credentials/policy and cleanup inventory are UNVERIFIED by this
read-only audit. Existing owner-reported B6 installation and owner binding are
historical evidence, not proof of a subsequent restricted-role cutover. Do not
retrieve credentials or infer grants from a successful public page or CI.

### Smallest acceptable owner choice

1. **Hold practice** until the separately qualified deletion release is usable.
   No new erasure implementation is required in this batch. Public and operator
   deletion HTTP routes remain unavailable while ACCOUNT_DELETION_ENABLED is OFF.
2. **Commission a controlled nonpublic delivery process**, keeping that public
   flag OFF. This requires a separate bounded implementation/review and operator
   qualification. Reuse the existing0018 `createAccountDeletionApi` and operator
   contracts. The subject must reauthenticate directly through the trusted
   channel, with verified recent session, current-password proof, account binding,
   trusted origin, original request nonce and limits. Support must not collect
   passwords or borrow sessions. No direct unguarded function/SQL invocation,
   staff impersonation, broad DELETE grant or public bypass endpoint qualifies.
   Unsupported identity/proof cases must stop rather than invent delegation.

Option2 is a proposal, not an implemented or qualified channel. Both options
require the remaining provider/runtime evidence before practice activation.
The owner must name the privacy/operator and independent reviewer, approve policy
purpose/legal basis/access and receipt/evidence/review/expiry limits, identify
applicable existing object providers and authorize synthetic acceptance scope.
No arbitrary retention duration or promise of immediate backup erasure is added.

### Bounded qualification, activation and rollback sequence

1. Bind a release record to exact reviewed code SHA, Production project/alias,
   Neon branch/database and observed restricted runtime identity. Verify0017/0018
   installation from existing approved evidence. Owner separately supplies
   read-only identity/ACL/ownership results using existing runtime-role artifacts.
   No SQL is authorized by this document. Ordinary runtime must not own tables,
   inherit owner/service roles, obtain broad DELETE or execute erasure functions.
2. Compare only practice rights: attempt SELECT/INSERT and part/rate
   SELECT/INSERT/UPDATE. If absent, prepare a minimal separately reviewed delta,
   exact target/role/file SHA and rollback authority. Do not execute the whole
   future-feature grant template or change immutable migration/trigger files.
3. Select and qualify the erasure channel before accumulating new progress.
   First rehearse entirely on disposable PostgreSQL with synthetic identities.
   Exercise existing session/password/account/recent-sign-in gates, immutable
   practice rows, other-account preservation, atomic failure, concurrent writes,
   durable receipt, private-object cleanup/retry and required independent mixed-
   evidence decisions. Preserve the default archive-publication fallback unless
   continuing rights have been reviewed. Keep public deletion OFF for option2.
4. Inventory all applicable retained copies and provider namespaces, including
   manual snapshots, historical branches and existing author media. Record actual
   retention/expiry, access controls, cleanup obligations and authorized restore
   procedure. Restore only to an approved isolated target under separate approval.
   Before any restored copy can serve traffic, reconcile all relevant deletion
   obligations, restrict access and verify the synthetic deleted subject does not
   return. Capture counts/booleans, target/SHA/checksum and receipt references,
   never answers, notes, raw account identifiers, passwords, URLs with credentials
   or object contents. A restore has not been qualified by this audit.
5. Only after independent evidence acceptance, obtain a separate owner approval
   for the exact `PRACTICE_CHECKS_ENABLED=true` change, serving SHA, restricted
   binding, acceptance accounts, observation budget and rollback operator.
   ACCOUNT_DELETION_ENABLED and all unrelated flags remain unchanged. This code
   release alone is not that approval. No migration or backfill is needed.
6. Under that separate authorization, verify saved correct/incorrect and multipart
   checks through the served app, dashboard refresh, second session, stale version,
   original-key uncertain-commit retry, A/B isolation, sign-out and unsaved guest
   fallback. Confirm actual own progress against the acknowledged receipt.
   Stop on account mismatch/leakage, unexpected rights, unqualified erasure,
   restore ambiguity or unconfirmed save. Do not edit counters to force a pass.
7. Roll back exposure by the approved flag-OFF configuration and normal owner
   release mechanism. Verify the serving configuration, disabled private routes
   and working unsaved public checker. Retain immutable rows and pending original
   keys. Flag rollback is not erasure, schema rollback or proof a write failed.
   No DOWN migration, automatic restore or reconstruction of historical progress.

An adjacent source audit found that legacy archive-note reads/writes lack the
rejection-only displayed-account header used by practice progress. Runtime
reproduction was not completed because independent review capacity became
unavailable. This is a separate, unqualified account-binding concern, not a new
practice-ledger defect or authorization to modify official problem content.
Track a bounded reproduction/security review before claiming full legacy-note
session-isolation readiness.

**NO-GO for Production persistence activation.** The delivery channel, approved
policy/provider/restore evidence, current restricted binding/grants, final release
review and explicit activation approval remain gates. No Production operation or
flag activation was performed.
