# Beta readiness log

## 2026-11-02 — Merge UI work into main

- Reconciled `v0/ui-work` with current `main`, preserving coaching, account, authoring and practice changes. Kept all practice/contest and coaching schema declarations without applying any database migration.
- Combined server, component and disposable-database test commands. Retained the private-media image/SWR fixes and local PostgreSQL fallback. Regenerated the lockfile with both branches' dependencies.
- Fixed the rendering test's moved relative imports, made decorative logo alt text explicit and removed obsolete Open Graph lint suppressions.
- Validation: frozen-lockfile install, zero-warning ESLint, Next route type generation, TypeScript and production build passed. Disposable-PostgreSQL server run: 347 passed, 0 failed, 0 skipped, 1 inherited translation TODO. Component rendering: 14 passed. CI's React-server test command also passed. Browser-checked the production archive at desktop and mobile sizes and preserved coaching content. Authenticated live-data flows were not exercised.

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

## 2026-11-01 — Coaching Phase 1

- **Page:** `/coaching` brought onto main from `v0/coaching-work` by copying only the page, layout, CSS module, hero, sections, tutors, medallists data and `public/coaching/**` (no merge, so the authoring files are untouched). The in-page inquiry form, world map and `app/api/coaching/**` were not copied.
- **Consultation link:** the hero radio picker (`coachingPathways`) now ends in a real `<a>` to the Tally form `https://tally.so/r/XxZBr4`, opened in a new tab with `rel="noopener noreferrer"`. It is disabled (`aria-disabled`, not clickable) until a pathway is picked. `?goal=` preselects a pathway. Other "Start inquiry" and "Start step 1" buttons still go to `#hero-cta`.
- **Tally hidden fields:** `pathway` (the selected option) and `source` (`utm_source`, else the referrer hostname unless it is physcratic.com, else `direct`, max 100 characters). Both must exist as hidden fields in the form. Registration lives in Tally, with no database involved.
- **Logic and tests:** `lib/coaching/consultation.ts`, tested in `lib/coaching-consultation.test.ts`.
- **Indexing:** `/coaching` has `robots: { index: false, follow: true }` until Coaching Phases 2 and 3 land. Phase 3 removes it. It is not in the sitemap registry yet.
- **Hero copy:** the intro paragraph was rewritten because the v0 text described the old options.

## 2026-11-01 — Coaching Phase 2

- **Copy module:** every user-visible string on `/coaching` (including aria-labels, image alt text and page metadata) now lives in `lib/coaching/content.ts`. Only the pathway list and Tally URL stay in `consultation.ts`. Components render it and hold no copy.
- **Computed numbers:** `coachCount` and `countryCount` come from `medallists`, and class size (6), class hours (2) and package hours are derived constants. `lib/coaching-content.test.ts` rebuilds the content from a fake 3-coach, 2-country list to prove counts are not typed.
- **Copy rules, enforced by test:** no U+2014, U+2013 or semicolon in any exported string. Banned phrases: "One-to-one", "one-to-one tutoring", "Tutor inquiry", "IGCSE", "within two days", "General physics consultation", "medalists", "Honorable". "Tutor" is also banned except in the verbatim student quote and the `#tutors` anchor. The FAQ question "Can I get one-to-one classes?" is lowercase on purpose, so the capitalised ban does not hit it.
- **Sections, in order:** hero (one H1 with two lines, facts row, picker with helper lines), coaches `#tutors`, programs `#programs` (links to `/coaching?goal=<pathway>#hero-cta`), how a class works `#how-it-works`, scheduling `#scheduling`, packages `#packages`, your path `#your-path`, reviews, at a glance, FAQ `#faq`, final call to action, footer. The new sections are server components. The hero and the coaches gallery stay client components (they hold the pause state).
- **Anchors:** `#how-it-works` now points at the class format section and the step cards moved to `#your-path`. Coach cards have `id="coach-{slug}"` on the first gallery copy only. The hero slideshow cards use `<p>` for names so headings stay in order and ids stay unique.
- **Review link:** a click or hash load on `#coach-*` focuses the card (focus stops the animation and unlocks scrolling), then scrolls it to the centre, using `behavior: "auto"` under `prefers-reduced-motion`. Moving focus away resets the gallery and lets it run again.
- **Scheduling visual:** CSS-only `<figure>`, bar positions computed from hours in the content module. Labels and time ranges sit above each bar so nothing is squeezed inside a bar at 375px. The bars are `aria-hidden` and a screen-reader sentence repeats the example.
- **Checked:** typecheck, unit tests, one H1, headings in order, no duplicate ids, every in-page anchor resolves, no horizontal scroll at 375, 768 and 1440, banned phrases absent from the rendered page.
- **Still open:** `/coaching` stays `noindex` until Phase 3. The mobile menu `<details>` does not close after choosing a link (no client JS added).

## 2026-11-01 — Coaching Phase 2b

- **Roster:** 19 coaches from 12 countries (added Mohammed, Saudi Arabia, and Ignat, Portugal, after Ali Hamdaan). Counts are still computed, and the test now also pins 19 and 12. `Medallist.photo?: 'webp' | 'png' | false` replaces the hard-coded slug lists. `photo: false` (Nima, Yota, Ignat) renders an inline SVG silhouette in theme colours, `aria-hidden`, same 720x900 frame, and no image file is referenced. The Abhika cutout import is kept.
- **Flags:** `public/coaching/flags/sa.png` and `pt.png` (640x427) were converted from the `flag-icons` npm package, fetched with `npm pack` into a temp folder (flagcdn.com is blocked from the build environment). No dependency added. A test checks that every country has a flag file and that photo-less coaches have no image on disk.
- **Cards:** a 20x14 colour flag chip before the country name, and a 10px medal marker before each achievement (gold, silver, bronze, hollow ring for honourable mention). Colours are CSS variables in `coaching.module.css`, with a plain bordered circle in forced-colors mode. Achievements now each get their own line in one format ("Silver · APhO 2025").
- **Logo and fonts:** header uses `/logo-mark-transparent.png` (alt empty) and `public/coaching/physcratic-logo.png` is deleted. Bowlby One is replaced by Fraunces 500 and 600 (`--font-coaching-display`) for the H1 first line, H2s and coach names, in sentence case. The brand text is sans 600, `text-lg`.
- **Voice pass:** the listed strings were replaced exactly. Extra change: the IB and A-Level picker helper now reads "School physics with more problem-solving" (it used "real" as filler). The last FAQ answer says "Our live classes are the paid part." so "Physcratic Coaching" only appears in the first two answers.
- **Design tells:** removed the decorative check icons in the class format list. The FAQ plus icon and the pause and play icons stay because they act as controls. No gradient text, and the only emoji is the heart in the review quote.
- **Tests:** banned filler words (journey, unlock, elevate, seamless, empower, world-class) are checked in every string.
- **Checked:** typecheck, unit tests, and screenshots at 375, 768 and 1440 px with no horizontal overflow and no broken images.

