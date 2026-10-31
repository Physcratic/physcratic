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

## 2026-10-31 — SEO fixes

- **Sitemap XML:** Next 15.5 writes `<loc>` verbatim, so `&` in `?view=problems&topic=…` made `/sitemap.xml` invalid XML. `app/sitemap.ts` now passes every URL through `xmlEscape()` (`lib/seo/xml.ts`, tested). Verified with an XML parser; topic URLs read `&amp;topic=`.
- **Metadata in `<head>`:** `htmlLimitedBots: /.*/` in `next.config.mjs` makes Next render `<title>`, canonical and `og:` tags in `<head>` for every user agent. Without it, bots not on Next's list (TelegramBot, GPTBot, ClaudeBot, Claude-SearchBot, OAI-SearchBot, PerplexityBot) get metadata streamed into `<body>`. Checked with the default UA and `TelegramBot (like TwitterBot)`.
- **Brand icons:** generated from the Physcratic logo and placed in `public/`: `icon-32.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-icon.png` (180), `logo-mark-transparent.png`. Wired into layout `icons`, the manifest (192/512 "any", 512 "maskable") and the Organization JSON-LD logo (`/icon-512.png`). The old `icon.svg` and `icon-{dark,light}-32x32.png` were removed (no other references). The 192/512 to-do from Batch 3 is done.
- **Preview images:** both `opengraph-image` files embed `logo-mark-transparent.png` as a data URL read with `process.cwd()` (Next's local-asset pattern for `ImageResponse`).

## 2026-10-31 - Batch 4 - Landing page at /

**What shipped:** `app/page.tsx` is now a static server component (it replaces the redirect to `/dashboard`). Sections live in `components/landing/**`: header, hero, proof strip, browse by topic, "Start with a warm-up", how it works, IPhO 2025 teaser, FAQ (plain `<details>`, no FAQPage markup), footer. Only `ThemeToggle` and `FeedbackLink` are client components. No new fonts or images.

**Counts (all computed in `components/landing/data.ts`, none typed in):** 100 olympiad problems from `catalogProblems` (40 IPhO, 35 APhO, 25 EuPhO), IPhO 2025 as 5 papers and 64 subproblems from `lib/ipho-archive`, 6 topics, 12 warm-up problems from `lib/physics`. Topic counts are practice problems plus `filterCatalog({ topic })`, so they can sum to more than 112 when a catalog problem has several topic tags. The URL value stays `Modern`, the label reads "Modern physics".

**SEO:** `/` is the first registry entry (kind `home`), so it appears in the sitemap and in `llms.txt`. `app/llms.txt/route.ts` needed a one-line "Home" entry because it only lists problem, topic and view kinds. Organization and WebSite JSON-LD moved from the `/dashboard` overview to `/`, so they live in one place. Title is `SITE.defaultTitle`, canonical and `og:url` are `/` (Next renders the root without a trailing slash, the sitemap writes `/`, both mean the same URL).

**Copy rule (from now on):** no em dashes, no en dashes used as dashes, no semicolons in user-visible text. Applied to `lib/site.ts` (new `SITE.tagline`, `defaultTitle` is now "Physics Olympiad practice for IPhO, APhO and EuPhO | Physcratic"), the root `opengraph-image` (wordmark plus tagline), the landing page and everything under `app/`, `lib/seo/` and `lib/dashboard-route.ts`. `lib/landing.test.ts` guards the landing sources and site strings. Files owned by other branches still have violations (see the PR description).

**Favicons:** `icon-32/192/512.png` are now background-free, recolored to #4F86FF from `logo-mark-transparent.png` (alpha thickened with MaxFilter 9 for 32px and 3 for 192px). `apple-icon.png` and `icon-maskable-512.png` keep their solid backgrounds on purpose.

**Brand mark:** hero and header use `logo-mark-transparent.png` on dark and `icon-512.png` on light, because the pale mark looked washed out on the light background. Both images are lazy, low priority, explicitly sized and `aria-hidden`.

**Checked locally:** `/` returns 200 with the right title, canonical, og tags and parseable JSON-LD, exactly one H1, and every internal link on the page returns 200 except `/sign-in`, which returns 500 locally only because there is no Postgres in the sandbox. `/dashboard` no longer has JSON-LD. LCP is the H1 at 375, 768 and 1440 in both themes. No horizontal overflow at 375px, tap targets are at least 44px, and CSS motion is disabled under `prefers-reduced-motion`.

**To do:** run Lighthouse against the Vercel preview. Reconsider the "Counts include warm-up and olympiad problems" note once catalog problems get their own topic pages.
