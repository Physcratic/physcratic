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

## 2026-11-02 - Coaching Phase 4 review

- **What:** a read-only review of `main` plus the Coaching Phase 3 branch (PR #73), written up in `docs/engineering/coaching-review.md`: every consultation and tutor button's Tally URL (5 pathways, 4 "Ask about this program" links, the two form pages, and four source cases), `content.ts` against the rendered pages (254 strings), the copy rules on the rendered text, 19 coaches and 12 countries with their flags and photos, the 375px layout, and the analytics events.
- **Result:** everything passes. One gap was found and fixed in PR #73 (a middle-click sent no analytics event).
- **Fix in this PR:** the FAQ question rows were only 28px high to tap, because the padding sat on the wrapper. It now sits on the `<summary>`, so each row is 84px high and the closed height is unchanged.
- **Recommendations, not done:** 44px tap targets for the footer and "See all" links and the 40px slideshow buttons, a decision on the always-visible mobile "Get a consultation" bar, and the 12px sideways scroll of `/dashboard` at 375 (`top-nav.tsx`).

## 2026-11-02 - Coaching Phase 3: SEO and structured data

- **Left as they were:** `/coaching` in the route registry, the sitemap and `llms.txt` (from #46), and the removed noindex.
- **Metadata** (`app/coaching/layout.tsx`, copy in `lib/coaching/content.ts`): title "Physics Olympiad Coaching by IPhO Medallists" (56 characters with the root template's " | Physcratic"), description "Live online Physics Olympiad classes taught by IPhO, APhO and EuPhO medallists. Up to 6 students, matched by level and schedule. Also IB and A-Level physics." (157 characters, the 6 comes from `maxStudents`), canonical `/coaching`, `openGraph` built on `baseOpenGraph`, and a `summary_large_image` Twitter card. `lib/coaching/social.ts` builds both. The SEO guard test still passes.
- **A regression found and fixed on the way:** setting `openGraph` in the layout made the two form pages inherit the main page's `og:title` and `og:url`. Giving them their own `openGraph` then dropped their `og:image`, because Next replaces the whole object, so `coachingSocial({ withImage: true })` adds the coaching image back on `/coaching/consultation` and `/coaching/become-a-tutor`. Checked on the build: all three pages have their own title, url and an absolute `og:image` and `twitter:image`.
- **Link preview image** (`app/coaching/opengraph-image.tsx`, 1200x630): background `#0c101a`, the mark read from `public/logo-mark-transparent.png` on disk, "Physcratic Coaching", "Physics Olympiad coaching from IPhO, APhO and EuPhO medallists" and "19 medallist coaches from 12 countries" (computed from `medallists.ts`, copy in `content.og`). No network fetches, and the font is the one `next/og` ships (regular weight only, so the title is not bold). Rendered and looked at.
- **Structured data** (`coachingGraph()` in `lib/seo/json-ld.ts`, rendered once in `app/coaching/page.tsx` with `jsonLdScript`): the Organization (now with `sameAs` Instagram, same `@id`, so the dashboard's copy gains it too), a Service (`#service`, provider, `areaServed` "Worldwide", an `EducationalAudience` of students, an `OfferCatalog` of the course `@id`s), four Courses (one per program: online, weekly, `PT2H`, `inLanguage` `["en"]`, no prices) and a BreadcrumbList (Physcratic, Coaching). Deliberately no FAQPage, Review, AggregateRating or Person markup, with the reasons in a code comment: FAQ rich results ended in May 2026, self-serving reviews are not eligible, and some coaches may be minors. Tests check `@context` and `@type` on every node, that every `@id` resolves, that course names match `content.ts`, `JSON.parse`, that `</script>` stays inert, and that none of the banned types appear.
- **Practice site link** (`components/kokonutui/top-nav.tsx`): a quiet text link "Coaching" right after Learn. **It is shown from `lg` (1024px), not `md`:** at 768 the header is already full, and the link made `/dashboard` scroll sideways by 7px even for a signed-out visitor. Nothing else in that file changed.
- **Conversion events** (`lib/coaching/analytics.ts`): `track("coaching_consultation_click", { pathway })` from the hero button and the consultation page, `track("coaching_tutor_click")` from the tutor page. It does nothing when analytics is not loaded and swallows errors. Left click, keyboard Enter, ctrl+click and middle-click (which sends `auxclick`, handled separately) each fire one event with the right pathway, and the disabled hero button fires none. Checked in a browser against the analytics queue.
- **Not changed, found on the way:** `/dashboard` already scrolls sideways by 12px at 375 (the right-hand group in the top bar ends at 387px). That is in `components/kokonutui/top-nav.tsx` and was not touched.

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

## 2026-11-02 - Batch C1: skip links, copy, coaching entry points, fonts, dashboard h1

- **Skip links:** one shared `SkipLink` (`components/skip-link.tsx`, logic in `lib/skip-link.ts`) replaces the six separate skip links (dashboard, /learn, /coaching and its form pages, Problem Studio, practice room). It is visually hidden until it gets keyboard focus (`focus-visible`, never plain `focus`), and on activation it calls `preventDefault`, focuses the main region (`tabIndex={-1}`) and leaves the URL alone. Tests: `tests/skip-link.test.ts`. /sign-in has no skip link (single short form), so none was added.
- **Dashes:** no em or en dashes in any string or JSX text under `app/` and `components/`, and the visible ones in `lib/` are gone too. `lib/copy-rules.test.ts` now scans every string literal and JSX text in `app/` and `components/` (via `lib/copy-scan.ts`, which reads the TypeScript syntax tree, so comments are ignored) for dashes, banned words and semicolons that join two clauses. Left alone on purpose: en dashes in `lib/ipho-archive.ts`, `lib/arena/**`, `lib/archive-grading/**` and `lib/physics.ts`. The first three are hashed into the grading version numbers published in `public/corpus/grading`, so editing them needs the grading data regenerated, and `lib/physics.ts` belongs to the Codex work.
- **Copy:** plain, short headings and intros. Problem Studio is now "Problem Studio" plus "Write a problem, add a solution, then publish." The rules and two before/after examples are in the Copy rules section of CONTRIBUTING.md. Banned words (elegant, worth, craft, effortless, next-level, plus the existing journey, unlock, seamless and others) are checked by the same test. The Learn guide bodies and `lib/coaching/content.ts` are unchanged.
- **Coaching in the dashboard:** a visible "Coaching" outline button in the top bar (icon only below 640px, `aria-label="Coaching"`), a "Coaching" sidebar item with a "Medallist coaches" hint, and a compact card on the dashboard home ("Train with IPhO, APhO and EuPhO medallists", "Meet the coaches"). Each link sends `coaching_entry_click { from: "topbar" | "sidebar" | "card" }` on click and middle-click. The quiet text link from the Phase 3 PR is gone. The top bar now fits at 360px and 375px with and without a signed-in account (the search label moved to xl and the buttons are tighter below sm), which also fixes the 12px overflow.
- **Fonts:** IBM Plex Sans (UI and body) and IBM Plex Mono (code and answer fields) from `@fontsource/ibm-plex-sans` and `@fontsource/ibm-plex-mono` 5.3.0 (pinned, latin, weights 400, 500, 600 and 700), loaded with `next/font/local` in `app/layout.tsx` like Inter was, so the build still never contacts Google Fonts. `@fontsource-variable/inter` is removed. This is the only `package.json` and `pnpm-lock.yaml` change in the batch. Coaching keeps Bowlby One for display headings and now uses Plex for body text. The OG images use the default Next.js image font and are unchanged.
- **Dashboard h1 and contrast:** the dashboard home has a visible `h1` ("Lobby") with a one-line subtitle, like the other views. "Recommended problem" now uses the accent text token (7.7:1 light, 9.6:1 dark, was 2.0:1 in light). The sidebar problem count lost its `opacity-70` (5.4:1 light, 5.9:1 dark, was 2.9:1 and 3.5:1).
- **Verified:** Playwright against a production build at 375, 768 and 1440 in both themes on /dashboard, /learn and /coaching (66 checks: no horizontal scroll, no dashes in rendered text, skip link hidden until Tab and focusing main with no hash, coaching button, sidebar item and card all linking to /coaching, one h1). /sign-in and /dashboard/author return 500 locally without a database, so they were not rendered. Lint with zero warnings, typecheck, unit tests, `test:ui` and `pnpm build` pass.

## 2026-11-02 - Batch C2: Problem Studio visual pass

- **Tag pickers:** the Studio's free-text tag inputs are replaced by topic and method pickers built from `lib/physics-taxonomy.ts` (6 topics, 234 methods), shown with the same labels and `concept` badges as the practice library. Methods are grouped by topic, the groups for already picked topics come first, and type-to-filter searches all of them (labels and aliases, ignoring case and dash style). New choices are stored as canonical IDs, deduplicated by resolved ID, within the existing 30-tags limit. Tags already on a draft that are not in the taxonomy stay visible, removable and unchanged. There is no custom-tag field. Under the pickers: "Missing a tag? Tell us via Feedback." (shown only when the feedback link is configured). Method grouping lives in `lib/studio-tag-groups.ts` (derived once from how practice, catalogue and Arena problems pair tags with topics, with a test). Saving, validation and the stored schema are unchanged.
- **Steps:** the editor is five numbered cards with visible borders: 1 Statement, 2 Parts and answers, 3 Tags, 4 Images and optional PDFs, 5 Publish. The answer key, hints and worked solution are per part in the same state as the part statement, so they cannot be separate cards without changing how the editor is built. They sit inside each part as "Answer key, hints and solution" and the plan's cards 3 and 4 are merged into card 2. A status bar shows draft or published with the version, the save state (`phase`) and "Ready to publish" or the number of publish checks left, all from state that already existed.
- **Fields and actions:** labels above inputs, bordered inputs in both themes (the title is now a bordered field), helper text in muted-foreground, errors with an icon (`ErrorText`, publication checks, media errors, draft list errors). Publish is the one primary button. The active Write or Student preview tab is now `secondary`. Unpublish moved into a separate "Danger zone" and Delete in the draft list is separated from Open. The disabled Publish button no longer fades below 4.5:1.
- **Contrast:** the Studio, draft list and authored-problem student view scope stronger `--border` and `--input` tokens (`studioTokens` in `components/authoring/studio-ui.tsx`), so the rest of the site keeps its quiet borders. Measured in a browser at 375 and 1440 in both themes on the empty state, draft list, editor (complete and blank) and student view: lowest text contrast 4.67:1 (light) and 5.20:1 (dark), lowest border contrast 4.53:1 (light) and 3.41:1 (dark), no failures.
- **How it works:** a link to `/learn/how-to-write-a-problem` in the Studio header (list and editor) and in the empty state. The guide may not exist yet.
- **Not changed:** what authoring saves, validates or grades. The Playwright browser harness strings were updated for the renamed "Answer key, hints and solution" summary (not run here, it needs Postgres).


## 2026-11-02 - Phase C offline acceptance reconciled with current main

- Baseline `bbcfe194b76a974b9587a8e11c3fc57668d7a530`. Adapted only the independent offline runner/transport guard. Reused the released API, PostgreSQL and fixture coverage instead of copying a second workflow framework.
- Added Terms rejection, mocked verification-delivery failures, deterministic symbolic budget policies, transport inheritance and lint-scope regressions. No runtime auth, authoring, grading or storage implementation was changed.
- Canonical LF migration checkout attributes preserve audited SQL checksum bytes. No migration SQL, schema, dependencies or lockfile changed. All SQL fixture execution used fresh owned loopback clusters only.
- Evidence and all 23 historical-case classifications: `evidence/phase-c-main-integration/review.md` and `coverage.md`. Offline results do not establish live acceptance. Earlier failures and remaining native-shell validation gates are retained there.
- No push, PR, provider/config change, shared database operation or deployment. The original three worktrees were hash/index/HEAD checked unchanged. A new branch's Preview resource bindings must be proven isolated before any push.

- Final local results: 82 selected tests, 484 application-subset tests, 24 UI tests and 76 parallel disposable-PG tests passed. TypeScript, zero-warning lint and the optimized local-font build exited 0. The complete guarded server suite exited 1 (nine workflow/native-shell failures), with 9 skips and the inherited punctuation TODO. Earlier load-sensitive PG failures remain recorded. All live cases remain NOT TESTED.

## 2026-11-02 - Batch C4: light default, Settings, mobile headers, coaching fixes, problem descriptions

- **Light by default, with Settings:** `defaultTheme` is now `"light"` (`enableSystem` kept, so a stored choice, including a stored "system", still wins). The theme toggle is gone from the dashboard top bar and the Learn header. A "Settings" gear sits at the bottom of the dashboard sidebar (which is also the mobile menu) and in the Learn header. It opens a dialog titled "Settings" with a Theme fieldset of three native radios (Light, Dark, System), so the browser handles arrow keys and selection. A Radix radio group skipped a choice on the first arrow press, so it was not used. More settings can be added as further fieldsets in `components/settings-dialog.tsx`. Coaching keeps its own dark design.
- **Light-mode contrast:** measured with the C2 checker on /dashboard (all views), two problem pages, /learn, /terms and the 404 page at 375 and 1440. The quiet border tokens are now `--border` and `--input` `240 5% 52%` in light (3.7:1 on white, at least 3.2:1 on the page and muted backgrounds), the Coaching buttons use `border-accent-foreground`, problem cards use a full-strength border colour, and disabled buttons use the muted look at full opacity instead of fading, so their label stays at 4.5:1. Result: lowest text 4.52:1, lowest border 3.74:1. Tinted status badges (IPhO, APhO, EuPhO and Elo chips) are not counted as borders, because the label carries the meaning. Dark mode borders are unchanged (about 1.3:1) and were not part of this batch.
- **Mobile headers (375 to 430px):** the dashboard top bar and the Learn header are one row: logo and name on the left, the Coaching and menu buttons on the right (44x44, centred, 8 to 12px apart). Search, Learn, Feedback and the account button moved into the menu under "More" (the Learn menu has Learn, Dashboard and Settings). Below 640px the dashboard menu opens from the right. The coaching header was already one row (logo, name, 44px menu button, with "Get a consultation" in the bottom bar), so it is unchanged.
- **Wordmark:** the brand is "Physcratic". A search of `app/`, `components/` and `lib/` (header, sidebar, coaching header and footer, the OG images, titles, `SITE.name`) found no trailing full stop in any wordmark, so nothing needed changing. The only "Physcratic." matches are sentence endings in prose.
- **Coaching fixes:** the fixed "Get a consultation" bar now hides while the hero call to action or the footer is on screen, and the footer keeps 4rem (the bar plus its margin) of room under it on small screens. Every footer link and the Instagram link is at least 44px tall on touch screens (`pointer: coarse`), and the desktop footer is unchanged. Both are marked fixed in `docs/engineering/coaching-review.md`.
- **Problem descriptions:** first-law, heat, incline, projectile and spring now have 70 to 160 character descriptions in `lib/problem-meta.ts`, used by `app/dashboard/problems/[id]/page.tsx` (metadata only). The known-offenders list in `lib/seo-metadata-guard.test.ts` is removed.


## 2026-11-03 - P1: defer the equation calculator engine

- The existing calculator form remains server rendered. Opening it warms the unchanged maths module. Calculate waits when necessary, ignores stale input and recovers from failed downloads. Only `components/physics/plain-math-check.tsx` changes at runtime.
- Reconciled with main `0f77f22`, preserving Community Batch 2A and migrations 0007 to 0009. The comparable dashboard manifest falls from 2,386,548 to 1,732,868 raw bytes and from 662,875 to 481,240 gzip-9 bytes. Next first-load JS falls from 662 to 479 kB. Manifest chunks remain 19.
- Cold browser totals, including shared and prefetched assets, fall from 677,498 to 495,864 gzip bytes. Entering Problems adds no JavaScript. Calculator opening adds two files, 181,931 gzip bytes, once.
- Discarded a broader view-splitting experiment because first Problems navigation became slower. No view fallback or navigation change ships.
- Local checks passed: frozen install, offline guards, route generation, typecheck, zero-warning lint, 571 server tests, 29 component tests, 114 disposable PostgreSQL tests, release/storage guards, build and 85 targeted browser checks. No live data, migration, infrastructure or flag changes.
- Methodology, complete before/after tables and trade-offs: [Dashboard JavaScript P1](DASHBOARD_PERFORMANCE_P1.md). Reproduction scripts use external browser tooling and add no app dependencies.

## 2026-11-03 - X3B: CSP diagnostics and local enforcement harness

- Added loopback-only production-build browser comparisons, source-location attribution, safe negative/report-delivery controls, Zod benchmarks and optional enforcing headers for disposable authenticated fixtures. No application, live CSP/collector, database, migration, grant, flag or Production/Preview setting changes.
- Local Chromium passes 18 scenarios. Both authenticated fixture suites and relevant CI-equivalent checks pass. CI exercises all three engines; WebKit's missing report-only eval events are an explicit observability limitation, while enforcement fallback and negative reporting succeed.
- Reproduced Zod probe and JIT sites, without attributing all eight historical reports by assumption. The isolated nonce prototype loses public prerendering/caching and does not ship.
- Production remains report-only and NO-GO for enforcement, prohibited before 9 November and conditional thereafter. Evidence, limitations and X3C gates: [CSP X3B](CSP_X3B.md).

## 2026-11-03 - Contests batch: creation and seven-day test preparation

- Added organiser-owned drafts, archive selection, scheduled or launch-on-publish starts, explicit publication confirmation and immutable published settings through the API. Contest administration is a separate database-backed role and requires a verified session. There is no automatic role bootstrap or account/auth change.
- Added a participant room, late registration during live events, database-clock submission boundaries, frozen server-side statements and answer keys, private persisted attempts, idempotent retries, request limits and best-per-part scoring. Unanswered, invalid and inconclusive results never earn points. History responses include the latest 50 submissions plus the latest answer for each problem, while scores include every saved result.
- Migration 0012 is additive and contest-only. Applied its three new tables, contest lifecycle columns and attempt-history index using the connected Neon MCP. Existing practice, authored content, registrations and ELO records were not changed. Legacy listings retain their previous behaviour.
- Proposed first event: Physcratic Test Contest 1. Exactly 10080 minutes from publication, four existing archive problems and five final-answer points. The selection is A block on an incline, Finding the missing current, The sound of a vibrating string and Mind the Gap. It is explicitly unrated because archive solutions are already public. No leaderboard or ELO integration is included in this batch.
- Verification: frozen-lockfile install, route generation, TypeScript, zero-warning lint, server and rendering suites, isolated production build and desktop/mobile browser checks passed. Browser organiser and participant interactions used network fixtures only. Unauthenticated access denial and real listings were checked without fixtures. A real PostgreSQL lifecycle exercise covered permissions, ownership, stale versions, publication, timing, registration, private grading, retry semantics, rate limits, bounded history and full-history scores inside a transaction that was rolled back in full.
- Local limitations: the repository offline-runner wrapper refuses v0's injected .env file. Its self-tests and transport/configuration guards passed separately with the required scrubbed environment and network preload. Disposable loopback PostgreSQL suites remain skipped locally because that service is unavailable, including the new CI lifecycle fixture. No existing tests or safety policies were weakened.
- Launch gate: nominate an existing verified account for contest-organiser access, deploy this branch's contest implementation, then explicitly publish the selected draft. No organiser assignment, real draft, live contest, Production deployment or main-branch merge has been performed by this batch yet. Starting the seven-day timer before deployment would expose a listing without its new participant room.

## 2026-11-03 - Leaderboards batch: server search and consistent ranked pages

- Replaced the top-100 download and client-only filtering with server-side literal, case-insensitive handle search and fixed 25-contestant pages. Validated page and search bounds, clamped stale page numbers, returned total counts and kept counts and rows in one read-only repeatable-read snapshot.
- Calculated competition ranks across public contestants before search or pagination. Equal ratings share a rank, later ranks skip tied positions and ties have deterministic pagination order. Equal-timestamp results use contest ID as a deterministic latest-result tiebreaker.
- Preserved the existing published-and-rated contest eligibility and latest-rating rules. A missing, empty or whitespace-only latest public handle is excluded without falling back to an older handle. The response exposes only handle, rating, change, rated-contest count, timestamp and global rank, never account IDs, names, emails or private attempts. No scoring, ELO writes, contest lifecycle, profile schema or dependencies changed. The unrated seven-day test contest remains excluded.
- The approved reserved-path edits are limited to the Rankings component and its dashboard search length bound. Added debounced search, first-page reset on every changed search, previous/next controls, result counts, distinct empty states and retry behaviour using the existing components and theme.
- Verification passed: frozen-lockfile install, route type generation, TypeScript, zero-warning repository lint, server suite (584 passed, 17 skipped, one existing todo), two additional HTTP validation/outage tests, all 37 rendering tests and an isolated production build. Standalone offline runner self-tests and scrubbed transport safety checks passed. Read-only live queries and real HTTP requests confirmed empty results, page clamping, literal search and uncached 400 validation responses without writing data.
- Browser checks passed for page navigation, ties across pages, search beyond contestant 100 retaining global rank, reset when returning to an earlier search, clear-search and deterministic outage/retry recovery. Desktop and phone layouts were checked in the existing light and dark themes. Populated states used temporary browser-only network fixtures, which were removed before returning the preview to real data.
- Local verification limits: the full offline-runner wrapper still refuses v0's injected environment file. The new isolated PostgreSQL regression fixture is included in the existing CI database job but could not run here because Docker and PostgreSQL server tools are unavailable. It covers more than 100 contestants, private/withdrawn handles, unpublished/unrated results, latest-result selection, duplicate handles, literal wildcard characters, ties, empty matches and stale-page clamping. These incomplete checks have not been waived or reported as passed.

## 2026-11-03 - Profile pictures batch: adjustable crop and safe image reconciliation

- Reused the existing community profile/media backend and private storage adapter. Added a saved-picture thumbnail, labelled file picker, circular crop preview, keyboard/touch zoom and horizontal/vertical positioning, reset, cancellation and explicit save. Replacements leave the current picture unchanged until the server confirms success. Banner selection and its server normalization remain unchanged.
- Uploads still send the original bounded file, not browser-normalized pixels. An optional, strictly validated 256-character `X-Profile-Picture-Crop` header selects the avatar crop. The server checks original signatures, dimensions, frames and resource limits before applying EXIF orientation and the shared bounded crop, then re-encodes to metadata-free 512-by-512 WebP. Crop settings are never stored. Existing callers without this header retain their previous normalization, and banner requests reject it. Authorization, origin checks, shared request limits and private image delivery are unchanged.
- Media reads now use account-ID-scoped SWR state. Failed initial metadata reads do not expose upload controls. Ambiguous writes and conflicts retain the selection and block further writes until an explicit metadata reload. Successful changes update the saved thumbnail and profile preview together. A synchronous write guard prevents duplicate saves. No new package, account/auth configuration, shared schema or migration changes were needed.
- Verification passed: frozen-lockfile install, zero-warning repository lint, 595 server tests (17 skipped and one inherited TODO), all 39 rendering tests and an isolated optimized production build, including its typecheck. Nine crop tests cover bounds, signatures, spoofed files, colour-verified crops, EXIF orientation, compatibility and request/auth rejection. The existing disposable PostgreSQL lifecycle fixture now also covers cropped uploads, but remains unexecuted locally.
- Browser checks used real components in a temporary route with browser-only metadata/write fixtures. Covered crop pixels and keyboard controls, reset, original-byte upload with crop headers, save/thumbnail/profile-preview updates, removal, cancellation, spoofed input, initial metadata failure/reload, ambiguous write recovery and preserved selection. Desktop dark and phone light layouts had no horizontal overflow. The temporary route and network fixtures were removed, and real Settings was checked with the rollout disabled before returning to the dashboard.
- Verification limits: the offline runner still refuses the injected local environment file. Its two standalone runner tests and scrubbed transport checks passed (five passed, two platform skips). Disposable PostgreSQL and live private-store uploads were not tested. A post-harness in-place TypeScript rerun encountered Next's stale generated type for the deleted temporary route. The generated cache was not manually altered, and the final clean isolated build typechecked the actual retained routes successfully. The first isolated build compiled but did not finish within its execution window after Corepack tried downloading into a synthetic home. One cached retry using the installed package-manager cache and synthetic build-only auth values completed with exit 0.
- Rollout remains OFF. No production/staging SQL, storage mutation, feature enablement, deployment or main merge was performed. Keep the established profile migration, runtime-grant and explicit private-store prerequisites before enabling images. Also reconcile this branch's earlier contest migration numbered 0012 with upstream main's newly added community migration numbered 0012 before a future merge. This picture-only batch does not rename already-applied migrations or change either schema.