## 2026-11-01 - Batch 5.1 - Team rules

- **Added:** `CONTRIBUTING.md` (golden rules, ownership table with Owner set to TBD, shared-file and migration rules, quality gates, copy rules, production deploy note), `.github/pull_request_template.md`, and `.github/CODEOWNERS` with comments only.
- **CLAUDE.md:** added the Coaching paths to the parallel-work list and a "Read CONTRIBUTING.md before starting." line. Nothing else changed.
- **Not added:** `AGENTS.md`, because the accounts branch adds one.
- **Still open:** fill in the Owner column and enable CODEOWNERS lines once owners are named.

## 2026-11-01 - Batch 5.3 - Smoke tests and deploy alerts

- **Smoke script:** `scripts/smoke.mjs` (Node 22, no dependencies) runs 11 checks against a base URL and prints PASS, FAIL or SKIP per check, plus a markdown table that also goes to `$GITHUB_STEP_SUMMARY`. `/api/health` is a SKIP until Batch 7.
- **Smoke workflow:** `.github/workflows/smoke.yml` runs on successful `financial-dashboard` deployments only, posts the commit status "Smoke tests" on the deployed SHA, and has a manual `workflow_dispatch` with `base_url` and `env`. Previews need the secret `VERCEL_AUTOMATION_BYPASS_SECRET`.
- **Deploy alert:** `.github/workflows/deploy-watch.yml` waits up to 20 minutes for "Vercel – financial-dashboard" on each push to main and opens a `deploy-blocked` issue (one per SHA) on failure, error or no status.
- **Docs:** `docs/engineering/SMOKE_TESTS.md`.
- **Batch 5.2:** PR #35 added the "Database tests" CI job (postgres:17-alpine). 39 of 39 tests pass on PostgreSQL 17.
- **Still open:** add the secret before the first preview run. The workflows only take effect after merge. Production was not smoke-tested from the build environment because its network policy blocks physcratic.com.
- **Site title:** `defaultTitle` is now "Physcratic | Physics Olympiad practice for IPhO, APhO and EuPhO" (no em dash). The social image strips the "Physcratic | " prefix and its subtitle is 38px so it stays on one line. Tests read the title from `SITE.defaultTitle`, so none needed changes. Not touched: the "Starter terms — pending legal review" heading in `app/terms/page.tsx` still has an em dash (accounts area, for its owner to fix).

## 2026-11-01 - Batch 7.1 - Health endpoint

- **Endpoint:** `GET /api/health` returns `{ ok: true, version, time }` with status 200 and `Cache-Control: no-store`, force dynamic. `version` is the first 7 characters of `VERCEL_GIT_COMMIT_SHA`, or "local". No database call, no auth, no secrets, no environment names. The pure logic is `healthPayload(env, now)` in `lib/health.ts`, tested in `lib/health.test.ts`.
- **SEO:** nothing to exclude. The sitemap is a fixed list of public pages, and `/api/*` already sends `X-Robots-Tag: noindex, nofollow`.
- **Smoke test:** the `/api/health` check in `scripts/smoke.mjs` now passes instead of skipping once this is deployed.
- **Still open:** point an uptime monitor at `https://physcratic.com/api/health` and alert on a non-200 or a missing `"ok":true`.

## 2026-11-01 - Merge coaching work while preserving authoring

- **Preserved:** main's authoring, grading, media, publishing, student-attempt, authentication and migration files are unchanged. Restored the Problem studio navigation link alongside Coaching.
- **Shared files:** added the branch's practice-rating and coaching-inquiry tables to `lib/db/schema.ts` without changing main's authoring definitions. Restored `server-only` in the manifest and lockfile. Server tests retain `--conditions=react-server`, while rendered problem-card tests run separately through `test:ui` and an additional CI step.
- **Coaching:** retained the branch's coaching design, 15 visible tutors across 8 countries and current portrait assets. Reconciled the merged roster tests and retained British medal spelling.
- **Validation:** frozen-lockfile install, route type generation, full TypeScript check, production build, 271 passing unit tests and all 11 smoke checks against the local production build. Five database-dependent tests were skipped locally and one inherited test remains todo. Browser checks covered desktop at 1164 by 851, mobile at 390 by 844 with no horizontal overflow, the Problem studio sign-in redirect and a 401 response from the unauthenticated drafts API.
- **Environment:** production build and smoke checks used temporary `NEXT_PUBLIC_SITE_URL=https://physcratic.com` and `VERCEL_ENV=production` overrides because the sandbox's canonical URL was localhost. Project environment settings and production data were not changed. Local Postgres integration checks were unavailable because Docker and PostgreSQL are not installed. The existing PostgreSQL 17 CI job remains enabled.

## 2026-11-01 - Batch 6.1 - Learn hub

