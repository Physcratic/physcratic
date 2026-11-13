# Post-B6 runtime permissions and transition proposal

14 November 2026. Source base main `31941d0ea1feca6bac93834d1b8fa75ce051ca5c`.
Preparation only. No Production SQL, role, grant, ownership or credential action.
The owner reports all 18 B6 migrations verified on PG18.7, flags OFF, Production
firewall Log. Integration may remain Deny. Inspect that state before using it.

## Runtime identity and what is actually known

Production `lib/runtime-database.ts` reads `DATABASE_URL`. It does **not** require
a particular username. The proposed role name must therefore come from the
deployed binding audit, not from a guessed `physcratic_app` convention. Only the
separately marked authoring Preview pins `physcratic_integration_app`; do not
reuse its binding for Production. `PHYSCRATIC_UPGRADE_DIRECT_URL` was an operator
connection and establishes nothing about the live application's current role.

If the application connects as the object owner, owner rights already supply
table/routine access even without explicit ACL entries. That can make positive
permission tests pass while defeating separation. If it uses a non-owner, the
B6 migration creates no automatic new runtime grants. Existing grants, inherited
rights, PUBLIC grants and current ownership are live facts not recoverable from
Git. The B6 review template was not executed automatically. No actual deployed
role or grants are claimed here.

## Required rights by feature

All rows assume schema USAGE and compatible existing auth/session permissions.
SQL is a proposal for a verified role, never a reason to widen existing rights.

| Feature | Exact dependencies | Excluded rights |
| --- | --- | --- |
| Favourites/statistics | Totals SELECT; favourite SELECT/INSERT/DELETE; favourite-limit SELECT/INSERT/UPDATE; authored_problem/authored_revision/authored_revision_part/authored_attempt SELECT; user(id,emailVerified) SELECT; authored_problem UPDATE(id) for publication row locks | No totals mutation, favourite UPDATE/TRUNCATE, trigger EXECUTE, profile/staff/deletion access |
| Text profiles | community_profile and community_profile_write_limit SELECT/INSERT/UPDATE | No profile DELETE, auth-identity mutation, media/store permissions |
| Authorship | Existing current-publication/profile reads | No auth identity join or private answers added |
| Practice | practice_check_attempt SELECT/INSERT; practice_check_part and practice_check_rate SELECT/INSERT/UPDATE | No attempt UPDATE/DELETE/TRUNCATE or erasure EXECUTE for ordinary runtime |
| Achievements, later | Exact invoker eligibility reads/EXECUTE from COMMUNITY_STATUS;0011 validation EXECUTE and approved-medal-view SELECT even when medals OFF | No activation bundled with profiles |

[`favourites-grants.review.sql`](../../scripts/activation/favourites-grants.review.sql)
contains only the first-row delta, in a bounded transaction. It is not a complete
new-role bootstrap or a revocation script. Preserve existing least-privilege
auth/authoring/contest rights when considering it. Do not execute the entire
`production-upgrade/role-grants.sql`, which includes future feature/service rights.

## Four trust domains

| Domain | Required boundary |
| --- | --- |
| Migration/function owner | Trusted administrator only; keep existing owners during the first runtime cutover. A new NOLOGIN ownership identity can be a later separately reviewed change. No owner credential in the ordinary app environment after approved cutover. |
| Application runtime | Distinct LOGIN with no superuser/CREATEROLE/CREATEDB/BYPASSRLS, no trusted-schema CREATE, ownership, or owner/deletion/operator membership. NOINHERIT alone is insufficient if SET ROLE membership remains available. |
| Deletion service | Separate connection, no owner inheritance or direct deletion-table DML. Only charge, receipt, open_request and execute signatures documented in ACCOUNT_DELETION_READINESS. Not needed or provisioned for Batch A. |
| Operator service | Separate connection with only charge/evidence_control/cleanup signatures. No ordinary runtime access. No new provisioning for Batch A. |

