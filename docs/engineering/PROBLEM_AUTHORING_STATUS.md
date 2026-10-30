# Problem authoring implementation status

- Updated: 2026-10-31 (Asia/Makassar). Phase 1 only; Phase 0 merged by user.
- Verified merged main / starting HEAD: `ecee0baa8d56408f9fc9bd22c156a4feac7b8ecb`.
- Branch: `codex/problem-authoring-phase-1`; initial implementation `008c377`; review-fix commit is the commit containing this update (git log -1).
- Delivery: branch pushed successfully; gh pr create --draft failed with GitHub API Forbidden. No PR exists from this session.
- Read map/status/WORK_STATUS first; no AGENTS.md found. Only schema/contracts/direct dependencies inspected; no repeated repository audit.

## Completed Phase 1
- lib/problem-authoring.ts: bounded strict Zod contracts/inferred types for native ordered content, problems, drafts, revisions and private keys.
- Drafts permit incomplete keys/rights; publishable contract requires native content, parts, rights and matching key/manual mode per part.
- Unique section/part/block IDs, bounded tags/media references, finite numeric/tolerance values and declared expression variable domains.
- Explicit public revision mapper discards extra private row fields and solution-PDF references; strict nested content rejects injected key fields.
- lib/db/schema.ts: additive authored problem/draft/revision, separate draft/revision private parts and stable relational revision-part identities.
- Owner FK, unique slug/revision numbers, composite same-problem revision pointer, key/mode/part FKs, indexes and identity/version checks.
- migrations/0001_problem_authoring.{up,down,test}.sql: immutable published revisions/keys/parts; exact document/part map; deferred completeness and same-transaction sealing.
- migrations/README.md: explicit migration/checksum-ledger procedure, publication insert order and destructive-rollback restrictions.
- SQL is authoritative for deferred constraints/triggers beyond Drizzle declarations; do not use Drizzle schema push.
- Existing schema tables, archive/practice contracts, auth, dependencies and lockfile unchanged.
- Author media storage remains Phase 4; typed media references only here. No stars/comments tables until Phase 7.
- No APIs, UI, upload processing, CAS evaluation, authorization endpoints or production DB operations added.

## Verification: regressions versus baseline
- Before editing: unchanged merged-main full suite 93/94 passed, reproducing protected editorial draft translation punctuation mismatch at lib/corpus-translation.test.ts:66.
- New targeted contracts: 13/13 PASS, including review regressions for UUID normalization and Drizzle Date serialization.
- After review fixes: full suite 106/107 passed; ONLY the same pre-existing translation assertion fails. No new test failures.
- TypeScript `pnpm exec tsc --noEmit`: PASS.
- `pnpm lint`: same baseline failure, eslint executable/dependency/config absent.
- `pnpm build`: same baseline blocker, app/layout.tsx next/font cannot fetch Inter from fonts.googleapis.com.
- PostgreSQL 17 disposable container: migration up/constraint tests/down/up PASS; pre-existing user survives. No ambient DATABASE_URL used.
- Existing pnpm 10.20.0 installation reused; no package/lockfile changes. Default pnpm 11 override mismatch remains outside scope.
- Commands used session-local pnpm executable via node /tmp/physcratic-npm/_npx/fed63785a0df9524/node_modules/pnpm/bin/pnpm.cjs.
- Review logs: /tmp/physcratic-p1-review-{targeted,final,0,1,2,3}.log (session-local); final TypeScript rerun exit 0.

## Independent critic / decisions
- Independent schema/security and contract review performed as required by the playbook; root separately reviewed schema SQL/constraints.
- Fixed NULL-passing JSON identity checks with IS TRUE; fixed concurrent late-child insertion via shared advisory locks and deferred same-inserting-transaction checks.
- Published state requires revision pointer; archived may retain prior pointer, but public-state authorization belongs to Phase 2.
- Keys are separate private rows. Public mapper is not authorization: caller must prove published visibility before serializing.
- Full JSON semantics/ownership/email verification remain mandatory service checks in Phase 2; SQL does not replace Zod/auth.
- Expression AST/equivalence/resource limits are Phase 5; contracts do not evaluate or claim mathematical validity.
- Publication assembly requires deferred FK transaction and documented insert order; no separate savepoints for revision/children due xmin identity checks.
- Trusted application DB role only; no generic public SQL/RLS exposure. Media authorization and private/public asset lifecycle are Phase 4.
- Runtime model selection is not exposed; no model switch claimed. Later phases retain playbook model/testing/review requirements.

## Phase 1 review corrections (same branch)
- Shared Zod UUID normalization lowercases before uniqueness/reference refinements; parsed persistence payloads now match PostgreSQL UUID text semantics.
- Regressions cover mixed-case duplicate IDs/private references/media refs, uppercase references and private-part JSON/PostgreSQL round trips.
- Corrected existing, unapplied 0001 migration: canonical document IDs must be unique, with exact ID/mode pairs compared both directions using EXCEPT.
- SQL regressions reject [A,A] vs {A,B}, mixed-case duplicates, missing/extra parts, missing IDs/modes and mode mismatch; reordered exact maps still commit.
- Explicit row adapter accepts valid Drizzle Date timestamps and prior ISO strings; public output remains ISO strings with private fields/solution PDFs filtered.
- Authorization remains separate: callers must establish published visibility before serialization. No public routes added.
- Disposable PostgreSQL17 up/all constraints/down/up PASS, preserved user count 1; container removed. No production DB used.
- Adversarial critic: no blockers; xmin checks, advisory locks, immutable triggers, insertion order and rollback semantics unchanged.
- TypeScript test-fixture typing failure corrected; final typecheck PASS. Existing lint/build blockers reproduced unchanged.

## Exact next task
- Finish delivery/review of Phase 1 only; if GitHub API remains blocked, create draft PR when authorized access is available.
- After user merges Phase 1 and explicitly requests continuation: Phase 2 only, from freshly fetched merged main (Sol High per playbook).
- Read these handoffs first; inspect authored contracts/schema and auth/origin/request helpers only as needed.
- Implement verified-owner draft CRUD/list, optimistic saves, allowlisted preview, transactional publish/unpublish with rights/key/media/version validation.
- Preserve immutable revision insertion contract and no key leaks; route integration tests for IDOR, unverified users, concurrency and failed publication.
- No UI until Phase 3. Run targeted tests then required checks, independent security critic, update handoffs, commit/push/draft PR and stop.
