# P4B topic pages

12 November 2026. Based on merged P4A main bc7ee7a. Draft only, no merge, manual deployment or P5.

The six topic routes move out of `(discovery)` into `app/problems/topics/[slug]`. The now-empty old layout is removed. Each uses the established Dashboard Layout and one server TopicDirectory. No API or client filter state is added. Root, library and archive implementation files remain unchanged, as do Dashboard topic-query routing contracts.

Registry `problemsInTopic` supplies membership, retained titles, reader paths and counts: Mechanics 22, Electromagnetism 23, Waves 18, Thermodynamics 19, Optics 19, Modern physics 20. Arena cards reuse ProblemCard and existing Arena summaries/tags/rating helpers. Imported cards reuse OlympiadProblemCard, with the same registry title override as the archive. Existing catalog/host helpers retain competition, language notices, tags, estimates and verified flags. No statements, PDFs, sources, solutions, ratings or publication/auth/grading contracts change. Retired legacy problems remain excluded.

Static params, slug/404 handling, metadata copy, canonicals, JSON-LD and Open Graph image implementation stay intact. All cards and their native reader links are server-rendered. No hidden fallback directory or client-only pagination is needed for 18–23 cards per page. The 138-URL sitemap stays unchanged.

Verification covers focused SEO/metadata/sitemap/structured-data and SSR tests, TypeScript, zero-warning lint, production build, each topic's exact card membership/count, no duplicates or retired links, headings/metadata/image routes, 404, 138 sitemap URLs, no-JS navigation, both Arena/archive readers and keyboard/axe/no-overflow at 375/768/1440 in both themes. The existing production-browser workflow retains library/session and archive checks and adds the topic suite. Source diff guards preserve `/`, `/problems`, archive and all protected backend modules. Exact executed test counts, performance observations, screenshots and GitHub runs are recorded on the draft PR.

Before screenshots for all six pages at 375/1440 in both themes are committed under evidence/p4b. After screenshots additionally cover 768 and are uploaded with six server HTML captures and performance.json in the browser artifact. No real accounts or production services are used.

Independent critical review found the obsolete P4A assertion that topic pages have no sidebar. That test now expects the authorized shell. No other confirmed implementation blocker was found.

Known inherited shell limitation: breadcrumb/sidebar identifies Problems and topic navigation still uses Dashboard query routes, as documented in P4A. This phase does not broaden routing changes. Existing IPhO2026 reader source-label mismatch is unchanged. Measured local production HTML responses are 154–186 KB uncompressed and 16.5–18.2 KB gzip, compared with 55–62 KB and 8.2–8.7 KB before. Next reports 190 KB first-load JavaScript, the existing Dashboard/card footprint. Each topic renders only 18–23 cards versus the archive's 103. Per-page DOM/script observations are recorded in the browser artifact performance.json; these functional-run observations are not a Lighthouse or field-CWV qualification. Larger DOM/JavaScript remain monitoring observations, without adding pagination or another catalog. Actual Google indexation/Search Console are UNKNOWN.