- **Pages:** `/learn` (intro and one card per guide) and `/learn/[slug]` (breadcrumb, updated date, body, numbered Sources, closing link to the practice problems). Unknown or unpublished slugs return 404 (`dynamicParams = false` plus `notFound()`). The `/learn` header has a link back to `/dashboard` and the theme toggle, with no horizontal scroll at 375px.
- **Content as data:** `lib/learn/articles.ts` plus one file per guide in `lib/learn/guides/`. Blocks are heading, paragraph, list, callout, problem link, math and table (the table is for the IPhO, APhO and EuPhO comparison). Reading minutes are computed from the word count at 220 words a minute. `published: false` keeps a guide out of the hub, registry, sitemap and llms.txt.
- **Math:** reuses the site's KaTeX setup through `previewWorking` in `lib/latex-working.ts`, rendered on the server.
- **SEO:** the hub and published guides are in `lib/seo/public-routes.ts` (kind `learn`), so metadata, canonical, sitemap and llms.txt follow. Article and BreadcrumbList JSON-LD come from `articleGraph`. There is an opengraph image for the hub and for each guide.
- **Copy rules:** `lib/copy-rules.ts` (`findCopyProblems`) and a test that runs it over every string in the articles. Guides A, B and C are 900 to 1,400 words each, checked by test.
- **Facts:** every number, rule and date in the guides comes from the sourced fact sheet supplied with the task (S1 to S8, plus two unofficial archives). Where a fact was unconfirmed, the text says "Check the current host site". The fact-sheet sources could not be fetched from the build environment (network policy), so they were not independently re-checked.
- **Learn link:** added to `components/kokonutui/top-nav.tsx` (icon on small screens, text from `md`). `sidebar.tsx` is not touched.
- **Closing link:** points to `/dashboard?view=problems`, because `/dashboard/problems` has no index page and would 404.
- **Still open:** the unofficial archive sources (S9, S10) and S3 and S5 are not official sites. Re-check all sources when the network allows.

## 2026-11-02 - Batch 6.2 - Reviewer, study tips and resources guide

- **Reviewer:** every guide shows "Reviewed by Arrow Dunatos, IPhO 2026 bronze medallist" under the Updated date, with the name linked to `/coaching`. Each guide's JSON-LD has a WebPage node with `reviewedBy` (a Person) and `mainEntity` pointing to the Article, because schema.org defines `reviewedBy` on WebPage.
- **Guide A:** new section "How to study and solve problems", paraphrased from Kevin Zhou's Learning Introductory Physics (K1), credited by name. His USA-specific exam advice is left out. A links to guide D.
- **Guide D:** `physics-olympiad-books-and-resources`, the reviewer's picks grouped by stage and topic, with a few of ours marked "Also useful". No prices, no buy links, no edition claims beyond Halliday, Resnick and Krane (5th edition). Cites K1 to K3 and Zhou's writing index. It is in the hub, registry, sitemap, llms.txt and has its own OG image through the shared `[slug]` route.
- **New block type:** `guideLink`, checked by test against real slugs and heading ids.
- **Sources:** K1 to K4 are dated 2026-11-02. They came with the task and could not be fetched from the build environment, so they were not independently re-checked.
- **Checked:** word counts (D is 721 words, within 700 to 1,200), copy-rules test, typecheck, 276 of 281 unit tests pass with 0 fail, `pnpm build`, and 20 page views (five pages at 375px and 1280px in both themes) with no horizontal scroll.

## 2026-11-02 - Coaching restore (Phase 2c on top of the v0 merge)

- **Why:** v0 commits on main (up to `c590272`) replaced the coaching hero, sections, gallery and roster with a prototype. The coaching area was restored from PR #33 (`2e8e886`) on purpose. A new v0 session must start from `main`.
- **Taken from PR #33:** hero, sections, gallery with arrows and "See all", coach cards and medal chips, placeholder avatar, review, highlights, hover and scroll-in motion, smooth scrolling, `content.ts` as the one source of copy and their tests. `public/icon-*.png` were not taken, so `icon-512.png` stays the opaque tile the sidebar uses.
- **Kept from v0:** Bowlby One as the display font (so no faux bold, names are weight 400), no `noindex`, and greyscale on the cutout photo only (the flag behind stays in colour).
- **Roster:** all 19 coaches again. Mohammed (photo), Ignat, Nima and Yota (`photo: false`, silhouette) are visible, and the `hidden` field is gone.
- **Tally:** `consultation.ts` has `CONSULTATION_FORM_URL`, `TUTOR_FORM_URL`, `coachingPathways`, `consultationHref()`, `consultationSource()` and the new `tutorFormHref()`. `/coaching/consultation` and `/coaching/become-a-tutor` are short intro pages with one button each (pathway "Not sure yet" and source, or source only). `/coaching/training` is removed.
- **Removed:** the in-house inquiry form and its API route, `lib/coaching-inquiries.ts`, `lib/coaching-training.ts`, `lib/coaching-pathways.ts`, the unused world map and their tests.
- **SEO:** `/coaching`, `/coaching/consultation` and `/coaching/become-a-tutor` are in `lib/seo/public-routes.ts` (kind `coaching`), so they reach the sitemap, and a "Coaching" section in `llms.txt`.
- **Still open, after the staging migration:** `coachingInquiries` in `lib/db/schema.ts` is unused and can be dropped, and so can `react-simple-maps` in `package.json`.

## 2026-11-02 - Coaching Phase 2d

