# UI overhaul: prototype and preservation contract

Recorded 11 November 2026. Branch: `codex/ui-overhaul`.

## Fixed baseline

Baseline commit: `b3912ce60f80929c360ccb7956d6b394eef1aff5`.
Baseline tree: `e0f5379f66508097704ebae107b96c00feb9b9dd`.
This is the parent of the first overhaul commit, `1eb8ed5be2c60bd84671fb1b2f20523fd22d0c9d`. GitHub commit ancestry was checked when recording it.
Do not replace this baseline with a later main, merge-base or checkpoint. Later upstream changes are reviewed separately.

The owner authorizes substantial experimental UI changes on this branch. Preserve existing capabilities by default. A feature removal or contract change needs an explicit recorded owner decision. Temporary breakage may exist in a clearly labelled work-in-progress checkpoint, but must be repaired or clearly reported before review-ready delivery. This authorization does not extend to production services, deployment, billing, live data, authentication/security/grading contracts or feature activation.

## Product direction and decisions

The product should be intuitive and inviting to a customer, centred on finding a suitable problem, solving it and choosing what comes next.
Prototype and review one complete user flow at a time. Existing functionality must remain reachable even when navigation changes.
Initial recommendation design is discussed, not implemented: choose topic and one of four bands, offer unfinished work separately, select an eligible uncompleted problem within the chosen band near its internal preset, and provide easier/harder/topic controls. Never ask users to enter a numerical rating. Only use progress signals that are actually available under existing gates.
Approved label changes are Advanced (Olympiad) and Expert (Olympiad++). Retain stable IDs, rating boundaries, presets and rating logic.

## Working process

1. Read AGENTS.md, the current handoff and this document. Fetch main and inspect open PRs for overlapping work, while continuing this explicitly requested branch. Preserve unrelated upstream work.
2. Before changing a flow, inspect its baseline source, dependent components and relevant existing tests. Extend the inventory below with concrete controls, guest/member/role conditions, errors and recovery behaviour. The route inventory is a starting map, not proof of complete feature coverage.
3. Establish a baseline preview in a separate clean worktree with synthetic data and isolated local services. Capture desktop/mobile and light/dark evidence for the affected flow. Do not copy production environment files. See ../development/LOCAL_UI_SETUP.md. Record blockers rather than claiming a runnable signed-in setup.
4. Make small checkpoints with a clear scope. Do not reset or force-push away history. Prefer a revert commit if a checkpoint needs undoing.
5. For each affected checklist item, record one of: preserved, intentionally changed, intentionally removed, needs verification. Include candidate SHA, evidence or test command/result, and an owner decision reference for removals. New rows start as needs verification.
6. Review both the cumulative baseline-to-candidate diff and the latest checkpoint diff. Inspect deleted code, replaced routes, links and removed tests. Do not weaken assertions merely to accommodate an unexplained regression. A feature remaining in code is insufficient if users can no longer reach or complete it.
7. Run focused regressions first, then repository-required gates appropriate to the batch. Before review-ready delivery verify the affected guest/member flows at mobile and desktop, light/dark, keyboard and accessibility, plus loading, empty, error and recovery states. Use existing browser suites where relevant. Record failures and anything not run. Synthetic sessions do not establish real-provider compatibility.
8. Update the handoff with exact implementation SHA, changes, evidence, known regressions and next task. Do not present unresolved accidental regressions as completed. The owner reviews prototypes before merge or deployment.

Useful local comparisons:

```sh
git diff b3912ce60f80929c360ccb7956d6b394eef1aff5 HEAD --stat
git diff b3912ce60f80929c360ccb7956d6b394eef1aff5 HEAD -- app components lib tests
git diff HEAD~1 HEAD --stat
git worktree add --detach ../physcratic-ui-baseline b3912ce60f80929c360ccb7956d6b394eef1aff5
```

Use a distinct local server port and separate build output/worktree for the baseline preview. Some auth origins currently expect port 3000, so configure or run baseline/candidate sequentially when comparing auth flows. Do not reuse production credentials.

## Initial feature preservation checklist

All entries below are **needs verification**. Source presence was inspected, but no baseline or candidate browser qualification was performed in this session. Conditional features must retain their default-off/access-control behaviour, not be activated to make the checklist pass.

