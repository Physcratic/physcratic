# Production runtime role cutover proposal

14 November 2026. Preparation only. Source base
`1e8790a60b83f272f1685da60aa31e520ec8db1f` (main after #166).
Reconciled onto latest main `d95b861d512f6c1db4782d99cf7e2ab6937d8e03`
(#167), preserving concurrent insight-publication handoff records. Those changes
do not alter the inventoried runtime paths or permission dependencies.
No Production connection, SQL, role, grant, secret retrieval, configuration,
deployment, migration replay or feature activation was performed for this work.

## Decision and facts

The owner independently confirms Production uses `neondb_owner`, owns the
database and all 77 ordinary tables, has no restricted application LOGIN, and
has verified all 18 B6 migrations on PostgreSQL18.7. This is owner-supplied live
evidence, not a new connection by this task. #164 is merged and owner-confirmed
served. Source defaults remain OFF; effective flags must still be recorded.

Propose one new role, **`physcratic_runtime_app`**, for the current application.
It is not an observed existing identity. Keep `neondb_owner`, every table owner
and all privileged SECURITY DEFINER owners unchanged. Do not grant memberships,
reassign ownership, modify shared PUBLIC/default ACLs or bootstrap future roles.

This closes the owner-credential blocker in
[B6_RUNTIME_PERMISSIONS.md](B6_RUNTIME_PERMISSIONS.md). That document's statement
that the current role is unknown is superseded by the owner's inspection above.
[POST_B6_ACTIVATION.md](POST_B6_ACTIVATION.md) remains the later statistics
activation procedure. Its favourites delta is NOT included here. No first
activation can precede the restricted-role decision and live acceptance.

## Exact current-feature manifest

[`permissions.json`](../../scripts/runtime-role/permissions.json) is the exact
35-table/column manifest with source references.
[`provision.review.sql`](../../scripts/runtime-role/provision.review.sql)
implements it; the independent JSON/SQL/effective-ACL comparison is rehearsed.

| Current path | Required rights and important boundaries |
| --- | --- |
| Better Auth, signup/verification, account settings, sessions, reset, email budgets and database limits | user SELECT/INSERT/UPDATE, no user DELETE. account/session/verification/rateLimit SELECT/INSERT/UPDATE/DELETE for the generic adapter and cleanup. No auth protections or provider configuration change. |
| Drafts, publication, grading, private author media and explicit solution access | Explicit current authoring tables only. Mutable state/counters use listed UPDATE columns. Immutable revisions/parts/keys/media bindings/attempts/reveal receipts get SELECT/INSERT only. Draft cleanup and unreferenced media deletion retain existing guarded DELETE paths. |
| Existing saved solution grading and ELO | solution_attempt, solution_check, individual_rating_event SELECT/INSERT only. Current individual_rating counters have bounded column UPDATE. Evidence SELECT/INSERT/DELETE for reservation/failure cleanup. No mutable historical result grants. |
| Current contests and public rankings | Draft create/update/publish and snapshot replacement, registration/cancellation, immutable contest_attempt INSERT and public contest_rating SELECT. No runtime contest-admin membership management or contest-rating importer writes. |
| Existing progress | practice_attempt SELECT only for retained history. archive_progress SELECT/INSERT and note/answer/review/timestamp UPDATE. These are existing paths, distinct from OFF practice_check_* persistence. |
| Public problem discovery/readers | Static/generated collections need no new DB rights. Current authored public reads and search use explicit authored SELECTs and authored_discovery_terms(jsonb) EXECUTE. Private keys remain server-only through existing serializers. |
| Coaching | Active consultation/tutor links use Tally via lib/coaching/consultation.ts. No current app query writes coaching_inquiry. No grant. Keep the table and historical operator evidence intact; external consumers remain an owner check. |

Compared with the frozen `production-upgrade/role-grants.sql`, this proposal
omits all community/future practice/service rights, unnecessary legacy history
UPDATEs, contest-rating writes and the obsolete coaching INSERT. The template
is a reference, not an executable bootstrap. It remains byte-identical.

Three otherwise surprising UPDATE capabilities are necessary for PostgreSQL row
locks in actual executed code: `problem_rating(updatedAt)` for rating FOR SHARE,
`contest_admin(createdAt)` for administrator FOR SHARE/UPDATE, and
`contest_registration(createdAt)` for participant FOR UPDATE. These timestamp
grants permit metadata edits if application credentials are compromised, but
exclude identity keys, grading definitions and administrator reassignment. They
are deliberately disclosed for owner review; no replacement definer lock API or
runtime refactor is introduced. Other existing row locks are satisfied by the
manifest's required mutable state columns.

**Sequences:** none granted. All permitted current inserts use supplied text or
UUID IDs/defaults, not sequences. Audit/medal/deletion identity sequences belong
to disabled features or owner-executed definer code. No sequence blanket grant.

**Routines:** explicitly grant only `authored_discovery_terms(jsonb)` EXECUTE.
Preserve canonical PUBLIC EXECUTE on the read-only exact-row
`account_deletion_mutation_allowed(oid,text,jsonb,jsonb)` probe. It does not grant
erasure access. Trigger invocation needs no new caller EXECUTE grants; invoker
trigger queries need the manifest's table/column rights. Builtin UUID, JSON,
math/text, time and transaction advisory-lock functions use existing catalog
rights. Inventory existing PUBLIC invoker/trigger EXECUTE without changing it.
Unexpected public privileged definer EXECUTE is a blocker, not permission to
revoke shared rights silently. Keep existing fixed definer search paths/owners.

**Transactions:** preserve Better Auth's transactional signup rollback, grading
transactions, deferred publication constraints, UPSERT conflict reads and
transaction advisory locks. No new ordinary user DELETE for speculative cleanup.
No session-level lock, temporary-table or SET ROLE dependency is introduced.

This is application-service isolation, not per-user database isolation. Current
auth/session/origin checks still enforce tenant and author access. The service
necessarily reads private auth/key rows for its existing work; no public response
contract changes. PUBLIC database CONNECT/TEMP and catalog rights may remain;
CONNECT is the only new direct database grant. TEMP is not trusted-schema CREATE.

## Three approval phases

All mutation instructions below are review-only until the owner separately
approves their phase. This PR's merge is not that authorization.

### A. Provision an unused role, no Vercel cutover

Owner approval must name: project `divine-mode-82940461`, branch
`br-quiet-dawn-b7m2zrt3`, endpoint `ep-snowy-heart-b7c1220y`, database `neondb`,
PG version `180007`, role `physcratic_runtime_app`, reviewed candidate and exact
operator-manifest/provisioning-file SHA-256, and whether interactive SCRAM
credential setup is included. No deployment, binding change or feature grants.

Before approval/execution, complete a private record with serving deployment
ID/SHA/Production alias, effective OFF gates, current owner binding reference,
actual PUBLIC/default ACL inventories, expected object/routine ownership and
an owner-controlled recovery/rollback reference. No new snapshot/clone required.
Audit any external writer of coaching/practice/rating tables before assuming it
uses this application role. If it is an independent process, inventory its own
binding separately; do not overgrant this role to accommodate an unknown process.
`scripts/sync-problem-ratings.ts` is an out-of-band mutating operator script,
not an application route. It will intentionally lack its INSERT/configuration
UPDATE rights under the runtime role. Any authorized use requires a separate
operator identity/context; do not widen web-runtime privileges or run it now.

Owner terminal prerequisites: PowerShell7, psql16+, approved CA bundle, private
transcript-free terminal, trusted network/direct endpoint access and independent
Neon/Vercel console access. Use a clean LF worktree, for example
`C:\src\physcratic-runtime-role`, at the reviewed commit. Verify this package's
manifest hash and all entries per its README. No credentials in a repository,
command argument, terminal transcript, screenshot or shell history.

These are nonsecret PowerShell settings, from that checkout:

```powershell
$ErrorActionPreference = 'Stop'
$DirectHost = 'ep-snowy-heart-b7c1220y.c-13.us-east-1.aws.neon.tech'
$PooledHost = 'ep-snowy-heart-b7c1220y-pooler.c-13.us-east-1.aws.neon.tech'
$RuntimeRole = 'physcratic_runtime_app'
$env:PGSSLMODE = 'verify-full'
$env:PGSSLROOTCERT = Read-Host 'Approved local CA bundle path'
```

Independently confirm both hosts in the selected Neon project/branch console.
TLS verification failure stops execution. Do not downgrade TLS, use a different
endpoint, retrieve a secret into this chat or let a command print a URL.

Before provisioning, run only the metadata verifier as the owner using native
psql's hidden password prompt (or the existing SecureString/cleanup block in
POST_B6_ACTIVATION.md). This reads metadata, not student content:

```powershell
psql -X -W -h $DirectHost -U neondb_owner -d neondb -v ON_ERROR_STOP=1 -v "runtime_role=$RuntimeRole" -f scripts/runtime-role/verify.readonly.sql
if ($LASTEXITCODE -ne 0) { throw 'Read-only verification failed' }
```

Before creation, its final issue result must contain only `role_absent`. Inspect
all accompanying ACL/default-ACL/routine-owner inventories. Public app-table or
sequence grants, public DDL, unexpected privileged PUBLIC EXECUTE, wrong owners,
unqualified RLS on required tables, missing objects or role-name collision stop
Phase A. The new role must not be
created through a provider helper that grants extra administrator membership.
Confirm the connected administrator's actual CREATE ROLE and object-grant
authority; database ownership alone does not confer CREATEROLE. If the approved
owner lacks that authority, stop for an independently authorized Neon
administrator path, without granting new administrative rights as a workaround.

Only after exact-hash Phase A approval, the proposed mutation command is:

```powershell
psql -X -W -h $DirectHost -U neondb_owner -d neondb -v ON_ERROR_STOP=1 -v "runtime_role=$RuntimeRole" -v database_name=neondb -f scripts/runtime-role/provision.review.sql
if ($LASTEXITCODE -ne 0) { throw 'Provisioning failed. Do not bind Vercel.' }
```

The transaction rejects a wrong database/version, existing role or inherited
DDL/membership. It commits only explicit privileges, leaving password NULL.
No password login works yet. If it fails, close the connection so its transaction
rolls back, inspect the cause and stop. Do not turn a rerun into ALTER/repair SQL.

If approved credential setup is included, generate a unique high-entropy password
in the owner's trusted password manager (at least 32 random bytes, preferably
URL-safe encoding). Do not send it to Codex. In a private interactive psql owner
session with TLS verify-full, check/set session `password_encryption` to
`scram-sha-256`, then use `\password physcratic_runtime_app`. Its two hidden
prompts avoid plaintext SQL/history/server logs. Never type `ALTER ROLE ...
PASSWORD '...'` or pass a password variable to the script. Retain the password
and private connection template only in the approved secret manager. Clear any
clipboard history and close the terminal when finished. The application URL
must correctly URI-encode credentials; do not print it to validate encoding.

