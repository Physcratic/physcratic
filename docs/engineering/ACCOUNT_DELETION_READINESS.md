# B5 account deletion readiness

10 November 2026, continuation after the owner's account-wide policy approval. Reconciled with main `18ed7a48bd421c6a37cac901aeb787041e5ca5b0`, preserving the merged IPhO and rating-band work. **B5 remains NO-GO for runtime implementation, merge or activation because the mixed-subject evidence disposition below cannot yet be implemented safely.** This is the explicit privacy stop condition in the owner's completion instruction, not a renewed objection to the policy already approved.

## Approved policy and current disabled behavior

The owner approves erasing authentication/profile PII, private drafts, practice history, personal authored answers/reveal ownership, preferences and other unnecessary private account data. Appropriately licensed published problems/revisions/supporting media, other students' work, genuinely anonymous aggregates and the minimum justified security/moderation evidence are preserved. A shared retained login identity is not deletion. Historical migrations must remain unchanged, any future privileged exceptions must be narrow, and database/Blob work must not be falsely described as one transaction.

`createAuthOptions` still does not enable Better Auth `user.deleteUser`. There is no application deletion UI or custom deletion endpoint. The existing real-auth PostgreSQL regression verifies own/unauthenticated/forged-account/token/callback/repeated denial with identities, credentials, sessions and saved practice data intact. The ordinary runtime fixture has no practice-attempt DELETE privilege. No deletion workflow, outbox, migration or enabling flag is added by this readiness PR. `PRACTICE_CHECKS_ENABLED` stays default OFF, and 0017 is not automatically installed.

The former broad authored/practice disposition questions are resolved by the new policy. Published-content rights have their own [prospective licence/consent design](PUBLICATION_LICENSE_PROPOSAL.md), which does not activate Terms or infer existing consent. Unknown existing rights would deny deletion before cleanup and keep the feature disabled, rather than silently discard published content. Rights uncertainty alone is not treated as a reason to avoid technical work. The independent mixed-subject privacy conflict below is the actual remaining stop.

## Remaining mixed-subject privacy boundary

A general instruction to retain the minimum justified evidence does not choose which identifiers or text may remain in a case concerning several people. Existing immutable storage deliberately mixes authors, reporters, reviewers and evidence subjects:

| Actual table/columns | Why automatic deletion or ID replacement is insufficient |
| --- | --- |
| `community_comment_evidence.body`, bound to `comment_id/content_version` | An exact historical comment can identify its author and describe other people. It can also be necessary evidence for another student's report/appeal. Removing the author's user FK does not redact the snapshot. |
| `community_report.subject/details/resolution` and `community_moderation_appeal.reason/resolution` | A report or appeal belongs to one person but may identify a different person, refer to their content and form part of another case. Reporter/appeal SET NULL only changes the relational identity. |
| `community_moderation_audit.reason/data/target`, `community_comment_review.reason`, `community_thread_lock.reason` | Free text and arbitrary JSON may contain identities outside the actor field. Matching raw user IDs or names cannot prove complete PII removal, and clearing whole payloads can destroy someone else's case evidence. |
| `community_staff_audit.reason/operator`, `community_medal_claim.certificate_name/reason/reviewer_id`, `community_medal_audit.reason/actor_id` | A departing reviewer can be identified in another claimant's proof/review history. Erasing the other claimant's evidence is not authorized by deletion of that reviewer. |

Sources: migrations0010 and0014. `community_immutable_audit` protects audit/evidence UPDATE/DELETE and0014 additionally blocks TRUNCATE. `community_case_guard` explicitly rejects case DELETE and preserves inputs while allowing narrow FK anonymization. These are established protections, not permission to retain personal information indefinitely.

The safe missing mechanism is **one of**:

- Verified operator redaction/adjudication for every affected mixed-subject case before deletion is allowed. It must identify the affected records beyond owner/FK columns, determine necessary third-party evidence, authorize specific redactions and leave an auditable completion decision without retaining the deleted identity unnecessarily.
- An explicitly defined, limited evidence-retention exception with the actual purpose, permitted data/identity fields, restricted access, expiry/review rules and rights-request handling. No period or legal hold is invented here.

Neither mechanism currently exists. Retaining identifiable originals indefinitely would violate the approved minimization policy, while generic structured-only replacement could destroy another person's evidence. A shared non-login principal, removing FK links or deleting personal attempt rows does not solve this. Therefore no privileged eraser, partial-success endpoint, new immutability exception or deletion migration is implemented. Policy approval resolved most prior questions, but this precise privacy/retention boundary still triggers the owner's explicit stop instruction.

The rest of the already-inspected graph remains relevant for the later implementation: authored0001–0005 ownership/immutable revisions and attempts, profile/media0007/0008, proof/staff0010, comments/cases0013/0014, FK-free solution/evidence/contest/rating/archive rows and practice0017. Future deletion must preserve published dependencies/other students' rows, erase private drafts/answers and use durable, auditable private-object cleanup. No repeat platform audit is required.

## Disposable failure proof

The installed Better Auth 1.7.14 `internalAdapter.deleteUser` removes sessions and credential accounts before deleting the user. Its method does not wrap those operations in a transaction. A separate synthetic diagnostic deliberately enabled the native facility only in an isolated PostgreSQL fixture, using real signed sessions, the production authoring/submission/practice factories and actual0001–0005/0017 migrations:

| Fixture | Native response | Independently queried final state |
| --- | --- | --- |
| User with an authored attempt | 500 | User and immutable attempt remain, but its credential and session rows are gone. |
| User with a practice check | 500 | User and immutable check remain, but its credential and session rows are gone. |
| User with FK-free private evidence | 200, deletion success | Auth identity/credentials/sessions are gone, but the private evidence row remains. This fixture uses the ORM's same FK-free owner shape, not a full legacy migration rehearsal. |

An unrelated account remained unchanged in every case. Production configuration was never enabled. The diagnostic is evidence against naively enabling the native facility, not a regression that requires unsafe behavior forever. A practice-only `beforeDelete` cleanup hook would not solve the remaining FK/retention graph or share a transaction automatically with subsequent adapter calls.

## Exact next action and B6 sequence

Resolve the mixed-subject boundary by specifying and qualifying operator adjudication/redaction, or the limited retention exception above. Review the prospective licence separately. Existing authors must not be treated as accepting it retroactively.

Then complete one default-OFF workflow with meaningful recent authentication, explicit confirmation, server-owned identity, transactional database erasure/de-identification, narrowly authorized immutable exceptions, replay/concurrency/rollback safety and a durable private-object cleanup outbox. A shared publication/audit principal must contain no closed-account PII and must be unable to acquire credentials, provider links or sessions. Licence checks must fail before cleanup where preservation rights are not established. Do not directly enable the demonstrated unsafe native deletion path.

Only after complete implementation and focused verification may B6 qualify reviewed migration/checksum/grant prerequisites (no new ID is reserved here), actual provider backup retention/expiry and restore-erasure behavior, exact Production database/branch and migration ledger, recovery/rollback and synthetic save/replay/isolation/deletion/cleanup-failure flows. Default-OFF gates stop exposure. Populated history must not be destroyed to force a rollback. Obtain separate owner authorization before installing0017 or any deletion migration, granting runtime permissions or enabling either feature. No Production operations belong to this PR.