- **Scope:** a layout and hierarchy pass on the sections from Programs to FAQ, plus a "Free guides" link between coaching and the learn hub. Copy stays in `lib/coaching/content.ts`. New labels and chip lists are there and covered by the copy tests.
- **Programs:** Beginner, Intermediate and Advanced are three steps on a thin rail with a dot per step (horizontal from 1024px, vertical below). IB and A-Level is a separate dashed card tagged "Different track". Each card runs level name, "For" as the largest line, "Covers" as chips, "Goal" in bold, then the button. The intro is "Three levels take you from your first olympiad to IPhO." and that phrase is the highlight (six words, so the highlight limit is now six). The old "roughly the same level" sentence stays as a muted note.
- **How a class works:** four stat tiles (6, 2 h, Every class, Notes). The three remaining points are one muted row. "Train slightly above your level" has an accent left border and a chip row of the countries and competitions. Topics are muted chips.
- **Scheduling:** text on the left and a larger overlap visual on the right from 1024px. The class-time caption is bold accent.
- **Packages:** "16 sessions" and "32 sessions" in the display font with the hours under them. No prices, and no "popular" or "recommended" label (a test checks this). One full-width "Ask for your local price" button with the pricing note under it.
- **How to get started:** four numbered steps on one connected line, with the button at the end. "within 2 business days" is the highlight.
- **Review, at a glance, FAQ:** larger quote in the body font (weight 500) with a large accent opening quotation mark in the display font, on a lifted card, with avatar, name and gold chip on one row. At a glance is a tight two-column list. The FAQ opens its first question, with larger questions and an accent plus icon.
- **Mid-page buttons:** one "Get a consultation" after Programs (Packages has "Ask for your local price" as its only call to action). It scrolls to `#hero-cta`, where the picker opens Tally through `consultationHref` with the chosen pathway and the source. No new button opens Tally directly.
- **Free guides:** a quieter `#guides` section after "At a glance" and before the FAQ. It has a plain heading, small cards read from `publishedArticles` (title, description, reading minutes), a "See all guides" link, a scroll row on mobile and a two-column grid from 768px. The header nav ("Guides", shortened because "Free guides" made the 1024px nav wrap) and the mobile menu link to `/learn`, and so does the footer ("Free guides"). Every guide ends with a muted line, "Want a coach who has sat these exams? Meet our medallist coaches.", linking to `/coaching`. The copy is `COACHING_LINE` in `lib/learn/articles.ts`, checked in `lib/copy-rules.test.ts`.
- **Header:** the nav links and the button no longer wrap, and the gap is tighter below 1280px. The header is 65px high at 375, 1024 and 1440.
- **Motion:** every new card uses the shared `coaching-lift` (4px lift, shadow faded in on a pseudo element, 220ms). It is off under reduced motion.
- **Display font:** Bowlby One has one weight, so no display text is bold. Highlights are body text only.
- **Checked:** typecheck, unit tests, `pnpm test:ui` (new render tests for the guides, programs, packages and FAQ), `pnpm build`, and Playwright at 375, 768 and 1440 (no horizontal scroll on `/coaching`, `/coaching/consultation`, `/coaching/become-a-tutor` or the guides).

## 2026-11-02 - Broken-link crawl

- **Method:** `pnpm build`, `next start`, then a Playwright crawl (rendered DOM, so client-rendered links count) from `/`, `/dashboard`, `/learn` and `/coaching`, following every same-origin link and anchor. 39 pages were reached, well under the 500 cap. Every URL in `sitemap.xml` and `llms.txt` was also fetched.
- **Result:** no 404s, no missing `#anchor` ids and no redirect chains. The only redirect is `/` to `/dashboard` (one hop). All 38 sitemap and `llms.txt` URLs return 200. `/coaching/training` correctly returns 404 (removed in the coaching restore) and nothing links to it.
- **Not checkable offline:** `/sign-in`, `/sign-up` and `/dashboard/author` return 500 on a local server because there is no PostgreSQL (`ECONNREFUSED 127.0.0.1:5432`), and the local build has no `BETTER_AUTH_SECRET`. They are linked from many pages ("Problem studio", "Create an account"), so a signed-in or staging crawl should confirm them. They belong to Accounts and Authoring, so they were not touched.
- **Not covered:** pages behind sign-in, and any link a script adds after interaction (for example the dashboard filters beyond the first view).
- **Code change:** none needed.

## 2026-11-02 - SEO metadata guard

- **Guard test:** `lib/seo-metadata-guard.test.ts` resolves the effective title, description and canonical of every route in `lib/seo/public-routes.ts` (32 routes) and fails on a title over 60 characters (with the " | Physcratic" template), a description under 70 or over 160, a duplicated title or description, an indexable route whose canonical is missing or not its own path, and any copy-rule break. Titles and descriptions are read from the code that produces them (`dashboardMetadata`, the learn articles, the coaching content). Canonicals the pages declare themselves are read from the page source. Noindex routes are only checked for their title. It was checked against two deliberate regressions and fails on both.
- **Built-site check:** `scripts/check-seo.mjs <base url>` (Node 22, no dependencies) loads every URL in `sitemap.xml` and `llms.txt` and checks the same rules on the real `<head>`, that every JSON-LD block parses and that every `og:image` returns 200. Run on `pnpm build` and `next start`: all 32 pages have an og:image that returns 200, every JSON-LD block parses (the dashboard, 12 problem pages and 4 guides carry one) and there are no duplicate titles or descriptions.
- **Fixed:** `/coaching` title was 75 characters, now "Physics Olympiad coaching from medallists" (54 with the template). `/coaching/consultation` description 164 to 140. Site title was 63 characters, now "Physcratic | Physics Olympiad practice for IPhO, APhO, EuPhO" (60). That is a visible brand string, so it should be confirmed. `/dashboard?view=guide` description 64 to 109. `/dashboard?view=rankings` description 42 to 112. The books guide title was 62 with the template, now "Best books and resources for Physics Olympiad" (58).
- **Not fixed, listed in the test as known offenders:** the description of five practice problem pages is the whole problem prompt: `first-law` (172 characters), `heat` (198), `incline` (184), `projectile` (262) and `spring` (164). It comes from `generateMetadata` in `app/dashboard/problems/[id]/page.tsx` (Practice UI), which should use a short summary such as `problemSummary()`. The test fails when one of the five is fixed, so the list shrinks.
- **Not a problem:** `/terms` has no canonical and is noindex (`robots: { index: false }`), so it is exempt. `app/terms` belongs to Accounts anyway.

## 2026-11-02 - Accessibility pass