### B. Read-only acceptance, still no binding change

Repeat `verify.readonly.sql` as the metadata reader: final issue result must be
empty, with all inventories reviewed. Also reuse
`scripts/activation/runtime-readonly.sql` for the canonical ledger, constraints,
indexes, triggers and privileged-service boundaries using the proposed role
variable but the metadata-reader connection. Future-feature positive rights
are expected false and are NOT missing current-role dependencies. No B6 preflight
or migration replay; preserve all 18 hashes and original provenance.

Independently authenticate with the new credential on both transports:

```powershell
psql -X -W -h $DirectHost -U $RuntimeRole -d neondb -v ON_ERROR_STOP=1 -f scripts/runtime-role/identity.readonly.sql
if ($LASTEXITCODE -ne 0) { throw 'Direct LOGIN failed' }
psql -X -W -h $PooledHost -U $RuntimeRole -d neondb -v ON_ERROR_STOP=1 -f scripts/runtime-role/identity.readonly.sql
if ($LASTEXITCODE -ne 0) { throw 'Pooled LOGIN failed' }
```

Require database `neondb`, current_user AND session_user equal
`physcratic_runtime_app`, version180007, read_only on and verified client peer
certificates. Record pg_stat_ssl's SSL/version values and establish which segment
they describe, particularly behind the pooler. An unexpected or unexplained TLS
result stops acceptance; frontend verify-full is required independently of
backend SSL metadata. Check the exit code after each command and inspect actual rows.
Neither a SET ROLE session nor an owner URL qualifies. Direct TLS proof alone
does not prove pooled TLS or Vercel's selected binding. Do not invoke routines,
write sentinel rows, or test forbidden DML on Production as a permission probe.

