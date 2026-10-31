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

## 2026-10-31 — Batch 3 — Technical SEO and AI-crawler readiness

**Registry:** `lib/seo/public-routes.ts` is the single list of URLs that return 200 on main. The sitemap, `llms.txt` and the dashboard metadata all derive from it. It holds `/dashboard`, the four `?view=` pages, `?view=problems&topic=<topic>`, `/dashboard/problems/<id>` for each lib/physics problem, and `/terms`.
- A topic URL is listed only if lib/physics has a problem for it **or** `filterCatalog({ topic })` (the UI's own filter, including the `Modern` → `Modern physics` mapping) returns at least one catalog problem. A topic with neither is left out of the sitemap and its page returns `noindex,follow`. Today all 6 topics qualify.
- `/terms` is in the registry but marked `indexable: false`, because `app/terms/page.tsx` sends `noindex`. It is left out of the sitemap and linked only under "Optional" in `llms.txt`.
- Tests live flat in `lib/*.test.ts` (`site`, `seo-public-routes`, `seo-json-ld`, `dashboard-route`) because CI only globs `lib/*.test.ts`.

**Robots:** preview and local deploys return `Disallow: /`. Production (`VERCEL_ENV=production`) allows `/` and disallows `/dashboard/author`, `/dashboard/submissions`, `/sign-in` and `/sign-up`, and publishes the sitemap URL. `/api/` is not disallowed on purpose (Google must fetch it to render pages; API responses send `X-Robots-Tag: noindex`).

**AI-crawler policy:** OAI-SearchBot, ChatGPT-User, GPTBot, Claude-SearchBot, Claude-User, ClaudeBot, PerplexityBot and Google-Extended are all covered by `*` and are allowed on purpose. `/llms.txt` (under 5 KB, generated from the registry) lists the practice problems.

**Structured data:** Organization and WebSite (overview only, linked by `@id`; no SearchAction); BreadcrumbList and LearningResource on problem pages. No Quiz or practice-problem types (deprecated by Google). The serializer escapes `< > &`.

**Metadata:** Next replaces `openGraph` wholesale, so every page spreads `baseOpenGraph` and sets `title`, `description`, `url` itself. A page-level `openGraph` also drops the root `opengraph-image` file convention, so dashboard pages set `images` explicitly. Canonicals keep only `view` and `topic`; `q` or `search` gives `noindex,follow`.

**Env var:** `NEXT_PUBLIC_SITE_URL=https://physcratic.com` (Production only). Preview falls back to `VERCEL_PROJECT_PRODUCTION_URL`.

**To do:**
- Add 192×192 and 512×512 PNG icons to `public/` and to `app/manifest.ts` (only 180×180 and 32×32 exist, so the PWA manifest is not installable-grade).
- **Batch 3b:** after PR #2 merges, add catalog and Arena problems and `/coaching` to the registry.
- Optionally add `og:title` coverage for the problem page in `page.tsx` once PR #2 releases it (the layout already sets it).
- Rendered-HTML finding: problem pages and the topic page server-render the problem text and catalog card titles into the body (no client-side bailout), so non-JS crawlers see them.

## 2026-10-31 — Phase 8B — Final authored integration audit

Main SEOa55bb1a integrated bya3269e7; both readiness-log entries retained, local
Inter and new metadata preserved. Three incoming untyped test casts fixed in
32761ee; no product behavior change. Full merged PG252/252,0skip/TODO; independent
security83/83 and migration51/51, exact PG17 order/down/up preserve old records.
No confirmed application-security/migration blocker. Current browser, lint/type/
build and infrastructure-failure evidence is in AUTHORING_RELEASE_READINESS.md.

Controlled staging is BLOCKED pending financial-dashboard project mapping,
Preview/Production isolation, exact Neon/Blob/auth/mail configuration and remote
ledger/schema/backup inspection, plus fresh final-SHA CI. GitHub confirms old8A CI
and Vercel status link; provider READY/Preview attestation is not independently
verified runtime readiness. No secret values inspected/printed, shared DB/storage/
user/env mutation, deployment or merge. Gated operator runbook prepared; draft
consolidated PR attempted only after verification. Stop at Phase8B handoff.

Final8B checks: Node22 frozen install/typegen/TypeScript/lint0/build PASS; targeted
SEO15/15, full252/2520skip/TODO. Fresh authoring and student browsers PASS. Fresh
library initialization remains ENOSPC-blocked even with tmpfsPG;8A pass is prior
evidence only. Require recovered-workspace rerun and fresh final-SHA CI. No target/
isolation evidence received; verdict remains BLOCKED. Draft PR fallback body and
manual compare URL are in AUTHORING_CONSOLIDATED_PR.md/readiness.

Draft PR27 created successfully, no merge/auto-merge. GitHub reports pending
Vercel contexts for BOTH physcratic and financial-dashboard on55b5f68; project/
resource mapping remains a blocker. Final documentation-only observation commit
requires its own exact-SHA CI result; request it if not accessible via the tools.

## 2026-10-31 — Phase8B read-only evidence follow-up

External connected-account inspection supplied by user confirms financial-
dashboard/prj_phm4794zl2QBICu5MMbLFxcHAfFq→Physcratic/physcratic and exact8A
READY Preview identity. Production deployment and Neon inventory recorded in
AUTHORING_ENVIRONMENT_EVIDENCE.md. staging.physcratic.com is mapped to
codex/auth-hardening. General P/P/D DB/Blob/auth entries have no authoring-
completion overrides; isolation is not established, and actual connected Neon
branch/role, private Blob store and ledger remain unknown. No secret values,
decryptions, configuration changes, provisioning or shared writes.

CI gate for f876792 is CLOSED: PR41210409141 and push41210403475 SUCCESS;
this agent fetched both jobs and confirmed exact SHA in checkout logs. All
install/type/lint/unit+PG/build steps pass. Evidence-only follow-up changes no
application/migration code; its own CI remains a separate observation.
Readiness/runbook/blockers updated; live auth/Blob tests remain gated and library
ENOSPC rerun remains open. No merge/deploy/migrations; final verdict BLOCKED.
