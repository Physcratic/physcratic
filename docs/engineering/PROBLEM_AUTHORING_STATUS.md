# Problem authoring implementation status

- Updated: 2026-10-31 (Asia/Makassar). Phase 6A ONLY; phases 0–5B merged.
- Fresh fetched main/base `058fa3cf125920296227d0c8473cf70abe6ff593` (Phase 5B PR #19); merged tree exactly matches reviewed Phase 5B aafbf3b.
- Branch `codex/problem-authoring-phase-6a` created from fresh main. Read WORK_STATUS/map/status first; relevant auth/grading/public reader/database dependencies only, no repeated audit.
- Foundation `e4a89fb`; uncapped-practice premerge correction delivered on the same branch, final commit via git log -1.
- Draft PR creation blocked by GitHub API Forbidden (Post https://api.github.com/graphql).
- Open PR: https://github.com/Physcratic/physcratic/pull/new/codex/problem-authoring-phase-6a
- Compare: https://github.com/Physcratic/physcratic/compare/main...codex/problem-authoring-phase-6a?expand=1

## Completed Phase 6A
- Explicit additive0004 creates authored_attempt and authored_student_rate; Drizzle declarations added without rewriting prior schema. No earlier migration changed.
- Immutable attempt binds authenticated user, problem, exact immutable revision and part via composite FKs; unique user/idempotency key and unique positive bigint user/revision/part ordinals; no lifetime cap.
- Stores submitted answer, four-status outcome/reason, engine version, timestamp(3), ordinal and no-reveal policy only; no private marking-key copies. SQL enforces JSON shape/size/numeric range, status-reason/engine/policy and mutation prohibition.
- New API factory and production Better Auth/origin/pool adapter; verified sessions required for submit/history/detail/reader metadata, including problem authors.
- POST /api/authored-problems/[id]/attempts strict {revisionId,partId,answer,idempotencyKey}; body identity/result/timestamp/reveal fields rejected. Existing numeric/expression/manual schemas and dimensionless alias reused.
- Configured same-origin write guard, actual-byte20KB/5s body limit, strict UTF8/JSON and PostgreSQL-compatible Unicode; no NUL/unpaired-surrogate persistence failure path.
- Atomic persistent60 total requests/minute and20 POST/minute per user; failures/retries charged. Exhausted POST bucket does not block GET while total budget remains; only rate bucket sends Retry-After60.
- Serialized100 new attempts per rolling24h with unlimited lifetime/per-part practice; all four outcomes count toward the rolling quota. Replay uses no new attempt/ordinal; rate still applies. Indexed maximum allocates the next bigint ordinal, exposed as an exact decimal string.
- Per-user advisory lock serializes idempotency/count/insert across instances/problems; canonical answer parsing handles JSONB key ordering and blank/1 aliases; conflicting same key409.
- Current published parent FOR SHARE held across exact revision/part check, grading and insert/commit. Existing publication/unpublish FOR UPDATE serializes; stale new submissions409, hidden/unpublished404 even for owner.
- Existing grader accepts a query executor and reuses PoolClient within submission transaction; no second pool connection or pool-max1 deadlock. Core numeric/symbolic/manual evaluation and private SQL/auth selection unchanged.
- Runtime status/reason/version/result-shape/selection allowlist before persistence; extra grading secrets or changed selection rollback503. Correct/incorrect/review/ungraded remain distinct; unsupported symbolic stays review.
- Healthy thrown grading failure persists service-unavailable review; aborted DB/insert/commit rolls back and retry uses same key. Original committed results are recovered without regrading after lost responses.
- Authenticated own-only list/detail history, newest-first keyset timestamp(3)+UUID cursor, max50/page, optional own problem filter. Other students and problem authors404 for another student's record.
- Own record replay/history survives unpublish/new publication but exposes only submitted work/result/IDs, never old revision content or keys. New submissions still require current publication.
- Public revision GET preserves body and adds submission-info Link; verified companion returns current published IDs/part modes, own usage/unlimited remaining, policy and API links from one snapshot, with no private joins.
- no-reveal-v1 prevents automatic private-answer/hint/solution/asset disclosure on submitting or grading. It permits a future separately authorized explicit student-initiated worked-solution view; no such feature is implemented here. Phase 6A app reveal-assistance=false and private media isolation stay enforced.
- Detailed API/locking/limits/spoiler/retention specification: [AUTHORED_STUDENT_SUBMISSIONS.md](AUTHORED_STUDENT_SUBMISSIONS.md); migration operations in migrations/README.md.
- No solving UI, intentional reveal endpoint, comments/stars, ratings, auth/CAPTCHA behavior, legacy practice/archive submissions or new dependencies.
- No production DB/files/storage/migrations, deployment or merge. Populated down migration refuses; immutable history/user FK RESTRICT retained for separately reviewed retention workflow.

## Verification
- Revised targeted56/56 PASS; focused PostgreSQL attempt suite13/13 PASS; TypeScript and diff checks PASS.
- Auth/IDOR: missing/unverified, forged identities/keys/results/reveal, cross-origin/null/cross-site, guessed/stale/foreign revisions/parts, own-only history including denial to problem authors.
- Body: wrong content type, actual oversize with forged Content-Length, real stalled5s stream timeout, NUL/lone surrogate rejection before DB.
- Outcomes/privacy: all four statuses + symbolic equivalence; public/history/companion/result allowlists, no key/hint/solution text, private PDF inaccessible after correct answer.
- Concurrency/idempotency: simultaneous normalized same-key retries -> one immutable row; simultaneous different answers same key -> one201/one409; matching replay after unpublish; conflict no extra slot.
- Revised policy regressions: >10 concurrent attempts on one part, indexed sequential numbering, races near rolling100/day, quota expiry on the same part, persistent POST/read separation, exact bigint/JSON precision and representation-edge replay/history. No permanent part limit.
- Gated grading tests prove publication/unpublish waits for submission commit; subsequent stale attempts fail and historical results stay pinned. Single-connection pool proves grader executor reuse.
- Failure tests: safe persisted grading exception, malformed/overfetched/mismatched grader output rollback, aborted SQL transaction rollback, successful same-key retry; no secret diagnostics.
- SQL: empty up/down/up, populated rollback refusal, strict/missing JSON fields, FK/ordinal/status pairing, immutable UPDATE/DELETE refusal, stale/unpublished direct insertion rejected.
- Full policy-revision suite184/185 PASS; sole inherited lib/corpus-translation.test.ts:66 punctuation assertion (previous Phase 6A183/184), no new regressions.
- TypeScript/typegen PASS (sequential after build); git diff --check PASS.
- Lint attempted: inherited missing ESLint. Build attempted: inherited Inter/Google Fonts network EPERM; in-process worker-disabled diagnostic confirms font failure without tracked config edits.
- Policy revision logs /tmp/physcratic-p6a-policy-{target,full,typecheck}.log session-local only; original phase lint/build blocker logs retained.

## Original Phase 6A independent security/data-integrity review
- Read-only reviewer audited request admission, authorization, private keys, SQL/FKs/current publication, transaction-client reuse, idempotency/limits, history, reader metadata and no-reveal policy.
- Confirmed/fixed POST-exhaustion accidentally blocking reads, internal malformed grader/stored-validation misclassified client400, and misleading minute Retry-After on quota errors; regressions included.
- Reviewer rechecked fixes and full integration coverage; no remaining confirmed security/data-integrity blockers. No files modified by reviewer.

## Premerge practice-policy revision
- Corrected unreleased0004 on the same Phase 6A branch: positive bigint ordinal CHECK and unique sequence retained,1..10 cap removed. No production migration.
- Metadata attemptsPerPart/attemptsRemaining=null means unlimited; attemptsUsed and attemptNumber are decimal strings. No JS Number conversion for allocation/storage/serialization.
- Focused concurrency/security review completed with no blockers: same per-user advisory lock, replay-before-quota ordering, parent publication lock and atomic insert. MAX/index lookup prevents historical count growth; stable timestamp quota scan stops at100.
- Bigint ceiling guarded before addition/grading; no wrap/rounding/partial record, while replay/history remain available. No lifetime row cap/purge; rolling rate, bounded payloads and indexed pagination control ingress/access. Future archival needs separate review.

## Commands / remaining boundaries
- Targeted: bash scripts/test-problem-authoring.sh node_modules/.bin/tsx --conditions=react-server --test lib/authored-attempt-api.test.ts lib/authored-symbolic-grading.test.ts lib/authored-grading.test.ts lib/authored-grading-db.test.ts lib/authored-numeric-grading.test.ts lib/problem-authoring.test.ts
- Full: bash scripts/test-problem-authoring.sh node /tmp/physcratic-npm/_npx/fed63785a0df9524/node_modules/pnpm/bin/pnpm.cjs test
- TypeScript: node_modules/.bin/next typegen then node_modules/.bin/tsc --noEmit, sequential with build.
- Tests use injected verified sessions in actual API/grader factories, localhost disposable physcratic_authoring_test and unique schemas; no ambient DATABASE_URL or real storage calls.
- Production route/session adapter typechecked/read-reviewed; live Better Auth/Vercel staging path not exercised. Reader integration is API metadata/Link only; legacy static practice reader remains untouched.
- Numeric/symbolic proof limits remain documented in SYMBOLIC_GRADING_POLICY.md. HTTP body/SQL/cooperative grading deadlines are explicit; no hard OS heap/preemption claim.

## Exact next task
- User review Phase 6A only; stop after delivery. No merge/deploy/production migrations.
- Solving UI and any intentional reveal/assisted-policy changes require a separate next-phase request after merge/fresh main/handoffs. Reuse these immutable attempt contracts without silently changing no-reveal-v1.