Phase A fails acceptance if the role has any membership, ownership, superuser,
CREATEDB, CREATEROLE, REPLICATION, BYPASSRLS or trusted-schema CREATE. It must be
LOGIN and NOINHERIT. NOINHERIT alone cannot prevent SET ROLE; zero outbound
memberships are required. Unexpected effective table/column/sequence rights or
privileged definer EXECUTE also fail. Do not cure findings with blanket grants.

### C. Vercel binding cutover, separate approval and rollback authority

This phase is NOT authorized by provisioning approval. It requires actual
Phase B evidence, exact reviewed serving source/deployment, passing existing
CI, current OFF flags, actual Vercel scopes/aliases and the acceptance/observation
and rollback plan below. No feature activation accompanies the credential change.

1. Owner records the exact current Ready Production deployment ID, source SHA,
   aliases and securely recoverable owner DATABASE_URL reference. Keep the old
   owner credential valid and outside this repo/chat. Ensure out-of-band Vercel
   owner access works independently of application sign-in. Verify existing
   recovery evidence. Do not create a Production-data clone.
2. Privately inventory all relevant variables and binding scopes, including
   Production versus Preview/Development/custom environments, branch overrides,
   integration-managed variables and unused PG/POSTGRES/DATABASE_URL aliases.
   Source uses DATABASE_URL for ordinary Production. An owner alias still
   exposed to Functions defeats full credential separation even if unused.
   Plan its removal with separate explicit scope; never retrieve secret values
   into Codex or alter shared integration settings to force a replacement.