- **Method:** Playwright on `pnpm build` and `next start`, at 375 and 1440, on `/dashboard`, `/learn`, the four guides, `/coaching`, `/coaching/consultation` and `/coaching/become-a-tutor`. Dark and light themes for the dashboard and learn pages (light is set through the `theme` value in localStorage, because `next-themes` defaults to dark), and dark only for coaching, which forces a dark palette. 30 page, theme and width combinations. Reduced motion was on, so the scroll-in fade could not hide text from the contrast check.
- **Keyboard:** every tab stop on every page shows a focus ring (outline or ring read from the computed style after a real Tab). No positive `tabindex`. The only out-of-order stop is the fixed mobile "Get a consultation" button, which is last in the DOM and sits at the bottom of the screen. The skip link is the first stop on every page, shows on focus, moves to `main` and the next Tab lands inside it.
- **Structure:** one `h1` and no skipped heading levels on every page except `/dashboard`. Every `img` has an `alt`, every link, button, summary and form control has an accessible name and every form control has a label.
- **Contrast:** computed from the real CSS for every visible text element (text colour and opacity composited over the stacked background colours, 4.5:1, or 3:1 for large text). For text on a gradient over a photo, computed styles cannot tell, so the rendered pixels behind 176 slideshow text samples were measured.
- **Fixed:** in the `/coaching` hero slideshow, the muted country name on the photo cards was 3.7 to 4.1:1 on bright photos (for example the Indonesia cards). The card gradient is now `.94` at 40% and `.98` at the bottom, and the same text measures 6.9:1 or more.
- **Not fixed, outside the coaching and learn areas:**
  - `/dashboard` has no `h1`. The first heading is the "Workspace" `h2` in `components/kokonutui/sidebar.tsx:70` (on the page it appears after "Featured contest").
  - "Recommended For You" (`components/physics/dashboard-highlights.tsx:110-114`, `text-primary` at 14px) is 2.0:1 on white in the light theme.
  - The problem count in the sidebar (`components/kokonutui/sidebar.tsx:92`, `opacity-70`) is 2.9:1 in the light theme and 3.5:1 in the dark theme.
- **Left as is:** the "Continue to the consultation form" button looks low contrast (2.1:1) only because it is disabled until a pathway is chosen, and inactive controls are exempt.
- **Not covered:** pages behind sign-in, screen reader testing and zoom or text-size reflow.

## 2026-11-02 - Performance pass

- **Method:** Playwright with the Chrome network log on `pnpm build` and `next start`, at 375 (2x) and 1440, on the same ten pages as the accessibility pass. Transferred bytes (encoded, no cache) for JS and images, the largest image per page, and the attributes of every `<img>`.
- **Key fact:** `next.config.mjs` has `images: { unoptimized: true }`, so every `next/image` serves its source file as it is. There is no resizing, no `srcset` and no WebP conversion, and `sizes` has no effect. Image weight is therefore the weight of the files in `public/`. Turning optimisation on again would count against the Vercel plan's image quota, so it was left alone.
- **Fixed:** four coach photos in `public/coaching/medallists` were PNGs of 1.4 to 2.4 MB each (6.9 MB together), and the hero slideshow loads every one of them. They are now WebP at the same 1080x1350 size and quality 85 (PSNR above 40 dB): angel 2407 to 73 KB, kanishk 2066 to 35 KB, ermuun-battulga 1459 to 52 KB, reuben-felix 1397 to 50 KB. The `photo: 'png'` overrides in `lib/coaching/medallists.ts` are gone, so those four use the default `.webp`. Side-by-side comparison images are in `docs/engineering/perf-pass/`. `/coaching` images dropped from 8.1 MB to 1.0 MB at 375 and from 8.2 MB to 1.1 MB at 1440. JS is unchanged.
- **JS per page (compressed transfer):** `/dashboard` 666 KB, `/coaching` 149 to 153 KB, `/coaching/consultation` and `/coaching/become-a-tutor` 153 KB, the guides 134 KB and `/terms` 130 KB. Only the dashboard stands out. It is in the Practice UI area, so it was not touched.
- **Attributes, checked and left as they are:** the hero slideshow cards are `eager` on purpose. They sit in a clipped, moving marquee, so lazy loading would show empty cards as they slide in. Only the first card in each column has `priority`. The gallery cards below the fold are `lazy`. The header logo has `priority`. All images have `width` and `height`, so nothing shifts. At 375 the hero slideshow is below the fold, so about 24 photos (roughly 0.7 MB) load early on mobile. Making that conditional needs a viewport-aware change, so it is a follow-up.
- **Follow-ups, not done:**
  - The four converted photos are 1080x1350 but shown at 250 to 288 px wide. The other photos are 720x900. Resizing them to 720x900 would roughly halve them again.
  - Flags are 640x427 PNGs (2 to 11 KB each, 76 KB in all) shown at 20x14. WebP at a smaller size would save about 40 KB per `/coaching` load. This needs code and test changes to the `.png` path.
  - `public/logo-mark-transparent.png` is 512x512 (76 KB) shown at 28 to 40 px on every page. A 128x128 file would save about 70 KB per page. It is shared with the sidebar, so it was not touched.
  - `public/mind-the-gap-hero.png` (1.6 MB) and `public/newton-cradle.png` (1.0 MB) are not referenced anywhere in the code, so they cost nothing at runtime but can be deleted.

## 2026-11-02 - Content Security Policy (report only)

