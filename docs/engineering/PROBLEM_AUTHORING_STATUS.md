# Problem authoring implementation status

- Updated: 2026-10-31 (Asia/Makassar); Phase 0 only, no feature implementation.
- Verified starting HEAD and fetched origin/main: `80bef237f7c187b74ce83316f3dda780dae42792`.
- Branch: `codex/problem-authoring-phase-0`; initial inventory commit `973bcf7`; delivery update is the commit containing this file (resolve with git log -1).
- Remote delivery: documentation branch pushed successfully; draft PR creation failed with GitHub API `Forbidden` (gh pr create --draft).
- No AGENTS.md or pre-existing engineering handoff files found; docs/CODEX_CONNECTION_TEST.md read first.
- Remote heads checked: main, codex/auth-audit, codex/connection-smoke-test, codex/problemsetting-work, codex/signup-captcha, v0/ui-work.
- Branch is distinct; open PR overlap could not be verified because gh pr list returned Forbidden.

## Completed Phase 0 inventory and contract
- [Map](PROBLEM_AUTHORING_MAP.md): current schema/auth/grading/storage/UI evidence and minimal typed authored-problem contract.
- Proposed additive draft/revision/private-key/media model; separate normalized stars/comments and revision-bound attempts/reveals.
- Defined immutable publication, public allowlist serialization, verified-owner/verified-solver permissions and acceptance tests.
- Recorded migration/rollback approach; preserved old archive/practice/auth contracts; installed no new libraries.
- Critical second pass checked source against contract: browser worker receives expected answer; new grader must be separate/server-only.
- Explicit emailVerified guard is absent from existing submission helpers/routes; add it only to new authored write paths, preserve old behavior.
- No migration runner/config, ESLint dependency/config, or staff authorization model found; do not invent their existence.
- Self-review: map distinguishes verified implementation from proposed model and unexecuted acceptance tests; no claim of production readiness.

## Baseline checks (source/lockfile unchanged)
- Default pnpm 11.25.0 ignores package.json overrides; frozen install fails LOCKFILE_CONFIG_MISMATCH.
- Recovered with pnpm 10.20.0: frozen install PASS, 330 packages; esbuild lifecycle script ignored by pnpm.
- Invocation: node /tmp/physcratic-npm/_npx/fed63785a0df9524/node_modules/pnpm/bin/pnpm.cjs <command> (session-local path).
- Future sessions: use pnpm 10.20.0 with writable PNPM_HOME/XDG_DATA_HOME; pinning package manager is outside Phase 0.
- Targeted `exec tsx --test lib/{practice,symbolic-math,submission-security,submission-request,solution-grading,latex-working}.test.ts`: PASS 37/37.
- `test`: FAIL 93/94 pass; lib/corpus-translation.test.ts:66, protected editorial draft text differs by semicolon versus comma. Existing source was unchanged; unrelated repair deferred.
- `exec tsc --noEmit`: PASS (exit 0).
- `lint`: FAIL, eslint executable missing; package.json has lint script but no eslint dependency/config.
- `build`: BLOCKED/exit 1, app/layout.tsx next/font cannot fetch Inter from fonts.googleapis.com (not in allowed network hosts).
- `git diff --check`: PASS; final documentation/link/line-limit checks recorded in WORK_STATUS.md.
- No DB/staging/browser checks: Phase 0 is docs-only; environment status reports no configured secrets or runtime variables.
- Test/build logs are session-local /tmp/physcratic-{targeted,check-0,check-1,check-2,check-3}.log; counts/errors above persist after session.

## Decisions and blockers
- Reuse Better Auth, Drizzle/PostgreSQL, Zod, KaTeX, mathjs and Blob; editor dependency evaluation deferred to Phase 3.
- Sampling is not symbolic proof; support accepted/incorrect/needs-review/ungraded, explicit units/domains/angles and assisted history.
- Grade keys/private solution drafts never enter public statement/RSC/worker payloads; published solution access is deliberate and reveal-tracked.
- Require rights/provenance on publication, retain prior revisions, never derive Elo/rating from this slice.
- Initial network calls were sandbox-blocked; elevated access allowed GitHub git and npm downloads through configured proxy.
- GitHub API still returns Forbidden; no connected GitHub tool available. Do not bypass policy or claim PR exists.
- P0 requested Sol Medium; this session has no exposed runtime model-selection control; no agent/model switch claimed.
- README says main merges deploy automatically: no merge, deployment, production migration or production data access performed.

## Exact next task
- Finish Phase 0 delivery: verify branch push, enable authorized api.github.com access and open draft PR if blocked; review/merge only by user.
- Only after Phase 0 is merged and explicitly requested: Phase 1 schema/model, from freshly fetched main, Sol High per playbook.
- Read this file, map and WORK_STATUS.md first; inspect only schema/contracts and direct dependencies; do not repeat inventory.
- Phase 1 scope: additive versioned schema + strict Zod contracts/private serializers + constraints/tests + disposable-DB migration/rollback notes.
- No write API/UI until subsequent phases. Independent schema/security critic pass, targeted tests then required checks, update handoffs, commit/push/draft PR, stop.