3. Construct the new pooled URL in the owner's approved secret tooling, using
   exactly the confirmed pooler host, neondb and new role/password. For current
   node-postgres use `sslmode=verify-full`; retain/review other required provider
   parameters privately. No rejectUnauthorized=false or libpq downgrade option.
   Server SQL SSL=true is only one part of client certificate validation.
4. After the owner approves the exact delta and deployment mechanism, replace
   ONLY Production DATABASE_URL through Vercel's private sensitive-variable UI
   or approved secret workflow. Do not change Preview/integration, auth secrets,
   URLs/cookie domain, mail/captcha/Blob bindings, flags or firewall rules. A
   change saved in project settings does not update an existing deployment.
   Preserve Production `rule_b6_maintenance_hold_6TpahO` (owner-reported Log)
   and Integration `rule_b6_integration_maintenance_hold_sI1uqr` at their observed
   settings; inspect Integration independently rather than assuming its hold
   has been released. Neither rule is part of this cutover delta.
5. Owner releases the approved source/configuration through their approved
   Vercel mechanism. This task triggers nothing. Do not buy a seat, bypass a
   Hobby-plan block, README-trigger or manually redeploy a blocked commit.
   Check candidate Ready state, build/source SHA and actual Production alias.
   A preview success or green GitHub status alone does not prove this binding.