- **What:** every route now sends `Content-Security-Policy-Report-Only` (built by `lib/security/csp.ts`, set in `next.config.ts`). It blocks nothing. Violations go to `POST /api/csp-report`, which logs one line per report and always answers 204. Every existing header is kept. `next.config.mjs` became `next.config.ts` so it can import the typed builder (Next 15 reads it natively, and it avoids depending on the Node patch version that Vercel uses for type stripping).
- **Policy:** `default-src 'self'`. `script-src 'self' 'unsafe-inline'`, plus reCAPTCHA origins. `style-src 'self' 'unsafe-inline'`. `img-src 'self' data: blob:`. `font-src 'self' data:`. `connect-src 'self'`. `frame-src 'self'` plus reCAPTCHA. `worker-src 'self' blob:`. `object-src 'none'`. `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'self'`, `report-uri /api/csp-report`. `'unsafe-eval'` and websockets are added in development only. The Vercel toolbar origin is added on preview deployments only.
- **Origins found in the code:** Vercel Analytics is on our own origin (`/_vercel/insights`). Tally is only linked to, never embedded, so it needs no entry (add it to `frame-src` if an embed arrives). The PDF worker is bundled. Fonts are self-hosted by `next/font`. Auth calls only `/api/auth`. There are no iframes, no external fetches and no social login. reCAPTCHA is not on main: the unmerged `codex/signup-captcha` branch loads `https://www.google.com/recaptcha/api.js`, so `www.google.com/recaptcha`, `www.gstatic.com/recaptcha` and `recaptcha.google.com/recaptcha` are allowed ahead of time.
- **Endpoint:** accepts `application/csp-report` and `application/reports+json`, ignores bodies over 8 KB without buffering them, and logs `console.warn("[csp]", directive, blocked origin, page path)` with no query string, with values cut to 100 characters and line breaks removed. Only POST exists (GET gives 405).
- **Checked in a real Chromium on `pnpm build` and `next start`, light and dark, at 375 and 1440, on `/`, `/dashboard`, `/learn`, a guide, `/coaching`, its two form pages, `/terms` and two problem pages:** reports reached the endpoint and the log. The site's own scripts, styles, fonts and images produced no reports. The only reports are `script-src eval` from `/dashboard` and the problem pages, which come from zod v4 (chunk `6984`). zod checks whether `Function("")` works and, if it does, compiles schemas with `new Function`. Under an enforcing policy the check fails inside a try/catch and zod switches to its non-JIT path, so `'unsafe-eval'` is not needed in production. The reports are noise until then, and `z.config({ jitless: true })` would silence them.
- **Not checked:** `/sign-up` and `/sign-in` return 500 on a local build (no database), so they should be opened on staging. The `report-to` path (application/reports+json) was not observed delivering locally, so the policy uses `report-uri`, which was.
- **Follow-up:** replace `'unsafe-inline'` in `script-src` with per-request nonces, then change the header to `Content-Security-Policy`.

## 2026-11-02 - Right-size images

- **Why:** `next.config.ts` has `images.unoptimized`, so every image is sent as its source file. The weight of the files in `public/` is the weight users download.
- **Coach photos:** the eight files that were 1080x1350 (four photos, four cutouts) are now 720x900 like the other 24, so every image in `public/coaching/medallists` is at most 720x900. The photos were resized from the original PNGs (kept in git history) and the cutouts from their WebP, keeping the alpha channel. The quality was the lowest of 70, 75, 80, 85 and 90 that reaches a PSNR of 40 dB against the resized original. Total 550 KB to 302 KB:

| File | Before | After | Quality | PSNR |
| --- | --- | --- | --- | --- |
| `angel.webp` | 73 KB | 61 KB | 90 | 39.8 dB |
| `angel-cutout.webp` | 109 KB | 52 KB | 85 | 40.5 dB |
| `kanishk.webp` | 35 KB | 17 KB | 80 | 40.4 dB |
| `kanishk-cutout.webp` | 60 KB | 23 KB | 70 | 41.4 dB |
| `ermuun-battulga.webp` | 52 KB | 32 KB | 85 | 40.5 dB |
| `ermuun-battulga-cutout.webp` | 76 KB | 34 KB | 80 | 40.9 dB |
| `reuben-felix.webp` | 50 KB | 28 KB | 85 | 40.5 dB |
| `reuben-felix-cutout.webp` | 93 KB | 51 KB | 90 | 40.2 dB |

- **Logo:** `public/logo-mark-128.png` (128x128, 14 KB, alpha kept) is a copy of `logo-mark-transparent.png` (512x512, 75 KB). `BrandMark` (the sidebar and the learn header, dark theme) and the coaching header use it, at 28 to 40 px. The 512 original stays for the four OG image routes. The light-theme `BrandMark` still loads `icon-512.png` (68 KB), which is also the PWA icon, so a small copy of that tile is a follow-up.
- **Deleted:** `public/mind-the-gap-hero.png` (1.6 MB) and `public/newton-cradle.png` (1.0 MB). Nothing in `app`, `components`, `lib`, `scripts`, `tests`, the workflows or `public/corpus-assets.json` refers to either of them.
- **Measured on `pnpm build` and `next start` (images after scrolling):** `/coaching` 1001 to 763 KB at 375 and 1115 to 821 KB at 1440. `/` (which redirects to `/dashboard`), `/learn` and the guides, and the two coaching form pages 76 to 14 KB (78 to 16 KB) at 1440, all from the logo. Hero cards and the sidebar logo were checked at 2x and look the same.

## 2026-11-02 - Deploy alerts that clean up after themselves

- **Before:** `deploy-watch.yml` opened one `deploy-blocked` issue per blocked commit and left it open, so the issues piled up even after a later deployment went live.
- **Now:** when the "Vercel - financial-dashboard" status of a commit is `success`, every open `deploy-blocked` issue whose commit is that commit or one of its ancestors is closed with the comment "Live in <short sha>." Issues for newer commits stay open, and there is still one issue per blocked SHA.
- **Two triggers:** the `watch` job (push to main only) runs the cleanup after it sees `success`. A new `cleanup` job runs on every `status` event whose state is `success` and whose context starts with "Vercel" and contains "financial-dashboard". So a Redeploy of a blocked deployment, or an owner commit, closes the backlog without a new push. Both are idempotent, and `cleanup` runs one at a time (`concurrency`).
- **The script:** `scripts/close-deploy-blocked.sh` (bash, `gh` and `jq`). It only acts when the live commit is already on main (`compare/main...<sha>` is `behind` or `identical`), so a preview deployment never closes anything. It finds each issue's commit from the full SHA in the body, or from the short SHA in the title, and checks `compare/<blocked>...<live>` is `ahead` or `identical`. One failing close does not stop the others, and the script then exits 1.
- **Tests:** `lib/deploy-watch.test.ts` runs the script against a fake `gh` (ancestors closed, newer and unrelated commits left, a commit not on main, no issues, the title fallback, a failing close, a bad SHA) and checks the workflow's triggers and conditions. I checked that it fails when the script's ancestor check or the on-main check is removed.
- **Not testable before merge:** GitHub runs `push` and `status` workflows from the default branch, so the workflow itself only starts running once this is on main. The first real run will close the `deploy-blocked` issues that are still open if a later commit is live. Please check that one run in the Actions tab.