`community_favourite_guard` runs with caller privileges and needs the existing
publication reads/row-lock permission. The totals trigger is SECURITY DEFINER
with the trusted schema and pg_catalog followed by pg_temp. Runtime never calls
that trigger as a public API.0015 hardens privileged medal routines;0018 fixes
its routines to catalog/trusted schema/pg_temp and revokes privileged PUBLIC
EXECUTE. The PUBLIC `account_deletion_mutation_allowed(oid,text,jsonb,jsonb)`
boolean probe is deliberate and required by invoker guards. Do not revoke it.

Runtime cannot safely own a definer function, alter its trusted schema or inherit
its owner. Keeping existing function owners avoids accidental loss of their
underlying DML during cutover. Later ownership transfer requires an exact object
inventory and dependency rights, not REASSIGN OWNED or blanket grants.

## Minimal transition sequence, separate owner authorization at each mutation

1. Inspect deployed connection metadata privately. Under an authorized read-only
   session, use [`runtime-readonly.sql`](../../scripts/activation/runtime-readonly.sql)
   with the actual role. Connect independently using the actual runtime
   credential to prove current_user AND session_user, without SET ROLE. Capture
   TLS, memberships, owners, effective table/column/function privileges and
   default ACLs. The SQL now checks inherited column-only forbidden INSERT/
   UPDATE too; a false table privilege alone was insufficient in the earlier audit.
2. If the existing runtime is already restricted, preserve it and propose only
   missing delta rights. If it is owner-bound, stop feature activation. Prepare
   the exact new role/secret binding and current-feature grant inventory for
   owner approval. Grant only actual enabled auth, authoring, grading, contests
   and existing media dependencies, plus the reviewed Batch A delta.
3. Do not transfer ownership, change deletion services, revoke the old owner,
   enable features or change credentials in the same step. Qualify the proposed
   LOGIN role on isolated resources first. Retain owner-controlled recovery
   outside the application and record the approved previous binding securely.
4. The focused rehearsal below covers representative real routes and explicitly
   injects a credential-link failure during signup. The installed Better Auth
   transaction rolls the new user back with no ordinary user DELETE grant. This
   closes the earlier speculative compensation gap rather than widening rights.
   Existing broad account-flow CI remains the baseline; live sessions, provider
   delivery and complete deployed configuration still require owner evidence.
5. Only after exact role/binding approval, the owner performs a separately scoped
   current-feature cutover with all new flags OFF and checks live sign-in,
   existing account settings, authoring, grading, contests and provider access.
   A failure rolls back the approved application binding/configuration, not
   schema/data. Review success before the independent stats flag decision.

## Focused evidence and limits

`scripts/activation/runtime.pg.test.ts` creates a uniquely named disposable
database on guarded loopback PG18.7, trusted NOLOGIN owner and real LOGIN runtime.
It installs the unchanged 18-migration graph and reuses only the review template's
existing-feature grants plus the narrow favourites delta. Actual route exports
use the real singleton DATABASE_URL and Better Auth sessions. No injected user
adapter or owner SET ROLE substitutes for runtime authentication.

The test covers signup transaction failure without user DELETE, guest/stat reads,
own favourites, stale-account rejection before
quota, actual draft/create/publish/graded submission, verified authored solve
count and contest registration. It proves runtime denial of totals writes,
schema CREATE, immutable DELETE and privileged erasure EXECUTE, and unavailable
behavior after a required SELECT is revoked. It also executes the metadata SQL.
The setup owner uses SET ROLE only to install owned synthetic resources, never
as runtime identity evidence. It does not qualify live credentials, pooled TLS,
Blob OIDC, mail delivery, every legacy path or Production volume.

Existing `community-problem-stats.test.ts` already covers exact-version solves,
assistance, publication races, query budgets and idempotent totals. Existing B6
rehearsal covers representative grants through API factories. Those suites are
cited, not rerun. The new script stays outside the legacy PG18.6 CI test glob and
is explicitly run on 18.7 as documented in the activation runbook.
