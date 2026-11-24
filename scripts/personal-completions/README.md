# Personal completions, Phase 1

The private API stores self-reported completion for Arena originals and published community problems. `0024` creates an empty three-column completion table and a separate per-account write limiter. Both cascade when the existing account-erasure transaction deletes the account. Community marks use the stable problem key and survive republication. History hides unavailable problems. An owner can still remove an unavailable mark by key.

## API contract

`PERSONAL_COMPLETIONS_ENABLED` defaults off. Disabled requests return 503 before loading session or database bindings. All replies are private and no-store. Reads and writes use the current Better Auth session and require `X-Community-Account` to match it. The header only rejects stale views. Writes also require a verified account, the approved origin and a JSON body of at most 2 KiB. The shared account limiter allows 60 valid write requests per minute and returns 429 with `Retry-After` when exceeded.

- `GET /api/personal-completions?key=<key>` returns `{key, completed, completedAt}` for a currently available problem. An unmarked problem has `completedAt: null`.
- `GET /api/personal-completions` returns `{count, items, nextCursor}`. The list contains up to 24 visible `{key, title, href, completedAt}` entries, newest first with the key as a tie-breaker. Send `?after=<nextCursor>` for the next page. The count and page use the same database snapshot. This is a live history cursor. Refresh after changes to pick up new entries or publication changes.
- `PUT /api/personal-completions` accepts `{key, completed}` and returns the same status shape as the single-problem read. Repeated marking keeps the timestamp. Unmarking an absent row succeeds, including for an unavailable problem with a valid key.

## Runtime review

The [grant proposal](runtime-grants.review.sql) affects only the two new tables. Completion timestamps use the database default and the application role can insert only the account and key. The limiter can update only its counter and window. The existing account and publication read and row-lock privileges cover the remaining queries. The deletion service needs no direct access to either table.

Run the existing approved runtime audit for the actual baseline before any separately authorized grant. If grants are later approved, the existing audit will report the new completion privileges as outside that baseline. Reconcile only the entries covered by the [read-only delta](runtime-delta.readonly.sql), which must return no findings for the actual LOGIN. Treat any additional finding as a blocker. Keep the historical audit and migration evidence pinned to their original sources.

Independent review and exact-head CI are required before integration. Production activation also requires separate owner approval of the migration, grants, serving configuration, operational account erasure, and backup/restore reconciliation. Disable the feature to roll back exposure while preserving rows. The down migration refuses to drop completion records.

## Phase 2 reader and settings

Verified students can mark or unmark a problem from either reader. Settings shows the current account's count and linked history even without a public profile. Successful writes update the reader and invalidate cached history for that account. Grading and worked solutions are independent of personal completion. Arena card indicators and ordering belong to Phase 3.

The Arena reader is statically generated and evaluates the UI flag at build time. The API checks it at runtime. Qualify the reader with matching build and serving settings. The browser test runs on a local production build and uses a fresh disposable database. Run once with the flag set to `true` locally and once with it unset at both build and serving time. The off check uses the old schema.

```bash
AUTHORING_BROWSER_TOOLS=/path/to/external-browser-tools \
  bash scripts/test-problem-authoring.sh node --require ./tests/server-only-register.cjs --import tsx tests/personal-completions.browser.mjs
```
