# Physcratic agent rules

Read `CLAUDE.md`, `CONTRIBUTING.md`, `docs/engineering/EXECUTION_ROADMAP.md` and `docs/engineering/AGENT_HANDOFF.md` before a batch. Verify code against the relevant guidebook rather than historical status prose.


## Product UX and copy (all user-facing work)

- Optimize for a first-time visitor who has no tutorial. They must understand the page purpose, the next action, and the result of that action without explanation. Design the full journey from entry to completion, not isolated components.
- Keep the interface simple and coherent. Give each screen a clear primary action, predictable navigation, readable hierarchy, meaningful status and error feedback, and progressively reveal advanced controls. More features or more visible controls do not automatically improve the product.
- Before adding a tab, dashboard metric, card, banner, tooltip, animation or explanatory panel, identify the user need it solves. Remove redundant UI and avoid feature clutter. Never simplify by removing essential safety, accessibility, clear confirmation, or functionality.
- Write plain, specific, functional website copy. No em dashes, en dashes or semicolons in user-visible text. No aphorisms, poetic or motivational subtexts, clever slogans, generic AI-sounding filler, inflated claims or decorative subtitles. If a sentence does not help someone understand a task, requirement, state, consequence or useful context, delete it.
- Prefer descriptive labels such as "Submit answer", "Save problem" and "Your attempts". Make forms, errors, empty states and confirmations actionable and understandable. Avoid unnecessary jargon and duplicate instructions.
- For any substantial UI change, review the first-time user path on mobile and desktop without relying on a tutorial. Check keyboard, screen-reader, loading, error and recovery paths. Fix confusing flow before adding polish. Reuse existing patterns and obey `CONTRIBUTING.md` copy rules. Do not introduce a broad redesign unless explicitly requested.

- Next 15 App Router, TypeScript, React 19, pnpm 10, Node 22. Reuse typed problem identities, immutable revisions, server grading, Better Auth sessions and private-media proxies.
- Fresh branch/worktree from fetched main; recheck main/open PRs before reserving migration IDs and again before delivery; focused commits and PR, reconcile concurrent work, verify exact-head CI. Do not rebuild completed features or introduce unrelated dependencies/refactors.
- Preserve CLAUDE.md. Its historical ownership exclusions require coordination for unrelated work. Explicitly authorised roadmap batches may edit the UI/schema modules necessary for that batch; this is not permission to change auth, grading or coaching contracts.
- Never operate Production/shared staging SQL, grants, roles, flags, credentials, provider settings or deployment. No README deployment triggers. User owns deployment. Merged migrations (including 0001–0013) and historical release evidence are immutable; new SQL must be additive, reviewed and tested only in disposable databases.
- New community features default OFF and must avoid even importing database/session bindings while disabled. Disabled code must work with older deployed schemas. Public responses exclude private identity, attempts, drafts, answer keys and storage URLs.
- Preserve origin/CSRF checks, verified-session writes, bounded input/timeouts/shared limits, revision and publication consistency, and private-media restrictions. No user IDs or favouriter lists in public statistics.
- Production CSP remains report-only and NO-GO for enforcement, never before 9 November 2026 or automatically afterward. Keep coaching_inquiry. No marketplace or new rating/business model without approved requirements.
- Do not read generated public/corpus, public/ipho or translation trees wholesale. Read precise relevant source files and tests only.
- Verify focused regressions first, then `.github/workflows/ci.yml`: frozen install, offline guards, Next typegen + tsc, zero-warning lint, server/component tests, production build, applicable disposable PostgreSQL and browser tests. Use synthetic identities/storage, never live credentials or user data.
- Review substantial/security-sensitive changes independently when available. Update roadmap and compact handoff with evidence, exact commit/PR, operator prerequisites and next batch. Do not merge sensitive/deployment-affecting changes without explicit approval. Stop after at most two substantial batches per context.
