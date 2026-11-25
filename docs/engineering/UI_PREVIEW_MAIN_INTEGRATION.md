# Local UI preview integration, 25 November 2026

Owner requested a checkpoint and local merge of current main into the UI preview.

- Original base: `c15087065985eb53f2f967354e3fbd16cfc4daf5`.
- Pre-merge checkpoint: `83570d6`, also retained as `checkpoint/ui-preview-2026-11-25`.
- Incoming main: `ee236380364a0a0f96145ac1ac753cb5cca11c4f`, 44 commits after the base.
- Local merge: `478d4cd` on `local/ui-preview`.
- The separate `claude/coaching-navigation` worktree was not changed.

## Reconciliation

Eleven files required conflict resolution. Keep main's Simple-only Studio and
removed Classic editor, shared problem frame, bare part labels, progress summary
and meters, verified profile publication, saved visibility, medal labels,
personalization wording and current author attribution behavior. Retain local
title casing, the larger signed-out progress heading/full-width sign-in button,
and development-only loopback cookie handling. Main's profile signup policy and
the local cookie policy coexist in the merged auth configuration.

Automatically merged changes retain local coaching, navigation, search, theme,
typography and attempt-history work. Main's new migrations are present as source
only. No database migration, service setting, flag or deployment was operated.

## Verification and remaining limits

- Route generation, TypeScript and zero-warning lint passed after the initial conflict fixes.
- The initial component suite ran 376 tests, with 364 passing and 12 failing.
  All affected files were rerun after repairs: 117 tests pass. Tests now preserve
  title casing, normalize CRLF, and invoke the Tailwind CLI portably.
- All 18 effective learning-colour checks pass across the six theme variants.
  Paper needed slightly darker success and progress inks to retain 4.5:1.
- Fixed a signed-out Settings link to a missing tours section and restored the
  desktop header to the tour's shared stacking layer.
- The full server run recorded 1190 tests: 1121 passed, 27 failed, 41 skipped and
  one TODO. Follow-up colour/baseline checks repair several failures. Remaining
  failures include existing local coaching/SEO copy expectations, Windows Bash
  and ESM-path limitations, and raw-byte hash checks on CRLF checkouts. This is
  not a green full-suite claim. Do not weaken or re-pin protected release hashes.
- A guarded production build used synthetic credentials and the existing network
  guard. It made no progress beyond the optimized-build stage and was stopped.
  Production build, browser and database qualification remain unverified.
- Extra-worktree install is blocked by Windows symlink restrictions. The preview
  is itself a worktree without .env.local and uses existing locked dependencies.
  Offline guard runner/transport tests passed, while its extra-worktree ESLint
  guard cannot find dependencies. No global guard bypass was introduced.

Source-only integration is local. No migrations, services, flags, GitHub
publication or deployment are operated. The pre-merge checkpoint remains intact.

## Latest main follow-up

Main advanced by seven more commits to `a5f79a1` during reconciliation.
Merged as `a5fcdbb`, preserving both handoffs, local title casing and the
six-theme checks while accepting removal of dead part-colour helpers. The
Paper teal override was removed with those retired tokens. No account-deletion
installer or SQL was executed. Latest-head focused verification: 111 tests pass
across theme colours, profile settings, tour layering, Studio and solving.
The earlier repaired component-file run passed 117 tests. Full server-suite
failures remain explicit above. Checkpoint and both upstream-main ancestry
checks pass, and the implementation worktree was clean after the merge.

Final source checks after latest-main reconciliation: Next route generation and TypeScript pass. ESLint passes with zero warnings across all 209 changed JavaScript/TypeScript source files. Git diff whitespace checks pass. These do not establish a passing production build or the full server/browser/database suites.

## Remaining error fixes (25 November 2026)

Commit f36c548 repairs coaching/guide expectations, dynamic coach metadata
coverage, portable ESM loader URLs and workflow line-ending parsing. Coach
descriptions now meet the existing length gate. Nine corpus/checksum/operator
package checks pass after restoring exact Git bytes for clean text assets.
No immutable source content or checksum manifest was changed. TypeScript and
changed-source lint pass. Sixty coaching/guide/metadata-related checks passed
in the targeted run, with five separate Bash workflow checks blocked by Windows
sandbox execution restrictions. Bash failures must be verified in Linux CI.

