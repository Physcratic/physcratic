# Phase B Production permission readiness report

19 November2026, Asia/Makassar. Engineering preparation only. No Production/shared SQL, grants, settings, credentials, flags, deployment, billing or activation was changed. Stop at the exact owner-operation boundary.

## Release gate and evidence provenance

Main at the original Phase B review was **4f840e67f359e558d49f44a4b81966012638fc9a**. It contains cleanup PR204 and matches the owner's supplied gate. Exact-main [CI44370052597](https://github.com/Physcratic/physcratic/actions/runs/44370052597) is successful on the public GitHub Actions page. Source confirms temporary helper/tests/observer/CI wiring removed; no new public diagnostic route exists.

Owner-confirmed cleanup deployment at that checkpoint: **dpl_A4rYge5pwgYzVMhD6JYgabQ8NexB**, Ready on **physcratic.com**; accepted serving LOGIN assertion from a sampled actual application-pool connection; temporary variable removed; profiles OFF; statistics ON. Accepted attestation is carried forward, not reclassified as UNPROVEN or replaced by a local LOGIN. It does not prove the whole fleet/regions or old connections have drained.

Private Vercel/Neon provider tools are unavailable here. The independent public-domain request was blocked before application delivery with CONNECT tunnel403/HTTP000 by the execution network proxy. No repeated request was attempted. This is not an application400, deployment mismatch or evidence of wrong LOGIN. No relevant source mismatch was found. Actual private deployment/alias/configuration must be reconfirmed by the owner at execution; provider facts above are owner evidence, not a fresh private control-plane observation by this engineer.

Open public PRs205(design rules),203(workshop),194(B1 readiness docs),185(archive),181(physics) were checked. No competing Phase B permission/reliability change was listed. Coordinate documentation overlap with194; none was modified or merged. The Hi.md branch and181 remain untouched.

## Permission contracts and exact artifacts

Hashes freshly verified, unchanged:

| Artifact | SHA256 |
| --- | --- |
| scripts/activation/revoke-authored-problem-id.review.sql | dcec5ac29b8a363fc2fd42742ffb7fce89e0a45522e4ffb25a505b5cfc7e28d2 |
| scripts/activation/profiles-grants.review.sql | ec8b59b652501014ec3f390b8fab7865ab51ecfa17581b68ff5b96c14215a1bd |

The reviewed baseline is35 tables with specific mutable-column allowlists, CONNECT/schema USAGE, required routine rights and no privileged attributes/memberships/ownership/CREATE or delegation. The full verifier rejects unexpected effective rights, including inherited/PUBLIC column or table authority, and unrecognized contract modes. No table-wide authored_problem UPDATE is permitted. Legitimate UPDATE columns are exactly **state, published_revision_id, updated_at**. PostgreSQL SELECT FOR SHARE/UPDATE needs UPDATE on any column, so UPDATE(id) is unnecessary. The audit checks this capability separately from the exact mutable-column allowlist and flags id as an overgrant.

batch-a adds only the approved existing favourites delta to the baseline. Post-revoke select **batch-a** explicitly; six missing profile table rights are expected_missing_disabled, not missing baseline requirements. After the separately approved profile grant select **b1** explicitly, including while profiles remain OFF: all six rights must be present, id absent, all baseline/Batch A preserved and final findings empty. The mode is connection-local metadata configuration, not a feature flag or persistent ACL change. Baseline default would misclassify approved feature deltas; do not omit selection.

The profile proposal adds exactly SELECT/INSERT/UPDATE on **community_profile** and **community_profile_write_limit**, plus already-held schema USAGE. It needs no DELETE, sequence, media/achievement or privileged-function rights. Existing auth/current-feature rights remain prerequisites. Profile constraints/triggers enforce identity/handle immutability despite table UPDATE. No approved SQL artifact or historical migration was edited.

Important stop condition: column REVOKE cannot remove table-wide, inherited or PUBLIC authority. Independently validate the exact current role/target/ACL first. The historical broad fixture and old favourites proposal must not be replayed in Production. A pre-revoke effective id finding is the only expected unresolved finding; after revoke full batch-a findings must be empty. Metadata checks do not authorize write probes.

## B1 text-profile review and acceptance readiness

