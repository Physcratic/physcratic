# Problem authoring implementation status

- Updated: 2026-10-31 (Asia/Makassar). Phase 2 ONLY; phases 0/1 merged.
- Fresh fetched base: `365eb62a47116e710723418d0b8e6148ce8ccd7b`, squash merge of PR #6 with reviewed UUID/sealing/timestamp fixes.
- Branch: `codex/problem-authoring-phase-2`; implementation commit `1e6ef0e`; delivery update HEAD via git log -1.
- Delivery: branch pushed and remote SHA verified; compare URL supplied instead of automated PR (prior GitHub API Forbidden).
- Compare: https://github.com/Physcratic/physcratic/compare/main...codex/problem-authoring-phase-2?expand=1
- Read WORK_STATUS/map/status first; no AGENTS.md. Only authored schema/contracts, auth/origin/request helpers and DB dependencies inspected; no repeated audit.

## Completed phases and Phase 2 changes
- Phase 1 contracts/schema preserved: normalized UUIDs, separate private draft/revision keys, immutable revisions, exact document/part map and Date-to-ISO serialization.
- lib/problem-authoring-api.ts: injectable server HTTP boundary backed by existing pg Pool and parameterized SQL; production adapter uses existing Better Auth session/origin helpers.
- app/api/authored-problems: verified-owner create/list/read/update/delete drafts; solver-shaped owner-only preview; atomic publish/unpublish; anonymous published reader.
- Owner checks in every private query; unknown/cross-owner IDs return 404. Missing session 401, unverified 403, stale version 409.
- Strict request contracts reject identity/counter/unknown fields; UUID normalization reused; writes bounded to 2 MB actual bytes and 15 s request deadline.
- Same-origin write checks; persistent 60 writes/minute/user; max 100 retained problems/author. List metadata has stable UUID cursor, max 50.
- migrations/0002_authored_write_limit up/down and Drizzle declaration: bounded per-user fixed-minute counters, atomic across instances. No new package/dependency.
- Problem+draft row locks serialize saves/publication/deletion and keep private read snapshots consistent. All mutations require expected draft version.
- Publish/unpublish increment draft version; same-version concurrent actions cannot publish duplicate revisions or overwrite each other.
- Publication transaction inserts parts/private keys before revision sealing, then pointer/version, then COMMIT; no nested transactions/savepoints, preserving xmin invariants.
- Validates rights/provenance, native statement, part/key alignment and explicit manual mode from stored snapshot before publication.
- Private keys/hints/solutions remain separate DB rows; public query loads only published statement revision, never private tables. Preview owner-only, content allowlisted.
- Extracted shared publicAuthoredContent serializer without changing public revision shape. Authorization stays in handlers, not serializer.
- All media refs including private solution/hint images rejected until Phase 4 supplies ownership registry. No unsafe reuse of solver evidence uploads.
- Delete requires unpublish first if currently public; removes working draft, preserves immutable history/stable archived problem; never-published metadata can be deleted.
- Existing archive/practice/auth code, schema contracts and package/lockfile unchanged. No UI/editor, grader, upload/social feature or production data changes.

## Verification and inherited blockers
- Targeted: `bash scripts/test-problem-authoring.sh` PASS 10/10 (parent + 9 integration cases), PostgreSQL17 disposable local container, no ambient DATABASE_URL.
- Integration: all private actions missing/unverified denial; owner CRUD/list/preview; IDOR; stale/concurrent saves; concurrent publish and publish/update race; invalid rights/statements/keys; no public draft/key/solution leakage; media/origin/type/size/limiter checks.
- Original Phase 1 SQL constraint/sealing regressions also executed on disposable DB. 0002 down/up preserves revision history and verifies user FK.
- Full tests with integration enabled: 116/117 PASS; ONLY inherited lib/corpus-translation.test.ts:66 punctuation mismatch fails (same pre-Phase-2 baseline 106/107).
- TypeScript `pnpm exec tsc --noEmit`: PASS.
- `pnpm lint`: inherited failure, eslint executable/dependency/config absent.
- `pnpm build`: inherited blocker, app/layout.tsx next/font cannot fetch Inter from fonts.googleapis.com.
- `git diff --check`: PASS; map <=120/status <=100/WORK_STATUS <100 lines; local links checked.
- Existing pnpm10.20.0 installation reused via /tmp/physcratic-npm/_npx/fed63785a0df9524/node_modules/pnpm/bin/pnpm.cjs; no dependency changes.
- Full command: bash scripts/test-problem-authoring.sh node /tmp/physcratic-npm/_npx/fed63785a0df9524/node_modules/pnpm/bin/pnpm.cjs test.
- Logs: /tmp/physcratic-p2-full.log and /tmp/physcratic-p2-check-{0,1,2}.log (session-local). All test containers cleaned by trap.

## Independent security review / limitations
- Independent read-only adversarial reviewer found no confirmed blocking issues; root reviewed diff and transaction/visibility contracts separately.
- Reviewed verified/owner authorization, origins, actual payload limits, persistent rate budget, parameterization, race behavior, key isolation/media denial and COMMIT/rollback.
- Publication ordering/advisory locks/xmin checks/immutable history unchanged. No migrations run at app startup/build.
- Tests inject sessions into production handler factory and use real PostgreSQL; they do not exercise live Better Auth/browser/staging flow. Existing auth code unchanged.
- Public GET is published-only and private/no-store; owner preview is NOT a public draft URL. Old history is retained but no old-revision public route added.
- Expression keys get Phase 1 structural validation only; CAS/AST/equivalence/resource enforcement remains Phase 5. No grading certainty claimed.
- No runtime model switch control; playbook high-effort review/test requirements retained. No production readiness claim with inherited blockers.

## Exact next task
- Review/merge Phase 2 only by user; create draft PR via compare URL if GitHub API remains blocked. Do not auto-merge/deploy or run production migrations.
- After merge and a separate user request: Phase 3 ONLY, from fresh merged main, read these handoffs before affected code.
- Build native author editor using the documented draft APIs/version conflicts, private key panels and owner-only safe preview; no PDF import/media upload until Phase 4.
- Preserve drafts on autosave errors/stale versions; support ordered sections/parts/text/math, accessible reorder and safe live math preview; evaluate editor libraries only if justified.
- Run targeted + required checks, independent UI critic, update handoffs, commit/push/draft PR then stop.