6. Record redacted runtime-identity evidence for the serving deployment using
   existing approved operational access/provider connection metadata. Confirm
   its selected credential is the new role, not just a successful owner probe.
   Do not add a public diagnostic endpoint or log URLs/passwords. Where pooled
   server metadata masks frontend identities, obtain provider-supported binding
   evidence; do not treat ambiguous session attribution as proof.
7. Vercel Functions keep pools per warm process (current max5); old deployments
   and in-flight requests can retain owner-backed connections during transition.
   Existing Better Auth sessions live in the same database, independent of the
   PostgreSQL username. Preserve auth secret/origins and sessions; do not log
   everyone out. Validate existing cookies as well as newly authenticated ones.
   Allow the approved drain/observation interval and inventory old deployment
   aliases/access before claiming no owner credential remains in runtime.
8. Neon transaction pooling must use the new LOGIN as the frontend identity.
   Do not depend on session SET ROLE/search_path, backend PID stability, temp
   state or named session locks. Existing explicit transactions, SET LOCAL,
   unnamed queries and advisory_xact_lock semantics are preserved. Connection
   limits/timeouts and scale must fit Neon/Vercel quotas; do not blindly add a
   low role connection cap or change pool sizing in this cutover.
9. Execute only the separately authorized manual acceptance below and observe
   agreed error/latency/connection budgets. Any current-feature permission error,
   auth/privacy regression, wrong role/host/SHA, unexpected gate, missing result
   or ambiguous success stops rollout and invokes the approved binding rollback.
10. Retire old owner variables/old deployment access only after owner signoff and
    a separately scoped credential-cleanup decision. Do not revoke/rotate the
    owner or terminate sessions as part of provisioning/cutover preparation.

## Independent binding rollback

Designate a named rollback owner, time budget, trigger thresholds and exact
rollback deployment/configuration before Phase C. They need Vercel owner access
and the securely retained original owner binding, independent of app access.

1. Stop acceptance writes and expansion. Record failing deployment ID/SHA and
   redacted error codes; never log connection strings or submitted work.
2. Owner restores the previous Production DATABASE_URL in project settings using
   the approved secret reference. This prevents later deployments from silently
   reusing the failing setting; it does not fix the currently serving deployment.
3. Through the separately approved rollback mechanism, owner returns the alias
   to the recorded previous Ready deployment whose immutable configuration is
   confirmed owner-bound, or releases the approved rollback configuration at the
   approved source SHA. Do not assume promoting an arbitrary old code SHA restores
   environment values. A blocked rollback deployment requires owner escalation,
   not billing/deployment bypass. This is why a qualified rollback target is a gate.
4. Confirm actual Production alias, deployed SHA, effective original database
   identity, still-OFF flags and existing-session/current-feature recovery.
   Saved settings or a healthy preview are insufficient. Old/new warm processes
   may coexist while traffic drains; record the end state and limits explicitly.
5. Leave schema, data, owners, the new unused role, prior successful writes,
   migration ledger and both firewall controls intact. No DOWN, counter repair,
   replay0016, install0019, data restore, role drop or automatic credential revoke.
   Provisioning failure before binding needs no application rollback; stop with
   the role unused. Any further SQL/credential cleanup needs separate approval.

Rollback temporarily restores the known owner-credential risk. Keep a dated
follow-up and private exposure inventory rather than claiming separation is done.

## Manual real-environment acceptance, separate write scope

CI is authoritative for implementation behavior. These journeys prove provider,
deployment and binding facts CI cannot supply. GET/auth checks can refresh a
session or consume a limiter; they are not guaranteed read-only and belong in
approved Phase C, not Phase B. Use named synthetic accounts/fixtures only.