Automatic approval review rejected uploading HEAD to Physcratic/physcratic on
branch codex/ui-preview-validation because explicit repository-export approval
was required. No push, PR or deployment occurred. Owner approval to push this
reviewable branch and create a draft PR is the next validation prerequisite.

## GitHub CI follow-up (25 November 2026)

Owner approved branch publication and draft PR [#258](https://github.com/Physcratic/physcratic/pull/258). The validation snapshot at `68e7edf` includes main `9e0a3c9`. Linux CI passed typecheck, zero-warning lint, unit and component tests, the production build, Open Graph regression and PostgreSQL database tests. Browser and PostgreSQL 18.7 activation qualification remain pending follow-up fixes.

The activation check identified two UI files covered by its immutable manifest. Restored those files to reviewed main bytes, with the existing main copy-scanner exception, rather than changing release hashes. Retained guest tour gating in the shared tour component with an accessible sign-in section, so the original Settings anchor stays useful. The profile unavailable heading retains its reviewed wording for the pinned browser suite. Updated affected browser heading selectors for the approved title casing. No Production operation or merge.

## Completed first Linux run and prepared follow-up (25 November 2026)

All first-run workflows have finished on `68e7edf`. Typecheck, lint, server and component suites, both production builds, native guest/member solving and the ordinary database job passed. The B6 activation checksum check, Studio and moderation heading selectors, CSP guest-tour/heading selectors, and the homepage session test failed. Local commit `ba1bf84` prepares the checksum and browser-heading repairs. The remaining local follow-up updates CSP to exercise both the guest gate and an intercepted synthetic signed-in tour, and updates real-session qualification for the intentionally shared public home shell. HTTP/RSC responses now must exclude both accounts, while real session validity, invalid/expired session denial, private progress and account switching stay checked. No production auth behavior is changed by these test updates.

Local Settings/copy checks pass 34 tests, CSP regressions pass 42 tests, TypeScript and changed-source lint pass. Full browser and PostgreSQL 18.7 validation must rerun on the follow-up head. Automatic approval review rejected creation of the remote follow-up commit, requiring explicit approval to publish the new source, tests and documentation payload. The draft PR remains at its original validation head. No workaround, merge or deployment.

## CSP diagnostic isolation follow-up (25 November 2026)

On validation head `75a7113`, all core CI jobs and both authored-student/community browser workflows pass. The CSP browser run passed navigation, guest/member tours, maths and PDF workflows in Chromium, Firefox and WebKit, but Firefox report-only reached the local collector’s 100-event diagnostic cap before its negative HTTP control. Its recorded delivery counts sum to exactly 100. Keep the cap and HTTP assertion, reset diagnostics between sequential scenarios, and fail explicitly if any scenario overflows. The regression verifies overflow accounting, reset and preserved prior snapshots. All 43 focused CSP tests and configured changed-file lint pass. Public-library qualification is still running on `75a7113`; the full checks must run on the follow-up head. This changes only the local test harness, not Production CSP.

The public-library run on `75a7113` passed both native reader variants and its production build, then failed because the isolation test called decodeURIComponent on a complete HTML document containing CSS percentages. Compare each URL-encoded private fixture directly instead, retaining the raw and encoded checks. Run the session/library stage before native solving so failures surface before the long archive sweep. Both native variants and their evidence upload remain required on a successful run.

## Static coach CSP and topic expectation follow-up (25 November 2026)

Validation head `280a6ea` passes all core CI jobs and authored/community browser qualification. CSP report/enforcement workflows now pass in Chromium, Firefox and WebKit, confirming per-scenario diagnostic isolation. Full hybrid inventory then correctly rejected the static coach directory/profile family: request-nonce matchers cannot authorise prerendered HTML. Add these public coach build artifacts to the exact-byte static hash allowlist, remove their nonce matcher and require the static family in the source guard. Fixture coverage includes directory/profile hashes, rejects changed served bytes and continues to exclude an unrelated coach path. No Production policy change.

The public library, real-session isolation and PDF accessibility checks pass. Topic qualification found the stale sentence-case expected heading. Update it to the approved title case, leaving counts, SEO, links, accessibility and archive expectations intact. The final full browser/architecture checks remain pending on the follow-up commit.