Reviewed profile API/route/session adapter, page, migration0007 and unit/PG/browser acceptance sources. Feature enabled only for COMMUNITY_PROFILES_ENABLED exactly true; disabled gate precedes auth/database import. OFF API503/page404 and generic noindex metadata prevent public profile exposure through these routes. No publication follows from a grant or owned-profile read.

Creation defaults private and reads do not initialize identity. Public publication requires explicit boolean consent and exposes only handle/displayName/bio/educationLevel/favoriteTopicIds, without auth identity joins. Own operations bind the actual session to X-Community-Account before queries/limiter writes. Unverified writes, CSRF, malformed selectors and stale accounts reject; the server session adapter supplies authenticated state. Database uniqueness and immutable handle/user constraints enforce cross-account isolation. Withdrawal is authoritative on fresh reads; public/own responses are no-store/noindex, with private Vary semantics and generic metadata. A delivered public snapshot cannot be recalled.

Existing browser suite covers actual profile components/API factories with synthetic sessions, PostgreSQL and in-memory storage, including375px/keyboard/light/dark/axe, consent/save/reload/withdrawal/account switch. It is not proof of actual Production cookie delivery or a physical phone. Text profiles do not authorize media/achievements; those gates remain OFF. Runtime binding/flags are owner-confirmed, not read from local .env files.

## Collection400 investigation

The collection route parses URL search parameters through **z.strictObject**, allowing only q, tag, difficulty, source and after. Unsupported query keys produce exactly **400 Invalid collection filters.** before database access. The factory does not branch on hostname or Vercel authentication headers.

Fresh local reproduction passed: empty/valid filters on both physcratic.com and a synthetic project-alias hostname return200 with a synthetic authentication header; unknown x-vercel-protection-bypass, __vercel_cookie or utm_source query keys return the exact400 on either hostname. Those parameter names/values were synthetic test cases, not evidence of what Vercel actually injected. No real bypass token or Production credential was obtained or logged.

**Conclusion:** query injection is a supported explanation; no collection application regression was demonstrated. The original authenticated fetch's final effective query-key list was unavailable, so attribution to that specific tool is not confirmed. Retain only effective query-key names and provider request references from existing authorized telemetry, never parameter values/tokens. If the earlier request had no query keys and still400, this explanation is insufficient: stop and investigate final URL rewriting/source correspondence. Do not weaken strict validation or add a bypass exception on speculation. Project-alias200 alone does not prove the same request/deployment.

## Transient429-versus200 investigation and targeted correction

Public CI history shows PR204 CI44365355520 attempt1 had a failed database job, while its rerun and exact-main CI passed. Public job HTML did not expose the original detailed assertion/log line; the precise historic failing file/timestamp cannot be independently confirmed here. Owner's429-versus200 report is treated as reported evidence, not invented logs.

A genuine test assumption was found in **lib/community-problem-stats.test.ts**: it deletes quota state, sends60 writes and unconditionally expects write61 to be429. The actual limiter intentionally resets at the database minute boundary. Controlled disposable PostgreSQL rollover after write60 reproduced **200 !== 429**, while the application was behaving correctly. This proves a feasible timing cause, not that it was necessarily the historical failure's cause. Profile concurrency quota assertions also depend on wall-clock timing; no additional change to those tests was made without a separate reproduced failure.

The minimal correction is **test-only**: scope a controlled clock function to this uniquely owned disposable schema and a dedicated test pool, then assert60 successes,429/Retry-After60/capped counter61, explicit next-minute reset200/counter1. All real quota SQL, transactions, runtime restrictions and assertions continue running against PG18.7. The production clock, rate limit, pool configuration, privileges and application routes are unchanged. No new dependency. Associated reviewed-package checksums are regenerated; approved SQL artifacts stay byte-identical.

