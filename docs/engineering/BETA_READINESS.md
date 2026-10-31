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

## 2026-10-31 — Batch 2 — Error pages and feedback link

**What changed**
- Branded 404 (`app/not-found.tsx`), route error boundary (`app/error.tsx`) and root error boundary (`app/global-error.tsx`). The error pages never render `error.message` or the stack; they show only the digest as a "Reference", with a copy button that falls back to selectable text when the clipboard is unavailable.
- A "Feedback" link in the top nav (icon-only below `md`) and an inline variant on the 404 and error pages. It is a real `<a href>`, so keyboard, middle-click and "copy link" work. The `href` is refreshed from `window.location` on pointer-down, focus and click, so it is current at navigation time.

**Env var:** `NEXT_PUBLIC_FEEDBACK_URL` (build-time, inlined by Next; set it in Vercel for Production and Preview, then redeploy).
- Current value shape: `https://tally.so/r/rD5oVX?page={page}&ref={ref}`
- Unset or blank: the link is not rendered. Any scheme other than `https:` or `mailto:` is ignored (blocks `javascript:`, `data:`, `http:`).
- `mailto:` also works (adds subject and body, keeps an existing query), so the channel can switch to email with no code change.

**Tally hidden fields:** `page` and `ref`, filled from the URL. Tokens `{page}` and `{ref}` (also `%7Bpage%7D` / `%7Bref%7D`, any case) are replaced with `encodeURIComponent` values. `page` is pathname + search, never the `#hash`, capped at 300 characters. `ref` is the error digest on error pages, empty elsewhere. A URL without tokens is used as-is. Logic and tests: `lib/feedback.ts`, `lib/feedback.test.ts`.

**Analytics:** `<Analytics />` was added to `app/layout.tsx` by PR #23, not here.

**Intentionally not done:** no `loading.tsx` files (no skeletons or streaming boundaries added); no error-reporting service (match digests against Vercel runtime logs); `global-error.tsx` was typechecked but not exercised in a browser, because it only renders when the root layout itself throws.

## 2026-10-31 — Phase 7 — Authored library discovery

Published authored problems now appear in the existing library collection tabs,
with bounded metadata search, exact author tag/difficulty/provenance filters,
stable UUID pagination and direct reader navigation. Archive/legacy behavior and
explicit solution authorization remain unchanged. Reader/API remain noindex;
no private or withdrawn metadata is published to caches or sitemaps.

Main54f373e integrated by merge2e0b90c with no conflicts, preserving both6C
commits and CI/Analytics/CLAUDE.md/corpus TODO. Final fetch found main6af2b2c
(error/feedback); integrated by separate merge2b42138. Restoring Phase7 work
conflicted only in this append-only readiness log; preserved both entries. Targeted19/19, final full223 pass/0
fail/1 inherited TODO, integration34/34, new library and existing student/solution
browser suites pass on disposable PG; TypeScript passes. Corpus punctuation
remains unresolved for8A. Lint/build remain blocked by missing ESLint and Google
Fonts access. Focused same-agent review fixed stale completion guarding and tab
contrast; a second independent review remains outstanding.

Explicit additive0006 index migration is a later authorized rollout prerequisite;
no shared/production migration, deployment or PR. Full contract and evidence:
[AUTHORED_LIBRARY.md](AUTHORED_LIBRARY.md). Stop after Phase7 commit/push.

Final post-refresh focused regression45/45; full224 tests/223 pass/0 fail/0 skip/1 inherited TODO. Typegen/TypeScript/diff pass.

## 2026-10-31 — Phase 8A — Build and integration hardening

Mainc2139de (empty deployment-purpose commit) integrated safely by5d1e20b,
no conflicts/file changes;6C-A/6C-B/7 and incoming work preserved.

Pinned ESLint9.39.5/Next15.5.28/FlatCompat3.3.5/pnpm10.34.9; fixed12 errors/19
warnings without a formatting sweep or blanket rule disabling. Final lint0/0.
Local OFL Inter5.3.0 retains visual family/weights and removes Google Fonts
build fetches. Node22 typegen/TypeScript and actual production build pass.

Corpus diagnosis proved17 punctuation seed/output drifts from8e5914a. Restored
only four original editorial seed blobs, identical to pending PR#2; no source,
generated translation/index/hash or formula change. Strict6/6 tests pass, TODO
removed after repair. No comparison relaxation.

Independent6C-B/7 read-only review and follow-up complete: exact difficulty
whitespace bug fixed/tested, no remaining confirmed findings,33/33 PG + both
browser suites independently pass. Root compiled smoke found/fixed mobile long
title overflow; final CSS reviewed independently and final root browser/compiled
smoke passes.

Frozen clean install; full225/225,0 fail/skip/TODO on disposable PG17; all three
browser suites (including unified editor-to-student-to-revoke workflow), desktop/
mobile axe and math overflow pass. Actual compiled Next guest routes and local
WOFF2 loading pass at1440/375px, light/dark, with no Google font requests.
CI now tests integration pushes, pinned tooling, lint/types/full PG service suite
and production build. Browser tools remain an explicit local gate.

0001–0006 unchanged; only disposable DB/storage used. No remote ledger state
verified, shared/production migration, PR, main merge or deployment performed.
Live isolated Better Auth/email/origin and Blob staging, authorized migration
ledger review and Phase8B remain release gates. Ready to enter Phase8B review.
See [Phase8A evidence](AUTHORING_PHASE8A.md) and
[release blockers](AUTHORING_RELEASE_BLOCKERS.md). Stop after Phase8A commit/push.
