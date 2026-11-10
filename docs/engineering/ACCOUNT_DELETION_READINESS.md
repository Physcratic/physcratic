# B5 account deletion readiness

10 November 2026. Inspected main `b1db1777db683d87ea121b9fbd16686f7750a2f5`, after B1, B2A, B2B, B3 and B4 merges. **NO-GO for a general account-deletion implementation, B5 merge or persistent-progress activation until the owner resolves the dispositions below.** This bounded change adds a regression for the existing disabled state and records the actual blockers. It does not implement deletion or authorize Production work.

## Existing authority and behavior

[PRACTICE_PROGRESS.md](PRACTICE_PROGRESS.md#approved-retention-policy-and-remaining-activation-prerequisites) approves preserving active-account practice history and erasing associated practice history through controlled verified account deletion, with a narrow ordinary-immutability exception. It does not establish a disposition for authored submissions, published material, verification evidence or staff/moderation audit identities. No backup-expiry or legal-hold policy is invented here.

`createAuthOptions` in `lib/auth-config.ts` does not enable Better Auth `user.deleteUser`. There is no application deletion UI or custom deletion endpoint. Better Auth 1.7.14 provides POST `/api/auth/delete-user` and GET `/api/auth/delete-user/callback`, but the configured feature is disabled. The new real-auth PostgreSQL regression confirms that authenticated, unauthenticated, forged-account, token/callback and repeated requests cannot erase either synthetic account, its credentials/sessions or saved practice records. The ordinary runtime test role has no DELETE permission on practice attempts.

`PRACTICE_CHECKS_ENABLED` remains default OFF. Migration0017 remains explicit operator installation only. No startup, build or request installs a migration. No new deletion flag, privileged function, migration, grant, runtime handler or activation path is introduced by B5.

## Actual account-data graph

| Data class | Current protection or gap | Required disposition before implementation |
| --- | --- | --- |
| Practice/Arena checks | 0017 `practice_check_attempt.user_id` RESTRICT, immutable attempt trigger, and part-to-attempt RESTRICT. Per-user rate rows cascade. | Erasure is approved, but it needs a narrowly authorized atomic exception. Do not grant ordinary DELETE or disable triggers. |
| Authored student attempts and solution reveals | 0004/0005 user RESTRICT, immutable history, immutable revision/part references and recorded assistance. `AUTHORED_STUDENT_SUBMISSIONS.md`, SQL/migration safety, explicitly reserves account retention/deletion for a separately reviewed design. | Decide whether account deletion erases these records under a new exception, or retains irreversibly de-identified records with defined effects on historical completion/assistance. Practice-only approval does not choose this. |
| Authored publications, revisions, permissions and private media | 0001 owner RESTRICT and immutable published revisions, 0003 retained media/revision bindings, 0005 `approved_by` RESTRICT and nondeletable permissions. Other students may reference the revisions. | Decide publication withdrawal/continued availability, rights attribution, retained private keys/media and owner responsibility. Existing FK mechanics do not authorize deleting other students' history or transferring ownership. |
| Public profile/media, favourites and comments | Profile and ordinary preferences/favourites cascade. 0008 media references the profile with RESTRICT and requires tracked retire/delete transitions and private-object cleanup. 0013 intentionally permits comment author SET NULL. | Preserve existing comment anonymization. Account removal must reconcile private media/object cleanup without silently orphaning files or claiming network/object deletion is one SQL transaction. |
| Medal proofs and staff/audit identities | 0010 claimant/staff RESTRICT, reviewer/audit references, immutable proof/audit and role history. Setting a staff role to none does not remove its identity reference. | Decide retained evidence and identity treatment. Existing instructions preserve proof, case and staff/audit history. Do not silently erase or reassign these records. |
| Moderation cases/evidence | 0014 permits reporter/appeal FK anonymization but retains cases, immutable evidence/audit and raw actor IDs in other fields/JSON. | Define which identity links remain or are de-identified while preserving required evidence. An auth-user DELETE alone is not an erasure audit. |
| Other account-owned data without a user FK | Current ORM has FK-free userId columns in solution attempts/evidence, legacy practice/archive progress, contest participation/results and individual rating records. 0016 also creates FK-free contest owner columns. | Specify cleanup/retention for private solution/evidence and public/historical contest/rating identities. Inventory owner columns and object registries as well as FKs. |

Auth sessions and credential accounts have user cascades. This does not make the rest of the graph safe. Deactivation or retaining a live auth identity to satisfy RESTRICT is not account deletion.

## Disposable failure proof

The installed Better Auth 1.7.14 `internalAdapter.deleteUser` removes sessions and credential accounts before deleting the user. Its method does not wrap those operations in a transaction. A separate synthetic diagnostic deliberately enabled the native facility only in an isolated PostgreSQL fixture, using real signed sessions, the production authoring/submission/practice factories and actual0001–0005/0017 migrations:

| Fixture | Native response | Independently queried final state |
| --- | --- | --- |
| User with an authored attempt | 500 | User and immutable attempt remain, but its credential and session rows are gone. |
| User with a practice check | 500 | User and immutable check remain, but its credential and session rows are gone. |
| User with FK-free private evidence | 200, deletion success | Auth identity/credentials/sessions are gone, but the private evidence row remains. This fixture uses the ORM's same FK-free owner shape, not a full legacy migration rehearsal. |

An unrelated account remained unchanged in every case. Production configuration was never enabled. The diagnostic is evidence against naively enabling the native facility, not a regression that requires unsafe behavior forever. A practice-only `beforeDelete` cleanup hook would not solve the remaining FK/retention graph or share a transaction automatically with subsequent adapter calls.

## Owner decisions and B6 sequence

The next action is an owner policy decision, **before implementation or activation**:

1. Decide authored attempt/reveal erasure versus de-identified retention, and published material/private-media disposition when its author leaves. Retaining published content and other students' history requires a reviewed ownership/identity design. Do not infer a licence or transfer from the existing schema.
2. Decide verification/staff/moderation evidence and identity retention, including reviewer references and identities in audit JSON. Preserve current immutable evidence until that disposition is approved. No retention duration or legal hold is assumed.
3. Decide cleanup/retention for other private account records and external objects. Prefer explicit erasure of unnecessary private data and minimal, de-identified retained evidence where the owner requires retention. This is a recommendation for a decision, not an adopted policy.

After those decisions, implement and qualify one complete verified workflow. Reuse Better Auth authentication/password or confirmation protections, but require server-owned identity, atomic database cleanup/identity removal, narrowly scoped privileges, immutable ordinary use, repeat/concurrency/failure safety and explicit external-object completion handling. Keep the feature default OFF until reviewed schema/runtime permissions are installed and tested. Do not treat the present guard regression as an implemented lifecycle.

Only after that implementation passes may the activation phase:

- Confirm reviewed deletion and progress migration IDs/checksums, installation order and least-privilege grants. No new migration ID is reserved by this readiness PR.
- Verify actual provider backup retention, expiry, restore behavior and post-restore erasure handling. Do not promise immediate backup deletion.
- Identify the exact Production database/branch and immutable migration ledger, using separately authorized operator evidence.
- Establish recovery and application rollback. Default-OFF gates stop exposure, and populated history must not be erased to force a down migration.
- Qualify synthetic accounts for save/replay/reload, isolation, deletion and injected failure, with effective restricted runtime privileges and the installed schema.
- Obtain separate owner authorization for Production installation and activation. No Production SQL, grants, roles, settings, flags or manual deployment belongs to this B5 work.
