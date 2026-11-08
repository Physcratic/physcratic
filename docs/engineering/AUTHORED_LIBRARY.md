# Phase 7 authored problem discovery

> Removed on 5 November 2026: `tests/authored-library.browser.mjs` and its harness. They drove `components/authored/library-collection.tsx`, which nothing imports since the unified Arena change (commit `32283e0`), so the first assertion ("24 published problems on this page") could never be found. The library now lists community problems through `/api/arena/collection`, covered by the Arena tests and the sweep. The commands below are kept as the record of Phase 7.

Phase8A follow-up: exact difficulty input now preserves the published label's
edge whitespace; SQL/index semantics remain unchanged. Long titles wrap in both
cards and the reader. Independent review/follow-up completed, with33/33 PG and
both browser suites passing; no remaining confirmed finding. Earlier outstanding
review/build/lint/corpus notes below are historical. Current evidence and limits:
[Phase8A](AUTHORING_PHASE8A.md), [release gates](AUTHORING_RELEASE_BLOCKERS.md).

The existing dashboard library now has an **Authored problems** collection at
`/dashboard?view=problems&collection=authored`. The imported catalog, imported
pilot and quick-practice collections retain their existing filters, readers and
deep links. Authored results link directly to `/dashboard/authored/[id]`; the
reader returns to the authored collection. Existing verified submission and
explicit worked-solution controls are reused without changing their policies.

## Public query and privacy

`GET /api/authored-problems/library` is open to guests and accounts alike. It
accepts only `q` (200 characters), `tag` and `difficulty` (80 each), `provenance`
(`original`, `authorized`, or empty), and `after` (UUID). Duplicate/unknown
parameters and URLs over 4096 characters return a generic 400. Query strings are
parameters, never interpolated SQL. Database/validation failures return generic
503 responses without SQL or document diagnostics. Responses are private/no-store,
nosniff and noindex/nofollow. No browser persistent cache or dependency is added.

One SQL statement joins the exact current, same-problem revision pointer with
`state='published'`. It projects only problem/revision IDs and title, topic/method
tags, the existing author-estimated difficulty and provenance (including public
source and rights declaration). The shared public document field schemas and
explicit metadata serializer validate this subset. The query never joins drafts,
private parts, permission/reveal records or attempts, and does not select full
statements, attachment indexes, owners or private storage references.

Search uses PostgreSQL `simple` full-text word search with
`websearch_to_tsquery`, across title, tags, existing difficulty and source only.
It is case-insensitive word search, without stemming or substring matching;
quoted phrases and PostgreSQL web-search operators are supported. Rights text,
statements and private content are not searched. Tag filters match an exact
case-sensitive topic OR method tag; difficulty matches the exact existing label;
provenance filters match its existing kind. No new rating, Elo or popularity is
derived. The UI labels these semantics and uses bounded native inputs.

## Pagination and publication changes

Each query reads at most 25 metadata rows and returns at most 24, using the extra
row only to determine `nextCursor`. Immutable unique problem UUID ascending is
the deterministic order; `after` means `p.id > cursor`. It does not depend on
publication time, mutable titles, ordinal offsets or historical revision IDs.
There is a five-second client query deadline and the existing production pool's
connection/statement deadlines. No unbounded total/facet scan is added.

Every page uses its own current PostgreSQL snapshot. Republishing preserves a
problem's position and returns only its new current revision metadata; drafts do
not change published results. Unpublication removes it on the next query. This
is live keyset pagination, **not** a retained historical snapshot: publication of
an ID behind the cursor requires refresh/Previous to discover it. Surviving
already-published IDs ahead of the cursor are neither skipped nor duplicated by
other publication changes. Removed cursor rows do not invalidate the cursor.
Previous refetches its live page; refresh returns to page one. Filter changes
reset the cursor stack, and request identity, cancellation and active-effect
guards prevent obsolete responses from replacing current results.

Results are not prefetched into private routes. A publication can change after a
result was rendered: the existing reader independently loads/revalidates its
current pointer and displays its unpublished/deleted state without old content.
No historical revision or solution permission is carried from discovery into
the reader. Existing account verification, attempt IDOR protection and explicit
solution confirmation/assistance behavior remain unchanged.

## Indexing and rollout

New explicit additive `0006_authored_discovery` adds a partial published problem
UUID index, immutable public-metadata text-search function and GIN index, JSONB
containment GIN index and existing-difficulty expression index. Drizzle documents
the indexes; SQL remains authoritative. Index usability and up/down/up with
existing publications are tested. Down removes only these indexes/function and
does not alter content or history. No extension, schema push, startup/build
migration or external import is introduced.