- Existing signed-in cookie still loads its account/dashboard; a second device
  and fresh sign-in work. Check refresh and signout. New signup requires real
  captcha and verification mailbox delivery. Verify reset and the two-address
  email-change approvals with designated addresses, without weakening checks.
- Author creates/edits one approved synthetic draft, uploads a private file,
  publishes, reads it publicly without a private URL/key, grades a designated
  attempt and performs an approved explicit solution reveal; unpublish retains
  historical records/media. Unreferenced upload cleanup works. Blob/mail provider
  authorization is unchanged and remains a real-environment gap until observed.
- Existing saved solution/rated check records the expected authoritative result;
  duplicate retry does not create another rating event. Archive note save/reload,
  legacy history, public collection and rankings load. New practice_check saving
  remains OFF. Do not generate arbitrary rated work for real users.
- Designated existing contest admin can load/manage only an approved synthetic
  fixture; approved participant can register and submit with a retained result.
  Do not alter a live student contest or import ratings merely to test the role.
- Coaching consultation/tutor links reach the approved Tally forms. No database
  INSERT test or real-person form submission is needed. External form processing
  needs its own approved test if delivery evidence is missing.
- Profiles/favourites/statistics/new practice/deletion/discussions remain OFF,
  with controls absent and existing disabled contracts. Never probe deletion
  through a live DELETE/POST. Reuse existing code evidence for security cases.

Require matching authoritative results, no current-path 42501 errors and the
owner-agreed latency/error/quota budgets throughout the observation interval.
Record these budgets and account/fixture identifiers privately before approving
the writes. Do not accept an unrelated HTTP200 as proof of the new credential.

## Focused engineering evidence and remaining gaps

The existing PG18.7 real-LOGIN suite from #164 covers successful sign-in, failed
signup transaction compensation without user DELETE, authored creation/publish/
grade, favourites account-switch guards, profile consent/visibility and denied
privileged operations. Existing full CI/account/media/grading suites are reused,
not rerun. The new role has no future-feature grants from that rehearsal.
Existing source-base main CI is green at
https://github.com/Physcratic/physcratic/actions/runs/43588374526
(`1e8790a…`). This is baseline evidence, not exact-head CI for this new proposal.

New focused rehearsal: Node22, isolated synthetic PG18.7 database and NOLOGIN
owner, actual LOGIN application connection, unchanged 18 canonical migrations.
Six tests pass (parent plus five focused subtests): exact manifest/effective
column ACLs and rejection of a deliberate extra grant; wrong-target/replay
refusal; successful signup/verification/refresh/reset/signout without identity
DELETE; rating and contest lock dependencies; narrow authoring/media/publication/
solution permissions/receipt dependencies; existing progress/public reads and
denied future/immutable operations. Relation and routine ownership/search paths
remain unchanged. Memory mail/Blob fixtures only. No real-service credentials.

CI adds only this focused process/checksum step to the existing PG18.7 job;
the existing activation/operator and statistics/profile browser coverage remain.
Because ci.yml is listed in the prior activation manifest, only that entry is
rehashed there. The frozen B6 package and all migration bytes are unchanged.
Exact candidate, PR/check status and artifact digests belong to the delivery
handoff, avoiding a self-referential checksum in this document.

Gaps: actual PUBLIC/default ACLs and live routine owners/search paths, role
creation authority on Neon, new direct/pooled SCRAM+verified TLS, serving Vercel
scope/credential/alias evidence, active deployment drainage, provider delivery,
production volume, rollback availability and observation budgets. No Production
clone is needed or authorized. An independent review/owner approval is still
required; synthetic success does not certify live access or activation.

**Verdict:** GO for review of this bounded provisioning proposal. NO-GO for
executing it until exact-hash Phase A approval and live read-only preconditions
are complete. NO-GO for binding cutover until Phase B passes and Phase C is
separately approved. No feature activation is requested.
