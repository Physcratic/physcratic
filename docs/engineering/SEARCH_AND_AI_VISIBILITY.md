# Search and AI visibility

How Physcratic's public pages are built so that search engines and AI crawlers can read them with no JavaScript. Phase 8, written 7 November 2026.

## URLs

| Page | URL | Built |
| --- | --- | --- |
| Home | `/` | On every request. Signed-out visitors and crawlers get the landing page. Signed-in users get the Lobby. |
| Problem library | `/problems` | Static |
| Olympiad archive | `/problems/archive` | Static |
| Topic | `/problems/topics/<slug>` (`mechanics`, `electromagnetism`, `waves`, `thermodynamics`, `optics`, `modern-physics`) | Static |
| Practice, Arena and archive problem | `/dashboard/problems/<id>` | Static, from `generateStaticParams` |
| Published authored problem | `/dashboard/authored/<uuid>` | Dynamic, `noindex`, not in the sitemap |
| Learn | `/learn`, `/learn/<slug>` | Static |
| Coaching | `/coaching` and its two form pages | As before |
| Signed-in app | `/dashboard` and its `?view=` and `?topic=` forms | `noindex, follow`, not in the sitemap, links still work |

Archive problems keep the URL they already had (`/dashboard/problems/ipho-2025-t2`). It already holds the olympiad, year and problem number, so no slug URLs were added.

## One model for every problem

`lib/seo/problem-pages.ts` builds a `ProblemPage` for each of the 130 problems (12 practice, 18 Arena, 100 archive). The sitemap, `llms.txt`, `llms-full.txt`, the library pages, the metadata and the structured data all read it, so a problem cannot be in one place and missing from another. `lib/seo/public-routes.ts` adds the other pages and is the single list behind the sitemap.

## What the HTML holds before any script runs

Every problem page: breadcrumb, the h1 (the official title as written), the statement, 3 to 5 related problem links and a link to the topic page. The answer boxes, the pad, checking and the worked solution load as before. Solutions are not in the HTML.

| Kind | Statement in the HTML | Figures |
| --- | --- | --- |
| Practice | The prompt, from the existing reader, which renders on the server | None |
| Arena | The statement through `ArenaDocument` with `staticFigures`, KaTeX HTML plus MathML | Plain `<img>` with the alt text from the source |
| Archive | A "Statement as text" section: the text taken from the official PDF, plus the source line "IPhO 2025, Problem 2. Official problem (PDF)" with a link to the official file | The PDF pages as `<img>` with alt text, in a closed `<details>`, lazy |
| Published authored | The published revision, read on the server through the same public read the API uses | As in the workspace |

Archive statements come from PDFs, so the text is the PDF's extracted text, cleaned by `lib/seo/statement-text.ts` (header block, page numbers, wrapped lines, soft hyphens, ligatures). It is not KaTeX, because there is no TeX source. Equations and figures read better in the PDF pages, and the page says so. EuPhO papers hold a whole day on shared pages, so the text is split per problem. Two IPhO 2017 papers (problems 2 and 3) have almost no extractable text, because the statements are mostly images. They stay in the library and are `noindex` and out of the sitemap. `lib/seo-problem-pages.test.ts` limits that to 5 pages.

Titles: `Cox's Timepiece, IPhO 2025 Problem 2 | Physcratic`. When that is over 60 characters the year label shortens to `P2`, and then the title is cut at a word. Papers with no descriptive title use `IPhO 2007 Problem 2`. All-caps multi-word titles are set in title case in the `<title>` only. Descriptions are 70 to 160 characters, built from the opening of the statement, and unique.

## Structured data

Built in `lib/seo/json-ld.ts` from the same strings the page shows, and validated by `lib/seo-structured-data.test.ts`.

| Page | Types |
| --- | --- |
| Home | Organization, WebSite |
| Problem | BreadcrumbList, LearningResource (name is the h1, `isBasedOn` is the official file for archive problems, `isPartOf` the olympiad and year, `dateModified` from the data) |
| Library, archive, topic | BreadcrumbList, CollectionPage with an ItemList |
| Learn article | BreadcrumbList, WebPage (with `reviewedBy` where a reviewer is recorded), Article with author, publisher and dates |
| Coaching, Learn hub | As before |

## Sitemap, llms.txt, robots.txt

- `/sitemap.xml`: every indexable page, no query strings, `lastmod` from the data (a problem's import date, a guide's updated date). Practice problems, library pages and coaching pages have no date in the data, so they have no `lastmod`.
- `/llms.txt`: a short index under 5 KB (a test in `lib/public-discovery.test.ts` keeps it there). `/llms-full.txt` lists every page in the sitemap, one line each.
- `/robots.txt`: explicit groups for Googlebot, Bingbot, OAI-SearchBot, GPTBot, ClaudeBot and PerplexityBot with the same rules as `*`. It is built at build time, so it needs `VERCEL_ENV=production` during `pnpm build`. There is no middleware, and the CSP is report-only.

## The home page and caching

`app/page.tsx` reads the session cookie. With no cookie it never touches the database. Next sends `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` for it, and `lib/seo-home-audience.test.ts` fails if the page or `next.config.ts` ever makes it cacheable. `tests/home-session.live.mts` proves it on a real build with a disposable database: a signed-in fetch gets the Lobby, a signed-out fetch straight after (and 24 alternating concurrent ones) gets the landing page with none of the user's name, email, id or token.

## Published authored problems

The statement is in the HTML, but the page stays `noindex` and out of the sitemap. Indexing them should wait for a quality bar, for example staff-approved, or solved by enough people. Until then a student can share the link and a crawler can read it, but a search engine is told not to list it. When the bar exists, indexing is a metadata change on `app/dashboard/authored/[id]/page.tsx` plus a place in `lib/seo/problem-pages.ts`.

## Things to know

- The problem pages are built at build time, so the community feature flags they read (`COMMUNITY_*`) are fixed for a deployment. They were already environment variables, so a redeploy was already needed to change them.
- The archive statements are the competition organisers' problems. `rightsStatus` in the catalogue is still `permission-review-required`, and the pages say where each problem comes from and link to the official file. Rendering the text as indexable HTML makes that review more pressing.
- `lib/public-problem-metadata.test.ts` and `lib/public-discovery.test.ts` pinned the old title, description and `llms.txt` size. The first now reads the problem model. The second is unchanged.

## How to check

```bash
pnpm exec tsx --test tests/seo-nojs-render.test.ts
pnpm run test:server
VERCEL_ENV=production pnpm build && VERCEL_ENV=production pnpm exec next start -p 3100
BROWSER_TEST_ORIGIN=http://127.0.0.1:3100 pnpm exec tsx --conditions=react-server tests/seo-nojs.live.mts
node scripts/check-seo.mjs http://127.0.0.1:3100
SWEEP=1 BROWSER_TEST_ORIGIN=http://127.0.0.1:3100 node tests/solve-contrast.browser.mjs
```

The two database checks need a disposable PostgreSQL (see `scripts/test-problem-authoring.sh`):

```bash
DATABASE_URL=postgresql://postgres@127.0.0.1:<port>/<name with test in it> pnpm exec tsx --conditions=react-server tests/home-session.live.mts
DATABASE_URL=postgresql://postgres@127.0.0.1:<port>/<name with test in it> pnpm exec tsx --conditions=react-server tests/authored-ssr.live.mts
```
