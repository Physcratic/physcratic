# Archive student flow

15 November 2026. Base: `b707773d6adf0278a70a2e21ce511a8ccad7409d`. Branch: `codex/archive-student-flow`.

## Student task and change

Find an olympiad edition and open a problem. Previously the archive displayed every card with separate year jump lists under each competition. APhO/EuPhO students first jumped down the long list, then chose another jump link to reach a year.

One labelled native select offers all olympiads, all years of one olympiad, or a specific edition, newest first within each competition. “Show problems” submits an ordinary GET to `/problems/archive?edition=IPhO-2025#archive-results`. Only matching cards render, with the result count and selected edition. “Show full archive” resets the list. The select is keyed by the server selection so a client-side reset clears its displayed value too.

## Reasons for the elements

| Element | Student need |
| --- | --- |
| Combined olympiad/year select | Choose a valid edition in one control, without impossible competition/year combinations. |
| All-years choices | Browse a competition without choosing a year. |
| Explicit Show problems button | Commit a choice with keyboard, touch or a screen reader without navigation while exploring options. |
| GET query and results fragment | Share, reload and revisit the selection, landing at results below the sticky header. |
| Show full archive link | Recover the complete list with one action. |
| Topic/difficulty search link | Reach the existing library for a different search task. |
| Three competition jump links in the complete list | Keep navigation useful when browsing everything. Historical year fragment targets remain. |

Repeated year navigation is removed. Existing cards, ratings, titles, verified hosts, original documents and reader URLs are reused. The default archive still renders every record and reader anchor without JavaScript. Invalid, repeated or unavailable edition values recover to the full archive. No client filter state, API, dependency or account-data write is introduced.

## Rendering and verification

The archive route now reads Next search parameters and renders on demand. Canonical and Open Graph URLs stay `/problems/archive`. Structured list membership matches the displayed selection. Sitemap and reader metadata are unchanged.

Local verification: frozen pnpm 10.34.9 installation, focused selection/copy/server-render checks (24 passes), server suite (988 passes, 31 database skips, one inherited TODO), components (205 passes), offline safety guards, type generation/TypeScript and zero-warning lint pass. Initial synthetic production build passes. Final Node 22 build and exact-head CI results are recorded on the PR.

Local Chromium fails before page load because its process-singleton Unix socket is prohibited. No local visual or physical-phone pass is claimed. Existing production-library CI retains default-page/source/fragment/no-JS/metadata/reader/session coverage. New archive checks cover keyboard GET submission, selected cards and structured data, reload/history, reader return, reset, invalid queries and no-JS filtering. Guest and real synthetic verified sessions run the filtered flow at 375/1440 in both themes, retaining screenshots. The existing contrast/structure sweep covers both archive states at 375/390/768/1440 in both themes for guests and verified sessions.

No independent reviewer was available. Physical phone testing remains unverified. No merge or manual deployment is included.
