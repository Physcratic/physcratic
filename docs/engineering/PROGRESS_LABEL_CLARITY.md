# Progress and checker labels

27 November 2026. F2 follows F1, merged through PR #265 as `4e6c20d` after all five exact-head workflows passed. The previously outstanding full-library run also passed. No deployment occurred.

## Behavior

Personal completion controls and collection badges say "Marked complete". Their help text identifies the mark as personal and says it does not check answers. The account's mark history says "Problems you marked complete". Collection attempt indicators say "Saved attempt" or "No saved attempt" only when that source is available. Unknown progress remains unlabeled.

Checker success and progress groups say "All checkable answers correct". Their descriptions preserve the distinction between current-version answer matches, reasoning, self-review and independent solving. The check action explains that only final answers are checked. Opening a worked solution remains immediately available and does not create an attempt or completion mark.

Aggregate results count incorrect, unreadable, undecided, unanswered and self-review results separately. Unreadable and inconclusive results alone never produce "Not correct yet". Invalid input offers another try. Inconclusive results and paper/self-review work do not claim verified failure. A mixture of correct automatic answers and self-review parts explicitly leaves the latter for review. Grader decisions, saved receipts, sticky progress, continuation eligibility and private account/version boundaries do not change.

## Verification and boundaries

Local checks: 25 logic/theme tests and 18 part/progress/card component tests pass. The focused real-component browser check passes keyboard mark/unmark, accurate mixed-result descriptions, no horizontal overflow and axe at 375 and 1440 pixels in light/dark. Type generation, TypeScript and focused zero-warning lint pass. A broader problem-card test encounters an inherited Windows CRLF-sensitive CSS assertion. No test is weakened. Updated Linux CI remains required on the published head before merge.

The focused browser uses synthetic transport, not live database or provider qualification. Existing disposable-database and session/browser suites remain required. Protected release manifests, schema, migrations, dependencies, flags, credentials and production settings are untouched. Account saving remains separately NO-GO. The owner deploys manually.

Next batch is F3, reconciling random discovery with available account progress, then F4 continuation/history. Do not build an adaptive recommender or a new history queue without evidence. F5 remains deferred and separately authorized.