The owner opened [draft PR #206](https://github.com/Physcratic/physcratic/pull/206) after the original API attempt returned Forbidden. The branch includes main at `5e929d7ff8c4cc93b0755fcf3c968396caed54b8`, with the design and link preview decisions from PRs #207 and #208 and migration 0021 from [PR #209](https://github.com/Physcratic/physcratic/pull/209). The last accepted Production ledger covers 0001 through 0018. Treat 0019 through 0021 as source migrations whose Production application needs separate owner evidence. The favourites correction remains confined to the database test. Review the reconciled head's CI and obtain specific owner approval before merging. The earlier cleanup deployment is historical evidence. Confirm the current serving deployment and restricted binding before any separately authorized owner operation.

## Verification actually executed

Fresh session toolchain: Node22.23.5 and pnpm10.34.9, using an isolated fresh-main worktree, no .env/.vercel imports and a clean synthetic child environment. Existing dependencies/lockfile unchanged.

- Safety guards: PASS.
- Next typegen + tsc: PASS. Zero-warning lint: PASS.
- Full server suite:1058 pass,33 skipped,1 existing todo,0 fail. Component tests:232 pass.
- PG18.7 corrected favourites suite:3 pass; original rollover expectation intentionally reproduced a failure, retained separately as evidence.
- PG18.7 profile tests:16 pass; complete runtime-role audit/application regression:7 pass; actual authenticated activation routes:5 pass.
- Local collection query/host/header reproduction:1 pass, multiple cases.
- Executable owner-checklist guards rehearsed in the synthetic runtime-role fixture: pre/post revoke and pre/post grant passed; wrong-target/non-TLS guard failed closed as expected. Production TLS-positive/provider targeting remains an owner check. Initial temporary-harness failures were retained: relocated import paths needed adjustment, and the deliberately failing target guard caused pg-pool to discard its connection, requiring the audit mode to be selected again. The corrected harness then passed. These are not permission-verifier defects; the owner checklist already requires fresh-session mode selection and stopping on any error.
- Both integrity manifests and exact approval hashes: verified after final documentation/checksum updates.

Historical evidence explicitly reused: prior main/cleanup qualification at68bab48, whose executable application/permanent audit/profile/browser sources match the original review base 4f840e6, passed production build, exact-file revoke plus narrow baseline/Batch A/B1 real-session rehearsal, expired-session rejection before quota, OFF rollback preserving rows,92 profile browser and21 account-switch assertions. Those are **not fresh browser/build runs in this session**. CI on the original review base included its required build and database checks. The test-only change is covered by fresh PG/unit/type/lint checks; it changes no serving path. Disposable target only, no Production SQL/user data.

## Owner-only sequence and remaining blockers

Use the updated authoritative **PHASE_C_B1_RELEASE_CHECKLIST.md**; no duplicate second checklist was created. It supplies the exact psql invocation, read-only identity/TLS/role guards, pre/post column guards, mode selection, expected findings, two separate artifact approvals and stopping points. ON_ERROR_STOP handles SQL errors but does not fail for returned finding rows; independent inventory review and explicit zero-findings acceptance remain mandatory. Coordinate against competing ACL changes between prechecks and operations.

1. Reconfirm accepted release/alias/flags/sampled evidence/private recovery access and exact Neon target; approve only the narrow revoke artifact first.
2. Validate private TLS administrative session, restricted runtime role, ledger/ownership/full baseline/Batch A and that id is the only unexpected grant. Execute only the approved revoke; post-revoke guard and batch-a audits must pass. Stop for independent evidence acceptance.
3. Separately approve only the reviewed profile grant file/target/role. Execute it, then post-grant guard and b1 audits: all six rights, id false, no overgrant, complete baseline/Batch A intact. Keep profiles OFF.
4. Establish **monitored privacy/support address**, **takedown owner/process**, **rollback operator**, and numeric **health/error/latency/quota thresholds and observation duration**. Names/values remain unconfirmed. Do not infer monitoring from an email-looking string in source or invent operational readiness. Preserve independent recovery access.
5. Only after these gates and independent exact-release approval may the owner approve profiles activation and named synthetic acceptance writes, perform desktop/physical-phone privacy/consent/isolation/withdrawal/cache checks, and exercise separately authorized profiles-OFF rollback without deleting rows or disabling statistics.

**Permission reconciliation:** engineering GO for independent review and exact owner approvals; Production execution HOLD until the owner approves and performs the two operations separately. Accepted sampled attestation is satisfied on owner evidence; no need to recreate instrumentation. **Profile activation:** NO-GO until post-grant audits, operational contacts/process/thresholds, exact release/flag approval and synthetic acceptance/rollback authority are complete. A documentation/test PR is not permission to execute any of these operations.
