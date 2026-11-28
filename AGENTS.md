# Physcratic agent rules

**Production database mutations, deployments, purchases, plan changes and seat changes require explicit owner approval. Operator inspection on 28 November 2026 found that main automatically creates Production deployments and assigns custom domains. Treat a merge to main as a potential Production release requiring explicit owner approval.**

Read `CLAUDE.md`, `CONTRIBUTING.md`, `docs/engineering/EXECUTION_ROADMAP.md` and `docs/engineering/AGENT_HANDOFF.md` before a batch. Verify implementation against current repository state. Treat historical release notes as dated evidence.

## Product UX and copy (all user-facing work)

Read `docs/engineering/PRODUCT_DECISIONS.md` before implementation and update it when the owner changes a product requirement. Current owner decisions supersede conflicting historical plans. Security invariants and Production approval boundaries still apply.

- Optimize for a first-time visitor who has no tutorial. They must understand the page purpose, the next action, and the result of that action without explanation. Design the full journey from entry to completion, not isolated components.
- Keep the interface simple and coherent. Give each screen a clear primary action, predictable navigation, readable hierarchy, meaningful status and error feedback, and progressively reveal advanced controls. More features or more visible controls do not automatically improve the product.
- Before adding a tab, dashboard metric, card, banner, tooltip, animation or explanatory panel, identify the user need it solves. Remove redundant UI and avoid feature clutter. Never simplify by removing essential safety, accessibility, clear confirmation, or functionality.
- Write plain, specific, functional website copy. No em dashes, en dashes or semicolons in user-visible text. No aphorisms, poetic or motivational subtexts, clever slogans, generic AI-sounding filler, inflated claims or decorative subtitles. If a sentence does not help someone understand a task, requirement, state, consequence or useful context, delete it.
- No middle dot, bullet or similar glyph as a separator between words in user-visible text. Use spacing, a line break, separate styled spans or a comma.
- One typeface for interface text, IBM Plex Sans. Mono only inside code and kbd. No uppercase labels with wide letter spacing. Labels are sentence case.
- Prefer descriptive labels such as "Submit answer", "Save problem" and "Your attempts". Make forms, errors, empty states and confirmations actionable and understandable. Avoid unnecessary jargon and duplicate instructions.
- For any substantial UI change, review the first-time user path on mobile and desktop without relying on a tutorial. Check keyboard, screen-reader, loading, error and recovery paths. Fix confusing flow before adding polish. Reuse existing patterns and obey `CONTRIBUTING.md` copy rules. Do not introduce a broad redesign unless explicitly requested.

## Engineering and safety (all work)

- Next 15 App Router, TypeScript, React 19, pnpm 10, Node 22. Reuse typed problem identities, immutable revisions, server grading, Better Auth sessions and private-media proxies.
- Fresh branch/worktree from fetched main; recheck main/open PRs before reserving migration IDs and again before delivery; focused commits and PR, reconcile concurrent work, verify exact-head CI before merging reviewed changes. Do not rebuild completed features or introduce unrelated dependencies/refactors.
- Preserve CLAUDE.md. Its historical ownership exclusions require coordination for unrelated work. Explicitly authorised roadmap batches may edit the UI/schema modules necessary for that batch; this is not permission to change auth, grading or coaching contracts.
- Production or shared staging SQL, grants, roles, flags, credentials and provider settings require explicit owner approval. Merge approval must include Production release approval under the observed automatic-deployment behavior. Keep merged migrations and historical release evidence immutable. Author and test additive SQL in disposable databases before seeking installation approval.
- New community features default OFF and must avoid even importing database/session bindings while disabled. Disabled code must work with older deployed schemas. Public responses exclude private identity, attempts, drafts, answer keys and storage URLs.
- Preserve origin/CSRF checks, verified-session writes, bounded input/timeouts/shared limits, revision and publication consistency, and private-media restrictions. No user IDs or favouriter lists in public statistics.
- Production CSP remains report-only and NO-GO for enforcement, never before 9 November 2026 or automatically afterward. Keep coaching_inquiry. No marketplace or new rating/business model without approved requirements.
- Do not read generated public/corpus, public/ipho or translation trees wholesale. Read precise relevant source files and tests only.
- Verify focused regressions first, then `.github/workflows/ci.yml`: frozen install, offline guards, Next typegen + tsc, zero-warning lint, server/component tests, production build, applicable disposable PostgreSQL and browser tests. Use synthetic identities/storage, never live credentials or user data.
- Review changes directly using code inspection, focused local tests and standard GitHub Actions. Never invoke Daybreak, external review agents or paid review services. Update the roadmap and compact handoff with evidence, the exact commit or PR, operator prerequisites and the next batch. Follow any release-specific hold on sensitive changes. Stop after at most two substantial batches per context.
- Push reviewed changes through a pull request. Merge only after exact-head CI passes and the owner explicitly approves the potential Production release. The 28 November 2026 operator observation supersedes the earlier manual-deployment assumption. Do not change provider deployment settings to reconcile documentation.