## 2026-11-02 - Smoke tests: learn, coaching forms and sign-in

- **New checks in `scripts/smoke.mjs`** (now 16, listed in `docs/engineering/SMOKE_TESTS.md`):
  - `/learn`: 200, and a `<head>` with a title and a canonical link. The hub carries no JSON-LD today, so none is required there, but any it has must parse.
  - The first guide that `/learn` links to (found from the hub, so a renamed guide does not break the check): 200, title, canonical, at least one JSON-LD block, and every block parses.
  - `/coaching/consultation` and `/coaching/become-a-tutor`: 200, and each links to `https://tally.so/`.
  - `/sign-in`: 200 in production, SKIP on a preview (`SMOKE_ENV=preview`).
- **Checked:** against the real build (all five pass, `/sign-in` skips in preview), and against a mock server with a missing canonical, broken JSON-LD, no JSON-LD, no Tally link, a hub with no guides and a 500 on `/sign-in`. Each defect fails exactly the check that should catch it.
- **Not checkable locally:** `/sign-in` returns 500 on a local build because there is no database, so in production mode it fails there, as it should. The first run against production is the real test. The existing sitemap check also fails on a local build, because the sitemap advertises `localhost:3000`.
- **Also:** the comment and docs now say `next.config.ts` (it was renamed in the CSP change).

## 2026-11-02 - CI: keep smoke tests away from staging previews

- **Why:** previews of `codex/` branches use the staging database, and the authoring team requires CI to stay isolated from it. The smoke tests send requests to the preview URL, so they must not run against those previews.
- **What:** in `.github/workflows/smoke.yml` the `smoke` job no longer runs when `github.event.deployment.ref` starts with `codex/`. A new `skipped` job runs in that case and logs "Skipped: codex branch preview" with the branch, because a skipped job cannot print anything itself. It sends no request and posts no status. A manual run (`workflow_dispatch`) is still allowed. The rule is in `docs/engineering/SMOKE_TESTS.md`.
- **Side effect:** a `codex/` commit gets no "Smoke tests" commit status. The status is not a required check, so nothing is blocked.
- **Test:** `lib/smoke-workflow.test.ts` checks both conditions, the logged line, that the skipped job makes no request or status call, and the docs. It fails if the exclusion is removed.
- **Not testable before merge:** `deployment_status` workflows run from the default branch, so the change only takes effect once merged. It assumes Vercel sets `deployment.ref` to the branch name, as it does for its other deployments. Check the first `codex/` preview after merge.

## 2026-11-02 - Smoke tests on Vercel's repository_dispatch events

- **Why it never ran:** `smoke.yml` listened for `deployment_status`, but Vercel does not create GitHub deployments for this repository. There were no `deployment` or `deployment_status` workflow runs in the repository at all (only five manual `smoke.yml` runs), and Vercel reports through commit statuses instead ("Vercel – financial-dashboard", "Deployment has completed", no `environment_url`).
- **Now:** it listens for the `repository_dispatch` events that Vercel's GitHub integration sends, `vercel.deployment.success` (built and promoted to production) and `vercel.deployment.ready` (built, not promoted, which is how previews arrive), plus the manual run. Both types are listed because Vercel's own README describes `success` as the production event and `ready` as the one for deployments that are not promoted. The field names come from Vercel's source (`vercel/repository-dispatch`, `packages/repository-dispatch/src/data`): `client_payload.project.name`, `.environment`, `.git.ref`, `.git.sha` and `.url`.
- **Filters:** only `project.name == 'financial-dashboard'` (so `physcratic-integration` is ignored), never a `git.ref` that starts with `codex/` (the `skipped` job still logs "Skipped: codex branch preview"), `SMOKE_ENV` is `production` when `environment` is `production` and `preview` otherwise, the base URL is the payload `url` (with `https://` added when it is missing), and the "Smoke tests" status goes on `git.sha`. A `repository_dispatch` run checks out the latest commit on `main`, so the smoke script is always the current one.
- **Added safety:** the payload host must be a `*.vercel.app` host or `physcratic.com`, because anyone with write access can send a `repository_dispatch` and the bypass secret is sent to the host. The bypass secret is now required for any `vercel.app` URL (production included), since the project protects everything except custom domains.
- **Tests:** `lib/smoke-workflow.test.ts` checks the triggers, filters and fields, and runs the workflow's own "Work out what to test" step with sample payloads (environment mapping, URL clean-up, host and SHA validation, the secret check, the manual inputs). Removing the codex exclusion, the environment mapping, the project filter or the host check each makes it fail.
- **Not testable before merge:** `repository_dispatch` workflows run from the default branch, so the first real run comes after the next Vercel build once this is on main. The steps to confirm it are in `docs/engineering/SMOKE_TESTS.md` ("How to confirm it works on the next deploy"). If nothing arrives, Vercel is not sending the event, which is a Vercel setting.

## 2026-11-02 - Smoke tests: one run per deployment

- **Why:** a production deployment can send both `vercel.deployment.ready` and `vercel.deployment.success`, which would start two smoke runs for the same commit.
- **What:** in `smoke.yml` the `smoke` job (and the `skipped` job that logs codex/ previews) only counts `ready` when `client_payload.environment` is `preview` and `success` when it is `production`. A manual run is unaffected.
- **Tests:** `lib/smoke-workflow.test.ts` now evaluates each job's real `if:` expression against sample events: ready with preview and success with production run, ready with production and success with preview do not, other projects and `codex/` refs are filtered, and the skipped job logs each codex deployment once.

