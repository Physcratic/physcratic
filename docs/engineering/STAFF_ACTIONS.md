# Staff actions

12 November 2026. Code-only implementation from main `b76a26b3fbb5423fee1428a64434f756dea85622`. No merge, installation, account-role assignment, feature activation or deployment is authorized by this delivery.

## Behaviour

The existing `/admin/moderation` dashboard gains a Questions and accounts section. Staff look up a community question by UUID, or a user by stable account ID or opted-in public @handle. Account emails, private names, drafts, answer keys and storage locations are never returned. No public account search or staff-role assignment endpoint is introduced.

| Action | Moderator | Administrator |
| --- | --- | --- |
| Remove a community question | Yes, independently | Yes, independently |
| Restore a question's publishing permission | No | Yes, independently |
| Ban a regular account | Yes | Yes |
| Unban a regular account | No | Yes |
| Ban self or another staff account | No | No |

Removal records a separate moderation restriction and archives the problem without clearing its immutable revision pointer or deleting student attempts. Existing publication checks already exclude archived problems from the reader, library, new submissions, worked solutions, public media, statistics and current progress. Author publication takes the existing problem lock and refuses active restrictions. A database trigger also prevents republication, including after the new feature gate is disabled. Restoration clears the restriction but leaves the question archived. The author must explicitly publish again. It never reverses an author's subsequent unpublish operation.

Banning revokes every existing Better Auth session in the same transaction as the restriction and audit. New session creation takes the same user-row lock and refuses banned accounts. A gated Better Auth session hook provides a useful error before the SQL backstop, and the shared submission session adapter checks active bans. Unbanning creates no session. A new sign-in is required. Banning does not delete an account, alter historical results or automatically remove its questions. Already delivered content cannot be remotely recalled, and an application request authorized before a ban may finish.

Every mutation binds target, version, new state and a required reason. SQL checks current locked staff authority, protects self/staff accounts, serializes on the target and rejects stale or duplicate decisions. Restriction records have no runtime mutation grants. Evidence uses the existing moderation audit and numeric ID pagination. Its existing 0018 actor/target inventory and redaction path remains authoritative. User restrictions cascade on actual account erasure. Reasons must exclude reporter identities and private evidence.

The UI confirms a fixed decision before sending, clears private details on account remount, blur/hidden and periodic access expiry, and requires reload after success or an uncertain failure. Older audit pages cannot submit decisions. Controls use existing Button/Input/Textarea components and project tokens.

## Installation prerequisites, separate operator work

`COMMUNITY_ACTIONS_ENABLED=true` additionally requires `COMMUNITY_STAFF_ENABLED=true` and `COMMUNITY_MODERATION_ENABLED=true`. The dashboard also retains its existing moderation UI gate. All new controls default OFF. Disabled routes return 503 before loading database/session bindings. No existing discussion production lock is removed.

Additive `0019_staff_actions.up.sql` requires the selected trusted schema's Better Auth user/session tables, authored tables and 0014 moderation routines/audit/limiter. All privileged references are schema-qualified, with trusted schema, pg_catalog, then pg_temp. Earlier migrations and pinned operator upgrade packages are unchanged.

Up SHA-256: `8b1c43f5108e5df2cfb2d5133c209c480e2722f247a0764c4ab81bf0b8d038c5`.

Use the existing reviewed operator migration procedure, explicit owner connection, common migration advisory lock, ledger/hash checks, backup/recovery point and bounded transaction. Never run from application credentials or automatically at startup. Recheck open PRs for migration-number conflicts before installation. Runtime prerequisites, with the actual existing role substituted by the operator:

```sql
GRANT SELECT ON community_restriction TO confirmed_runtime_role;
GRANT EXECUTE ON FUNCTION community_restriction_decide(text,text,text,integer,boolean,text) TO confirmed_runtime_role;
```

Retain existing least-privilege SELECT on users, authored problems/revisions and moderation audit, UPDATE(id) used for row locks, moderation-limiter rights and existing Better Auth session permissions. The migration owner must have the underlying user/staff reads, problem updates, session deletes and audit inserts required by the functions. Do not grant runtime restriction INSERT/UPDATE/DELETE/TRUNCATE, audit mutation, trigger-function execution, schema CREATE, ownership or operator membership. Review inherited/default/PUBLIC permissions independently.

Role assignment continues through the existing audited operator-only `scripts/community-staff.sql`. No account or role is assigned by this task. Staff need individual accounts. Do not place credentials in source or share a moderator login.

Rollback disables new actions but preserves existing restrictions. The down migration deliberately retains the schema and guards. Removed problems remain archived, banned users remain unable to sign in, and history is retained. Restoring access requires an explicit administrator decision, not a feature toggle or rollback.

## Verification and limits

Focused contract/gate and disposable PGlite 0.5.16 SQL/API tests pass, including restricted runtime permissions, bans/session revocation, publication backstop, stale versions, admin-only restoration, audit pagination across numeric IDs, temporary-table staff forgery and fail-closed down migration. This is an isolated minimal predecessor fixture, not qualification of the complete installed PostgreSQL schema. The test also runs against CI's disposable PostgreSQL 18.6 using `AUTHORING_TEST_DATABASE_URL`.

Changed entrypoints pass TypeScript with the installed project dependencies and read-only fallback for unchanged source. Focused lint has zero errors/warnings. Chromium passes 48 actual-component checks at 375px/1440px in light/dark, including reason validation, fixed confirmation, cancellation/focus, stale-response recovery, admin-only restoration, literal XSS, hidden/account-switch disposal, zero axe violations and no overflow. The transport is mocked independently of the SQL/API suite. The portable regression is `tests/staff-actions.browser.cjs`, added to the existing community browser job.

Full frozen install/build and complete repository checks are not claimed locally: this Windows environment blocks network cloning and package-store writes. Exact-head GitHub CI on [PR #156](https://github.com/Physcratic/physcratic/pull/156) is authoritative for the complete checkout. Initial-head standard typecheck/unit/build and public-library browser passed. Initial PostgreSQL qualification found a test-fixture role-reset error, corrected by using the dedicated owner connection for operator mutation. Initial existing moderation UI browser timed out on its publication-withdrawal report form. Neither failure is called green or suppressed. Final-head CI evidence is recorded on the PR. No physical-device, external-provider, real account or production verification is claimed.

Before activation, independently review the security changes, run full installed-schema/auth/session/reader integration on disposable PostgreSQL, verify effective runtime grants and account-erasure compatibility, complete the existing operator/privacy/provider prerequisites and obtain a separate activation decision. Do not enable Community discussions as a side effect.
