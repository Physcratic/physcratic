# Problem Authoring alpha release: staging candidate

The accepted migration source is a87077ffef2a7191e137e6a3c3b9286ed4f041e4.
Canonical migration SQL0001–0006 and the reviewed release package are unchanged.
The package manifest SHA256 remains
a1e09cc5a6053367bbee7ce6cf15871461afd0bdac3dac8dd8e3668baf682d5e.
Migrations completed on staging and MUST NOT be rerun.

## Staging permissions completed

Only the five reviewed grants were applied to physcratic_integration_app on
Neon divine-mode-82940461 / br-solitary-thunder-b7h5q79t / neondb / PG18.6.
The exact grant source SHA256 is
8eb5a46a677679a8ba939517f8273b0640908bc62de4a22345e8d249561d2113.
The connector transaction retains all11 exact interior statements from the
reviewed SQL, including common advisory lock, guard, five GRANTs and verification.
Post-commit40 role-aware privilege checks match, grant options/elevated role/
schema CREATE/ledger SELECT remain denied, and the six ledger rows are unchanged.
Neon refuses owner SET ROLE to the app; no membership was added to bypass that.
Restricted-role API flows were independently exercised on disposable PG18.6.

The app uses only the exact direct or pooler host for ep-green-waterfall-b7qaw260,
/neondb and physcratic_integration_app, with verified TLS. An owner URL, inherited
PG/POSTGRES aliases, wrong branch/project/origin or shared-Blob fallback fails
closed. Production's existing connection/mail/storage policy is preserved.
Required branch Preview settings and the private staging store were rechecked.
The actual deployed binding must still be proven by a fresh Preview query.

## Reconciliation and Preview

Integrate with main60a4825212a67077c2d5dc5e668dad252df06653 and retain all newer
coaching, Arena, learning, auth, rating, Image/SWR, performance/CSP and smoke
workflow behavior. Current upstream smoke uses repository_dispatch and skips
codex refs; it is retained, not replaced with the older deployment_status policy.

Public sitemap and llms.txt use Production canonical URLs only when building
with the exact authoring Preview site origin. Auth and page metadata retain
that stable Preview origin. This fixes both actual manual smoke failures while
preserving Production/other Preview/development behavior. Local fonts retain
Inter and coaching's Bowlby One with licenses, avoiding network font downloads.

Run fresh CI and Preview acceptance against the resulting committed SHA.
Local tests use synthetic credentials and disposable PG18.6 only. Browser
harnesses inject verified sessions/storage, so their PASS does not claim real
signup, email delivery, login or Blob OIDC acceptance. The actual allowlist is
nonempty and branch-specific, but the connected inbox is a different mailbox.
Never broaden the allowlist or mark a user verified in SQL to bypass that gate.

Four existing legacy tables still deny the app SELECT/INSERT/UPDATE/DELETE:
individual_rating, individual_rating_event, problem_rating, solution_check.
Authored numeric/manual/symbolic attempts use the separately granted authoring
schema and no new Elo scope is introduced. Guest Arena/learning/coaching can be
checked independently, but persisted legacy submission/history/rating acceptance
must not be claimed until their minimum access is separately reviewed/authorized.
The five-table approval does not authorize these extra grants or owner credentials.

## Production compatibility: merge blocked

Independent explicitly READ ONLY queries on the Vercel Production Neon branch
br-quiet-dawn-b7m2zrt3, endpoint ep-snowy-heart-b7c1220y, neondb, PG18.6, found
legacy/auth tables but NO authoring tables/functions or integration ledger.
The new authored library/attempt/solution routes require those objects. A
successful Preview cannot establish Production compatibility. Do NOT merge PR27
or trigger Production under the present state. Production was not modified.

Required separate Production plan (not execution authorization):

1. Confirm the effective Production database and deployment mapping securely,
   its application role, current main SHA and exact schema/auth/legacy baseline.
   Compare full constraints, indexes, triggers and helper catalogs before DDL;
   absence of an integration ledger is not itself proof that objects are absent.
2. Establish Production-approved recovery and an operator-controlled writer/DDL
   pause. The existing staging-only pg_dump/restore risk exception does not apply.
3. Design/review a Production-specific migration runner and ledger/bootstrap,
   binding the target, commit, six exact canonical SQL hashes, same common lock,
   transaction/timeouts, non-destructive existing-row checks and atomic ledger
   recording. Never repoint or weaken the immutable staging runner silently.
   These migrations would be FIRST application to Production, not staging replay.
4. Rehearse that exact Production baseline→0001–0006 upgrade with retained user
   and legacy records on disposable PostgreSQL18.6. Review application-role
   privileges separately, including existing legacy grading/rating access.
5. Obtain explicit Production migration/grant execution approval. None is present.
   Apply only the verified missing suffix once and independently verify catalog,
   checksums, ledger and record preservation. No schema push or destructive DOWN.
6. Then rerun current-main reconciliation, CI/security/Preview acceptance and
   authorize the resulting Production-compatible merge/deployment. Alternatively,
   a fully tested Production authoring-disable strategy covering every entry
   point could permit code-first deployment; the present candidate does not
   implement or claim that strategy. Do not suppress compatibility checks.

The staging snapshot snap-bitter-cloud-b75hikb1 and staging-only backup exception
are retained. They do not demonstrate a rehearsed Production restore or change
Production release requirements.
