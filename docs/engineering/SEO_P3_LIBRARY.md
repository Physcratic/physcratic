# P3 public interactive problem library

12 November 2026. Branch `codex/p3-interactive-library`, based on fetched main `c577f0b` (including the separate operator-preparation package). P3 only. One draft PR, no merge or deployment. Exact tested head and GitHub run links are recorded in the PR.

## Architecture

`/problems` reuses the Dashboard Layout and the existing ProblemLibrary, UnifiedArenaCollection, OlympiadCatalog and CorpusCollection. It adds no collection API or second catalog. Public archive actions navigate to existing reader URLs; Dashboard archive inline reading remains available. An invisible `(discovery)` route group preserves the archive/topic pages' original narrow layout and URLs. Their page/image/layout bodies are unchanged.

The heading, introduction, JSON-LD and expandable native HTML directory render on the server. The directory is derived from `allProblemPages()` and `topicsWithProblems()`, with all 18 Arena and 103 archive reader anchors and all six topic links. Without JavaScript, users expand the directory and follow normal links. Interactive filters use Suspense, with a directory instruction in its server fallback. Community publications continue through the existing gated Arena API and retain their reader/publication policies; they are not added to the static directory or sitemap.

A small shared URL helper makes collection, search, tag/topic, competition, rating band and Guided Exercise selection restorable through reload/history. Text edits replace the current history entry; collection/topic-chip/rating/exercise actions push an entry. Other query parameters, entry pathname and fragment remain intact. Search terms equal to `all` remain literal search text. The URL is authoritative, including when Dashboard filters are cleared. No private state goes into URLs.

Private progress remains client-fetched through the existing account-keyed hook and private/no-store API. Guided Exercise edits are discarded on account changes before the next render commits, preventing a prior account's unsaved draft from surviving a mounted session switch. No auth, grading, rating, authoring, publication, schema, credential or feature-flag changes.

## Contracts and verification

The dated content baseline remains 121 static reader pages, five existing Guided Exercises, 12 retired legacy reader redirects and 138 sitemap URLs. Two thin archive pages remain noindex. `/problems` retains its metadata, canonical `/problems` and index/follow policy. No reader URLs or sitemap inclusion policies changed.

Automated coverage includes URL parsing/updates, server directory rendering, canonical/robots/sitemap/retirement tests, real production-browser filtering and reader navigation, archive pagination coverage, back/forward/reload, native no-JavaScript navigation, transient collection failure/retry, keyboard skip link, zero serious/critical axe findings, both themes at 375/768/1440px, and synthetic A/B/guest HTML/RSC and mounted cross-tab session isolation. The new focused GitHub workflow runs the production-browser/session gate on disposable PostgreSQL and uploads screenshots. Existing full CI and community browser gates remain intact.

Independent critical review found the initial-props filter-reset regression; the final implementation removes that fallback and tests both entry routes. It also prompted the account-draft reset and real mounted account-switch regression. No remaining confirmed implementation blocker was found in the final review.

## Limits

No production service, shared database, provider setting, deployment or external user data is used. Production community activation prerequisites remain owner-operated and unchanged. The existing native IPhO 2026 provenance-label mismatch in the broad historical no-JS source-label audit remains outside P3; retained route/metadata/content coverage is checked separately. Actual Google indexation, rankings and Search Console data are UNKNOWN. Pagination within existing collections retains its existing local behavior; collection and filter state, Guided selection and normal reader navigation are the URL/history contracts covered here. Stop after the draft PR and report, with no P4.
