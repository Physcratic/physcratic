# P4A Olympiad archive

12 November 2026. Based on main d663684. Draft only, no merge or manual deployment, no P4B.

The archive moves from the invisible `(discovery)` route group to `app/problems/archive`, so only this route uses the existing Dashboard Layout. The discovery layout, six topic pages and `/problems` implementation remain unchanged. The Open Graph image moves without content changes. Metadata and JSON-LD remain the same.

`ArchiveDirectory` is server-rendered and uses the public registry for all 103 imported memberships, retained display titles, competition/year grouping and numeric problem order. Existing OlympiadProblemCard supplies source code, language notices, tags, estimated rating and verified host flag from the existing catalog/host/rating helpers. No new API, independent rating calculation or duplicated collection model. Competition and year jump links use native fragments, preserve the existing year IDs and clear the sticky header. Every card opens the existing reader URL directly. Full source statements and official PDF links remain accessible on those readers.

Verification includes focused metadata/robots/sitemap/structured-data and SSR tests, TypeScript, zero-warning lint and a production build. The existing production-library browser workflow also runs the new archive browser suite against real production-mode routes: all 103 reader HTTP responses/canonicals, SSR links and titles, source labels, existing ratings, verified hosts, order/fragments, no-JS reading, keyboard skip/focus, axe and no overflow at 375/768/1440 in both themes. It retains the P3 library/session regression gate. Before captures at 375/1440 in both themes are preserved separately; after captures and server HTML are CI artifacts. Exact results/head/CI links are recorded in the draft PR.

Independent critical review found a jump-link accessible-name issue, corrected to retain visible Olympiad acronyms. No other confirmed blocker was found.

Known navigation inconsistency for owner review: the reused sidebar's Problems and topic links still target Dashboard query routes, while the archive's return link goes to public `/problems`. Existing routing contracts are preserved. The previously documented native IPhO 2026 reader source-label mismatch remains outside P4A, with no source metadata edits here. Actual Google indexation/Search Console are UNKNOWN. No production smoke or deployment claim is made.