The migration must be applied after 0005 using the existing reviewed ledger,
checksum and source-commit process, under separate environment authorization.
Only disposable local PostgreSQL was migrated here. An application without 0006 returns the safe unavailable state for word-search
requests; unfiltered/exact-filter queries remain safe but lack these indexes.
Deployment readiness includes applying the migration first. No shared/staging/production migration was run.

Authored reader metadata remains generic, dynamic and **noindex/nofollow** for
both published and hidden content. The API is also noindex/no-store. Publication
permits public library discovery but does not opt this interactive account and
permission surface into search engines. No authored sitemap, static generation,
cached revision metadata or site-wide SEO change was added. Public search-engine
indexing, if desired later, needs a separately reviewed statement-only surface
with current-publication checks and withdrawal handling.

## Verification and review

- After merging main: 34/34 attempt, solution-access and student-state checks.
- Phase 7 + legacy catalog/history: 19/19, including search/filter intersections,
  guest/account equivalence, bounded pages, draft/private/statement exclusion,
  malformed selectors, republish/unpublish/delete, retained UUID cursors,
  index usability and migration rollback/reapply.
- Final disposable PostgreSQL suite: 224 tests, 223 pass, zero failures/skips,
  one inherited corpus punctuation TODO. The defect remains unresolved and is
  deferred to Phase 8A; TODO is not evidence of a repair.
- Actual library + reader browser/production API factory + disposable PG: tabs,
  shared search, exact filters, cursor reset, previous/next, stale search
  cancellation, guest navigation/math, republish/unpublish, errors/retry/loading,
  legacy tabs, keyboard navigation and 1440/375px light/dark axe/overflow pass.
- Existing complete student/solution browser suite passes: verified accounts,
  submission/recovery/history/IDOR, approved explicit solution views, PDFs,
  assistance, account/revision changes and desktop/mobile axe/overflow.
- Typegen/TypeScript and diff checks pass. Lint remains blocked by missing
  ESLint; production build remains blocked by Inter/Google Fonts network access.
  No tracked workaround or dependency change was introduced.

A separate focused manual review pass checked query parameterization, exact
publication join, metadata allowlists, index expressions, keyset invariants,
response races, navigation and SEO. Corrected stale-effect completion guarding
and library tab contrast locally; final checks pass with no remaining confirmed
query/privacy/navigation findings. This was a separate pass by the implementing
agent, not a second independent reviewer. A second independent review remains
outstanding. Live Better Auth, private Blob, Vercel/staging and
deployment are outside the disposable harness's evidence.

Commands (run from repository root):

```sh
scripts/test-problem-authoring.sh node_modules/.bin/tsx --conditions=react-server --test lib/authored-library.test.ts lib/corpus-catalog.test.ts lib/problem-history.test.ts
scripts/test-problem-authoring.sh node_modules/.bin/tsx --conditions=react-server --test lib/*.test.ts
AUTHORING_BROWSER_TOOLS=/path/to/playwright-and-axe scripts/test-problem-authoring.sh node_modules/.bin/tsx --conditions=react-server tests/authored-library.browser.mjs
AUTHORING_BROWSER_TOOLS=/path/to/playwright-and-axe scripts/test-problem-authoring.sh node_modules/.bin/tsx --conditions=react-server tests/authored-student.browser.mjs
node_modules/.bin/next typegen
node_modules/.bin/tsc --noEmit
```

Stop after Phase 7's separate commit and push. Phase 8A/8B, PR, deployment and
shared/production migration work require a later request.

Final main refresh: `6af2b2cae95408ceea2081dffb7d1458d5f4f6ff` (error pages and
feedback link) integrated by a second safe merge
`2b42138b3eb3153b71a0f9f7ac0739c6fc1c59ad`. Both Git merges were conflict-free.
Temporary restoration of Phase7 changes conflicted only in
`docs/engineering/BETA_READINESS.md`; resolved by retaining both main's Batch2
entry and the Phase7 entry. Incoming product code preserved unchanged. No phase
commit was rewritten. Final regression/full counts below supersede earlier
pre-refresh counts where applicable.

Final refreshed-main regression:45/45 including the11 incoming feedback tests; final full224/223 pass with the sole inherited TODO and no failures/skips. Typegen/TypeScript and diff checks pass.
