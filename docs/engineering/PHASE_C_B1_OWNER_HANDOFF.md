# Phase C audit correction and B1 owner sequence

18 November 2026. Code-only preparation from main df96dd7994280bbf77b23210d4fff579ad1129ea.
No Production operation, provider setting, credential, flag or deployment change
is authorized by this document. Owner reports confirm the deployed source/alias,
Neon restricted role and direct authentication; serving-Function LOGIN remains
UNPROVEN. Do not repeat inconclusive log searches or completed credential setup.

The corrected activation audit checks any-column UPDATE capability and separately
checks the exact authored_problem UPDATE allowlist. The full role verifier adds
explicit baseline/batch-a/b1 contracts and rejects unknown modes. The new PG18.7
regression covers no-id Batch A, excessive direct/PUBLIC/table UPDATE, a missing
legitimate column, and staged B1 grants. Approved grant files and migrations are
unchanged. The old favourites proposal must not be replayed after correcting id.

## Ordered owner operations

1. **Serving LOGIN.** Existing approved Vercel/Neon telemetry must causally map an
   invocation of the actual serving deployment to its authenticated database
   connection, including pooled frontend authentication when applicable. Direct
   Neon login, a saved binding or generic activity is insufficient. No provider
   tooling or such correlation is available to this engineer. If existing
   telemetry cannot supply it, retain UNPROVEN and separately review a temporary
   protected server-side assertion before any owner-approved deployment. No
   public diagnostic route, raw identity/credential/error logging or new grant.
   Attestation must query session_user on the real application pool connection,
   bind evidence to the deployment ID and source SHA, expire automatically and
   have a removal plan. [Separate disabled-by-default implementation proposal](RUNTIME_LOGIN_ATTESTATION.md)
   requires its own review and owner deployment/configuration approval. No
   attestation instrumentation is deployed by these code changes.
2. **Target and role.** Privately confirm divine-mode-82940461,
   br-quiet-dawn-b7m2zrt3, ep-snowy-heart-b7c1220y, neondb, PostgreSQL18.7 and
   physcratic_runtime_app. Preserve the direct current_user/session_user proof,
   verified0001–0018 ledger and no privileged attributes/membership/schema CREATE.
   Record served SHA/alias/effective flags and independently usable deployment
   AND persistent binding recovery references. Preserve active Batch A.
3. **Separate revoke approval.** Compare the corrective file's SHA256 with
   `dcec5ac29b8a363fc2fd42742ffb7fce89e0a45522e4ffb25a505b5cfc7e28d2`.
   Verify UPDATE(state,published_revision_id,updated_at) already exists and there
   is no table-wide UPDATE or alternative inherited id authority. Obtain explicit
   approval of target, role and exact file. Only then may the owner execute
   scripts/activation/revoke-authored-problem-id.review.sql via existing private,
   TLS-verified administrative access, psql -X -w -v ON_ERROR_STOP=1. Only
   UPDATE(id) is revoked. No CASCADE or automatic grant repair.
4. **Post-revoke audit.** In the same metadata psql session set
   `physcratic.audit_contract='batch-a'` (session-local only). Run the activation
   inventory and full runtime-role verifier with runtime_role set to the approved
   role. Require row-lock capability true, id UPDATE false, the exact three
   legitimate UPDATE columns true, no unexpected effective column/table rights,
   all original35-table baseline and Batch A rights intact, and empty final
   verifier findings. Profile/practice absence is expected while OFF. Do not
   regrant id to silence a historical proxy. Observe42501/connection aggregates.
5. **Separate profile-grant approval.** Verify unchanged
   scripts/activation/profiles-grants.review.sql SHA256
   `ec8b59b652501014ec3f390b8fab7865ab51ecfa17581b68ff5b96c14215a1bd`.
   Obtain distinct approval of this file, actual target and role. Then the owner
   may execute it with the same private psql safeguards and runtime_role binding.
   It supplies exactly the two tables' SELECT/INSERT/UPDATE plus already-held
   schema USAGE. No DELETE/media/achievement/sequence/privileged-function rights.
6. **Post-grant audit.** Select session-local audit_contract='b1' and rerun both
   metadata files. Require six profile rights present and no final findings,
   id still false, all baseline/Batch A rights intact and forbidden rights absent.
   This grant-contract selection does not enable COMMUNITY_PROFILES_ENABLED.
7. **Privacy/support.** Name support/privacy/takedown and rollback owners,
   approve a response process while moderation remains OFF, and record error,
   latency/quota observation budgets. Accept that delivered public snapshots
   cannot be recalled. Retain rollback access independently of application state.
8. **Activation approval.** After independent code review/exact-release CI,
   serving-LOGIN evidence and the preceding checks, obtain separate approval of
   only COMMUNITY_PROFILES_ENABLED=true, exact served SHA/configuration,
   synthetic acceptance identities and rollback scope. Only that later approval
   may authorize the normal owner release mechanism. Leave authorship, media,
   achievements, practice, deletion and other future gates OFF. Batch A stays ON.
9. **Acceptance and rollback.** Under separately authorized synthetic writes:
   private creation followed by authoritative own read and guest API/page404;
   explicit publication with only five public fields; A/B isolation, stale-cookie
   rejection before B writes/quota, unverified/expired rejection, handle uniqueness
   and immutability, second-device withdrawal and fresh guest404. Check desktop
   and a physical phone, no-store/noindex and absent unrelated controls. Retain
   statuses/booleans/evidence references, not profile bodies or account secrets.
   Stop on privacy/isolation failure, wrong SHA/role, permission drift or sustained
   errors. Preapproved rollback disables only profiles through the owner release
   mechanism and verifies served API503/page404 with data retained. Flag-OFF is
   not erasure. No DOWN migration, DELETE, credential edit or automatic restore.

Current release remains NO-GO until independent review/CI and owner evidence and
approvals exist. Separate grants, deployment and activation are not authorized
merely because the engineering tests pass.
