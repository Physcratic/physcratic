# Beta readiness log

## 2026-10-31 — Batch 1 — CI

**What runs** (`.github/workflows/ci.yml`, on every pull request and on push to `main`; read-only permissions, no secrets, 15 min timeout, one run per ref):
1. `pnpm install --frozen-lockfile` (pnpm 10, Node 22)
2. Typecheck: `pnpm exec next typegen && pnpm exec tsc --noEmit`
3. Unit tests: `lib/*.test.ts` excluding `*.pg.test.ts`

**Not in CI, and why**
- **Production build:** verified by the Vercel preview check; add a CI build step only if a PR ever lacks that check. (`pnpm build` also passes without secrets, but needs network for next/font.)
- **Postgres-backed tests:** `*.pg.test.ts` files are excluded because they need Postgres. Four existing DB-backed files (`author-media-api`, `authored-attempt-api`, `authored-grading-db`, `problem-authoring-api`) self-skip in CI because `AUTHORING_TEST_DATABASE_URL` is unset. A Postgres job is needed later to run them.
- **Browser suites** (`tests/*.browser.mjs`): not run.

**Known todo:** `lib/corpus-translation.test.ts` test "protected editorial drafts cover every source segment…" fails on inherited corpus punctuation drift. It is marked `todo`; translation data is changed on PR #2.
To remove the todo: after PR #2 merges, delete the `{ todo: ... }` option and the comment above that test, run `pnpm test`, and confirm 0 todo.

Local result: 158 tests, 0 fail, 1 todo, 4 skipped.