## 2026-11-02 - Learn hub structured data

- **What:** `/learn` now carries one JSON-LD block, `learnHubGraph()` in `lib/seo/json-ld.ts`, rendered once in `app/learn/page.tsx`: the Organization, a CollectionPage (`#collection`, with the page's own title and description, `en-GB`, free to access, publisher, main entity the list), an ItemList (`#guides`) of the published guides and a BreadcrumbList (Physcratic, Learn).
- **No hard-coded guide titles:** the page passes `publishedArticles` from `lib/learn`, in the order the hub shows them, and the function builds each item's `position`, `name` (the guide title) and `url` from it. An unpublished guide never appears, and with no guides there is no ItemList and no `mainEntity`. A test checks that no guide title or slug is typed in `json-ld.ts`.
- **Tests** (`lib/learn-hub-json-ld.test.ts`, a separate file): `@context` and `@type` on every node, the four types in order, the hub's title and description, item count, positions, names and urls against `lib/learn`, the empty case, all `@id`s resolve and are unique, the breadcrumbs, `JSON.parse` and an inert `</script>`, and that the page renders it once. Breaking the positions or the main entity makes three of them fail.
- **Checked on `pnpm build` and `next start`:** one block on `/learn`, four items in the same order as the page and the right urls, `scripts/smoke.mjs` reports "1 JSON-LD block(s) parse" for `/learn`, and `scripts/check-seo.mjs` finds no new problem. Whether Google shows a rich result for it can only be seen in Search Console, and an ItemList of guides may never get one.
- **Also:** the comment in `scripts/smoke.mjs` that said the hub has no JSON-LD is updated. The smoke check still only requires that any JSON-LD on the hub parses, so it does not fail on a preview that predates this.

## 2026-11-02 - Zero lint warnings

- **What:** `pnpm lint --max-warnings=0` now passes. The only two warnings were "Unused eslint-disable directive" in `app/learn/opengraph-image.tsx` and `app/learn/[slug]/opengraph-image.tsx`: the `@next/next/no-img-element` rule no longer reports there, so the two `eslint-disable-next-line` comments around the `<img>` in the OG image JSX were deleted. The ESLint config is unchanged.
- **Checked:** `pnpm lint --max-warnings=0` exits 0 (0 errors, 0 warnings), typecheck, all tests and `pnpm build` pass. The OG images render the same, because only a comment was removed.

## 2026-11-02: local Problem Authoring Preview reconciliation

Prepared against main 60a4825212a67077c2d5dc5e668dad252df06653 without changing the accepted migration candidate or executing remote changes. Staging migrations are complete. Application grants and Preview push/deployment remain separately gated. Coaching, learn, arena and newer main functionality are retained.

Retained main's new codex Preview smoke exclusion unchanged. Manual smoke checks still use Production sitemap origins; an authoring Preview advertises its reviewed Preview metadata origin. No check is weakened by this reconciliation.

## 2026-11-02: authorized staging release candidate

- Applied only the reviewed five-table grants to physcratic_integration_app on the isolated staging branch. Exact40 effective privilege checks pass, no grant options or ledger/schema/role expansion. Migrations were not rerun.
- Reconciled the accepted authoring candidate with main60a4825, preserving coaching, Arena, learning, auth, performance/CSP and current smoke dispatch/deduplication policy.
- Fixed Preview-only discovery files to use public canonical URLs without changing stable auth/page origins. Full local Preview-profile HTTP smoke now15 PASS,0fail,1Production-only skip.
- Staging DB guard additionally pins the exact approved DNS names and restricted application role. Production behavior is unchanged. Shared PostgreSQL aliases remain rejected and Blob OIDC/mail allowlist enforcement retained.
- TypeScript, lint, build, PG18.6, release/transport and all three browser suites pass. One inherited corpus punctuation TODO remains, without changing generated main content.
- Independent READ ONLY Production inspection found no authoring tables/functions. This blocks merge/deployment to Production until a separately approved migration plan or complete tested feature-disable strategy exists. No Production write is authorized here.
- Fresh Preview deployment and real verified-account/email/Blob acceptance remain required. The connected inbox is not the allowlisted recipient, so no unrelated inbox is searched and no allowlist is broadened to make acceptance pass.

## 2026-11-02: real authoring acceptance and Production execution transport

- Real staging Terms, mailbox verification, login, save/reload, publish, private
  OIDC PNG uploads/reads, numeric outcomes/retry, explicit solution reveal,
  assisted-attempt immutability, revocation, unpublish and logout checks passed
  on the accepted Preview. Labelled immutable fixtures are retained.
- Shared auth forms now explicitly submit POST before hydration, preventing
  credentials in default GET query strings. SSR and real no-JavaScript Chromium
  tests cover the defect. Hydrated Better Auth flow is unchanged.
- Added a Production-only Windows runner around the unchanged reviewed SQL.
  Disposable PG18.6 covers data preservation, atomic failure rollback, stale
  recovery rejection, writer lock timeout, window expiry and replay rejection.
  Existing canonical migrations and staging package are unchanged.
- Production remains gated on fresh candidate CI/Preview and execution on the
  operator's verified Windows host with a current writer/deployment hold.
  No Production SQL write or merge is recorded here. Details and live legacy
  coverage limitations are in AUTHORING_ALPHA_RELEASE.md.

## 2026-11-02: Production operator timestamp correction

- Derive the window end from the captured start, preventing Node startup time
  from extending the interval beyond the existing thirty-minute validation.
- The actual shell calculation passes millisecond and year-rollover regressions.
  A thirty-minute-plus-204ms interval remains rejected. Canonical SQL, target,
  TLS, locks, recovery and approval checks are unchanged. Refresh package hashes.