| Area | Capabilities to inspect and preserve | Existing browser coverage to inspect |
| --- | --- | --- |
| Entry and navigation | Guest landing vs member dashboard, start practice, library/archive/Learn/coaching links, topic navigation, search, mobile menu, back navigation and deep links | first-time-user, drunk-user, dashboard-loading |
| Discovery | Problem lists, search, topic/tag and band filters, authored/Arena sources, pagination, empty/error/retry states, selected problem links | problem-library, library-tags, unified-arena |
| Practice and readers | Full statements, equations, figures, original PDFs, attribution, multipart navigation and solution access; guided and imported variants | phase0-solve-audit, reader-layout, ipho-2026-native, ipho-2026-t3 |
| Answers and recovery | Numeric/expression/manual modes, units and validation, server feedback, revision identity, pending/uncertain submission and same-key retry, drafts and account isolation | math-typing, practice-check, practice-progress, authored-expression, authored-student |
| Progress and difficulty | Existing rating display, estimates, bands, history and resume links; retain gates and guest fallback | practice-progress, authored-metadata |
| Authoring | Draft editing, statement/solution blocks, media, answer keys, preview/publication, revisions and student view | problem-authoring, studio-simple, authored-student |
| Contests and rankings | Existing browse/detail/management paths, contestant search, session/account isolation and available participation behaviour | contest-session; inspect current rankings tests |
| Account and settings | Sign in/up, terms, verification, password reset, email change, profile/settings and sign out; preserve CSRF, session and provider contracts | Inspect existing account/server tests and relevant browser harness before changes |
| Learn and coaching | Guide lists/readers, coaching discovery, consultation and tutor application, functional links/forms and feedback entry | learn-guides; inspect coaching tests |
| Community and staff | Profiles, achievements, verification, comments, moderation and role restrictions when enabled; default-off behaviour when disabled | community-profile, community-achievements, community-verification, comments, moderation, moderation-ui |
| Accessibility and responsive UI | Skip links, heading order, names/labels, focus, keyboard, contrast, 44px controls, overflow, dark/light and mobile behaviour | solve-contrast, phase2-phones, reader-layout |
| SEO and public boundaries | Public links/canonicals/metadata, robots and sitemap policy, private authored paths, no leakage of keys/private data/storage URLs | Inspect existing SEO and privacy server tests |

Browser names above correspond to tests/<name>.browser.mjs, except entries explicitly asking for inspection. Existence is not a passing result or proof of complete coverage.

### Baseline page route inventory

- `app/admin/moderation/page.tsx`
- `app/admin/verification/page.tsx`
- `app/coaching/become-a-tutor/page.tsx`
- `app/coaching/consultation/page.tsx`
- `app/coaching/page.tsx`
- `app/dashboard/author/page.tsx`
- `app/dashboard/authored/[id]/page.tsx`
- `app/dashboard/contests/[id]/page.tsx`
- `app/dashboard/contests/manage/page.tsx`
- `app/dashboard/page.tsx`
- `app/dashboard/problems/[id]/page.tsx`
- `app/dashboard/submissions/page.tsx`
- `app/email-change/page.tsx`
- `app/forgot-password/page.tsx`
- `app/learn/[slug]/page.tsx`
- `app/learn/page.tsx`
- `app/page.tsx`
- `app/problems/archive/page.tsx`
- `app/problems/page.tsx`
- `app/problems/topics/[slug]/page.tsx`
- `app/reset-password/page.tsx`
- `app/settings/page.tsx`
- `app/sign-in/page.tsx`
- `app/sign-up/page.tsx`
- `app/terms/page.tsx`
- `app/u/[handle]/page.tsx`

Also inspect API routes and query-based dashboard views when changing a flow. Page files alone do not enumerate all features.

## Checkpoint ledger

| Checkpoint | Change | Verification |
| --- | --- | --- |
| `b3912ce60f80929c360ccb7956d6b394eef1aff5` | Original branch baseline | Commit/tree ancestry and route/test inventory confirmed. Runtime unverified |
| `1eb8ed5`, `d60feae` | Shared band labels and existing test expectations updated | Tests not run |
| `4a9148f` | Local UI setup guide | Source audit only. Local database/schema, signup and cookies not verified |
| This documentation commit | Baseline, preservation process and handoff | Documentation/source inventory review only. No application behaviour changed |

Next task: get the local guest preview running, establish affected-flow baseline evidence, then prototype the entry/discovery flow. Signed-in setup remains a separate unresolved prerequisite.
