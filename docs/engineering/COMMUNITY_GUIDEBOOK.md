# Physcratic Arena — Community Development Guidebook

**Baseline inspected:** `main` at `a1c288b3b38a661847a1828d42827974a8ea69af` (3 November 2026).
**Goal:** Establish five coherent community capabilities, keeping existing authoring, grading, auth, production data and deployment safe. Implement with a fresh Codex session per batch.
**Status:** PLANNING ONLY. This document does not claim any feature is implemented.
**Guidebook location:** Initially committed on branch `codex/community-system-guidebook-2026-11-03`, not `main`. Until Batch 0 merges it, Codex must read this branch explicitly with `git fetch origin codex/community-system-guidebook-2026-11-03` and `git show origin/codex/community-system-guidebook-2026-11-03:docs/engineering/COMMUNITY_GUIDEBOOK.md`. Include this document in the Batch 0 merge so subsequent sessions can read it from main.

## 1. Architecture and current reality

- Stack: Next.js 15 App Router, React 19, TypeScript, Drizzle, Neon PostgreSQL, Better Auth, Vercel Blob, reCAPTCHA v3, Resend.
- Already present: `lib/db/schema.ts` Better Auth `user`, authored problems with `ownerId`, immutable authored revisions, graded `authored_attempt` records, `practice_attempt`, legacy `solution_attempt`, independent individual and contest rating tables.
- Static Arena: `lib/arena/index.json`, `components/physics/arena-collection.tsx`. Published authored problems: `/api/authored-problems/library`, `components/authored/library-collection.tsx`, `/dashboard/authored/[id]`. Current problem tabs live in `components/physics/problem-library.tsx`.
- Settings is currently a small theme-only dialog in `components/settings-dialog.tsx`. Signup is `components/auth-form.tsx`; do not break Terms, CAPTCHA, email verification or shared PostgreSQL auth throttling.
- Site name already reads "Physcratic" in `lib/site.ts`, site metadata and sidebar. Do not change the logo or brand spec without identifying an actual stray name string.
- Existing difficulty labels in `lib/problem-archive.ts` are editorial estimates, and player ELO starts at 1200 (`lib/individual-elo.ts`). Contest rankings use explicitly published handles, not user profiles. Do not conflate these measures.
- Existing migrations `0001`–`0006` are deployed. Never edit, replay or renumber them. Additive migrations only. Existing SQL release/evidence files are historical release evidence, not files to rewrite.
- User-created content does not appear to have a generalized profiles/follows/comments/reports system at the inspected main SHA. Recheck current main before each batch.

## 2. Exactly five first-cycle feature groups

1. **Profiles & onboarding:** public handles, opt-in public visibility, editable display name and biography, favourite topics/education level, avatar and banner; optional onboarding after verification; tidy Settings.
2. **Credentials & achievements:** developer-only admin/mod roles, private PDF Olympiad medal verification, earned author/solver badges, exactly two selected showcase badges.
3. **Unified Arena & favourites:** one UI for static and published authored problems, correct attribution, authenticated favourite toggle and counts, truthful completed counts.
4. **Threaded discussion:** readable Reddit-like parent/reply threads and comment likes; soft-delete, editing, pagination, bounded depth.
5. **Moderation & abuse controls:** reports for users/problems/comments, protected reviewer queue and audit log, rate limiting, word/link filters and review/appeal route.

**Deferred:** following/followers, player graph, public leaderboard extensions, rating calibration, rating-review requests, visual polish outside touched screens. These can follow once the community data is trustworthy.

## 3. Binding technical and product decisions

### 3.1 Identity

- Separate the Better Auth identity/authorization record from editable public profile data. Never expose email, verification proof, private attempts, session information or private drafts.
- Use a stable user UUID/text ID for all relations. Public handle is unique case-insensitively (3–24 normalized characters, reserved handles blocked), with safe redirect/rename policy. Display names are editable and non-unique; changing them must not modify certificate names or verification records.
- Existing users start private until they explicitly opt into public profiles. For new users, present public visibility choice clearly. No surprise publishing of real names or existing contest handles.
- Role taxonomy: `educationLevel` (High school, University, Other/Prefer not to say) and `favoriteTopicIds` using canonical `lib/physics-taxonomy.ts`; these are user preferences, not authorization roles.
- Admin/mod status is server-owned, granted by audited developer-only action to stable account IDs; never by profile PATCH, badge selection, signup payload, or arbitrary email claim.

### 3.2 Verified Olympiad medals

- Structured claims: competition (IPhO/APhO/EuPhO/National), national competition country/name when relevant, year, award level, certificate holder full name, submitted timestamp and review state.
- One private PDF proof (size cap suggested 5 MB; verify MIME and actual PDF bytes; no SVG/HTML and no public blob URLs). Retain original submitted claim separate from mutable profile fields. Private blob media must require an admin session even to read. Avoid third-party sheet copies of certificates.
- Workflow: submit → pending → approved/rejected/request-more-info; reviewer ID, reason, timestamp and audit record. Prevent double pending claims, self-approval and spoofed requests. Add revocation.
- A restricted internal admin dashboard with CSV export is the primary output; a developer-only Google Sheet can be added later if access and retention are explicitly configured. A spreadsheet must not become the authority for privileges or verification status.
- Public badge could render `IPhO · Bronze`, `APhO · Gold`, `EuPhO · Silver`, `National · Indonesia · Gold` with competition, year and award in tooltip/detail.

### 3.3 Achievement design

Keep achievement definition registry in code; server owns awards. Suggested launch set:

| Category | Tier | Earned criterion | Visual treatment |
|---|---|---|---|
| Author | First Spark | 1 eligible published problem | Slate/cyan |
| Author | Problem Weaver | 5 eligible published problems | Teal |
| Author | Equation Architect | 15 eligible published problems | Indigo/silver |
| Author | Master Problem Setter | 50 eligible published problems | Gold + subtle glint |
| Solver | First Breakthrough | 1 verified complete problem solve | Green |
| Solver | Persistent Solver | 10 unique verified completes | Blue |
| Solver | Olympiad Pathfinder | 50 unique verified completes | Violet + subtle glow |
| Community | Community Favourite | 10 unique non-self favourites on eligible published content | Rose |

These thresholds are product defaults to review, not existing data. Count DISTINCT stable problem identities, not drafts, deleted/taken-down content, repeated submissions, self-favourites or ungraded results. Count authorship based on reviewed/eligible publications if moderation exists; otherwise mark this as the anti-farming limitation and allow admin revocation. Badges have distinct color, icon, outline; only rare tiers get subtle animations, obey `prefers-reduced-motion`, never flash. Showcase maximum = two, chosen from truly earned/approved badges. Moderator is a separate verified staff marker, not one of the two earned achievements.

### 3.4 Unified problem identities and statistics

- Do not migrate static problems into the `authored_problem` table or change graders. Introduce an explicit type-safe key e.g. `arena:<id>`, `authored:<uuid>`, and optionally `archive:<id>` only if scope requires archive interaction. Validate the key against the actual public problem registry and current published revision.
- A shared Arena list displays static Arena and current published authored problems, with kind/author metadata and stable links. Preserve original-source attribution and permissions; never claim imported Olympiad tasks are originally written by Physcratic. "Physcratic" can be the publishing account for internally created Arena originals.
- Add uniqueness on `(user_id, problem_key)` for favourites; idempotent toggle; one authenticated favourite per user per problem; public counts do not expose the favouriting user list unless that user opted in. Exclude self-favourites from popularity awards.
- "Solved" means a unique verified authenticated user completed ALL required parts of the CURRENT published revision with `correct` outcomes. `incorrect`, `needs-review`, `ungraded`, assisted/revealed solutions or legacy `awaiting-reference` cannot silently be counted as verified independent solves. Decide whether assisted solves appear in a separate metric. Static Arena items without authoritative grading show "completion count unavailable", not a fake zero.
- Use batched aggregated queries/cached aggregates or summary views when justified; not one COUNT query per card. Never count guest pageviews as unique solve completions.
- Red/green feedback uses readable text + icon + status color. Distinguish Attempted, Solved, Needs review, Unrated, and Unknown; do not mark incorrect/ungraded work as Solved.

### 3.5 Discussions and moderation

- One comment model keyed to the same problem identity; parent belongs to same problem; stable comment ID and author ID; server timestamps; soft-delete preserves children. Depth capped at 3–4 visually, with `replying to @handle` on deeper replies. Cursor paginate roots and replies independently.
- Comment format: plain text or carefully sanitized lightweight Markdown. Never render arbitrary HTML or raw user HTML as trusted. Links have sensible restrictions. No executable LaTeX commands. Users may edit own comments (mark edited), delete own, and like/unlike once; moderators can hide/restore and lock.
- Require verified sessions for posting/reactions/reports; guests read visible content. Limit body (e.g. 2,000–4,000 chars), repeated posts, burst rates per account/IP, and concurrent writes; generic error responses.
- Reports target user/problem/comment through a typed, validated subject, reason enum, optional detail. Queue privately with statuses `open`, `triaged`, `actioned`, `dismissed`, linked reviewer/audit trail. Do not let users report inaccessible private resources or read someone else's reports.
- Moderation filters: normalization + token boundaries, high-confidence racist slurs/violent threats blocked or queued, ordinary profanity handled with a documented policy. Avoid naive substring matching, arbitrary censorship, and false positives in educational quotes. Tests must include Unicode/case variants, false positives and evasion. Filter on server before persistence and on edits; allow moderator overrides with audit. Reported and flagged comments may be held from public display.
- No open public comments until reporter and moderator queue exist, or feature flag `COMMUNITY_COMMENTS_ENABLED` defaults OFF.

## 4. Migration, performance, and operational rules

- Prefer small additive SQL files like `0007_community_profile.up.sql`, `0008_community_credentials.up.sql`, etc. Pair with backwards-compatible Drizzle declarations, SQL constraints, indexes, grants and disposable-PostgreSQL tests. Avoid changes to existing immutable release scripts.
- New tables likely include `community_profile`, `community_user_role`, `community_badge_selection`, `community_medal_claim`, `community_favorite`, `community_comment`, `community_comment_like`, `community_report`, `community_moderation_action`. Add only when needed; design names carefully to avoid existing schema collisions.
- For authenticated API writes, use existing Better Auth sessions; enforce ownership/roles in every server handler. Test IDOR, spoofed ownership, double toggles, stale revisions, publication race, and private media.
- Existing production includes real accounts/data despite the product being prelaunch. No reset, destructive migration, mass credential changes or removal of existing schema. User explicitly wants a light process: keep review short, but do not skip DB compatibility and access-control tests.
- **Deployment ownership:** Codex may commit, push and merge code to `main` after checks, but must NEVER deploy to Vercel, trigger a build/redeploy, change Vercel settings, or make a README deployment-trigger commit. The user deploys personally with their existing GitHub account linked to the paid Vercel seat. Their established workflow is to make a small legitimate README commit from that account after merging code; this triggers the Vercel Git integration. Merging code does NOT prove it was deployed. The user must verify the Vercel Production deployment is READY and serves the intended latest code.
- Merge only after green tests and proof of compatibility with the currently deployed production database schema. If new migrations are not installed, new features must remain disabled and their server paths must not query missing tables. Do not apply production SQL, change infrastructure, or copy staging data without explicit authorization. Never rerun existing staging migrations 0001–0006.
- Use one Codex worktree per batch; fresh Codex context starts from latest `main` and last `docs/engineering/COMMUNITY_STATUS.md` handoff. No huge free-form all-repository rereads. Resolve only conflicting files, commit and merge normally, never force-push.
- Checks as applicable: `pnpm install --frozen-lockfile`, `pnpm exec next typegen && pnpm exec tsc --noEmit`, `pnpm lint`, targeted server/UI tests, `pnpm test`, disposable PostgreSQL tests following existing harness, `pnpm build`. The inherited corpus punctuation TODO is known; report delta, don't rewrite unrelated corpus assets.

### User-owned Vercel deployment procedure (mandatory after every merged batch)

1. Codex implements, tests, commits, pushes and may merge code to `main`. It does **not** operate Vercel or produce a README-trigger commit and must never claim the change is live solely because it merged.
2. Codex reports the feature merge SHA, new routes, exact migration and flag prerequisites, and whether deployed production database/schema is currently compatible. Avoid a merge that would cause live runtime errors if an unapplied migration exists.
3. **Only the user**, signed into their existing authorized GitHub account linked to the paid Vercel seat, creates a small meaningful README commit on `main` when deployment is wanted. Their established Vercel Git integration uses this commit to deploy the latest `main` including already-merged code. A README commit is a *trigger*, not a substitute for merging feature code.
4. The user verifies Production deployment `READY` in Vercel, confirms the deployed SHA is the latest `main` **including** the feature merge (the README trigger commit will have a different SHA), and runs applicable smoke tests. If the build is not triggered, investigate the Git integration and authorized account rather than circumventing the seat restriction.
5. Database-dependent features must remain disabled until the user separately authorizes the relevant migrations and grants; the README commit does not change database schema.

## 5. Codex operating contract (paste at the beginning of each new session)

~~~text
You are editing Physcratic/physcratic. You may commit, push and merge to main on your own if tests and compatibility checks pass. DO NOT deploy to Vercel, initiate builds/redeploys, change Vercel project settings, or make a README trigger commit. Only the user may trigger Vercel Production from the existing Premium-seat account, generally by making a small legitimate README commit after code merges. A merge is not a deployment. NEVER force-push or overwrite production data. Do not run production migrations, copy DB data, change auth/CAPTCHA/Terms, or reset accounts. Read docs/engineering/COMMUNITY_GUIDEBOOK.md (initially on branch codex/community-system-guidebook-2026-11-03; fetch and git show it if missing from main) and the latest docs/engineering/COMMUNITY_STATUS.md (if present). Verify current main SHA; inspect only relevant implementation files. Implement exactly the requested batch, not future roadmap items. Prefer focused additive change to broad rewrites. Every state-changing endpoint must have server-side auth/authorization, bounded validation, tests and nonleaking errors. Preserve existing authoring/revision/grading/privacy invariants. Run targeted tests, lint/typecheck/build where applicable, then merge cleanly if safe. Record concise handoff: changed files, SQL migration status, tests, residual risks, PR/merge SHA and next batch. Stop if production-schema compatibility cannot be assured.
~~~

## 6. Work batches — paste one prompt per new Codex chat

### Batch 0 — Quick UI hygiene, no DB changes

**Budget:** 1 focused batch. Smallest first merge.
**Relevant files:** `components/physics/problem-library.tsx`, dashboard query/link tests, `lib/site.ts` and actual brand consumers.

~~~text
RECOMMENDED CODEX MODEL: GPT-6.1 Terra · Medium
BATCH 0 — Arena navigation cleanup. First fetch/read docs/engineering/COMMUNITY_GUIDEBOOK.md from the roadmap branch and include the guidebook in your change to main. On latest main, remove the "Quick practice" TAB from the problem library because it dilutes the primary Olympiad experience; preserve its data and any existing deep links/API behavior, and map old ?collection=practice to the Arena/default experience. Make the Arena the obvious primary view; avoid destructive data deletion. If an actual "Two particles" title exists, replace user-visible title with "Physcratic"; lib/site.ts already says Physcratic, so do not invent a rename. If a tested submission status already has authoritative correct/incorrect values, add modest accessible green/red state styling only in an isolated component. Avoid changing grade logic, editorial Elo or problem routes. Test navigation, URL persistence, keyboard/mobile behavior, typecheck/lint/build. Commit/merge if green. Update COMMUNITY_STATUS.md with exact changes. No DB migrations.
~~~

**Done when:** no Quick practice tab; old links don't break; Arena prioritized; brand titles unchanged where already correct; no grading changes.

### Batch 1A — Public profiles + storage/API foundations

**Budget:** one additive migration and associated API/model tests. No media UI yet.
**Relevant files:** `lib/db/schema.ts`, `lib/auth.ts`, auth/session helpers, new `lib/community/profile*`, new `app/api/community/profile/*`.

~~~text
RECOMMENDED CODEX MODEL: GPT-6.1 Sol · High
BATCH 1A — Public community profile foundation. Follow operating contract. Implement additive public profile record tied to existing Better Auth user ID, with unique normalized handle, editable displayName, bio, educationLevel, favoriteTopicIds from the existing canonical taxonomy, publicVisibility opt-in, and proper created/updated times. Existing users must NOT become public by default; their email/name and private attempts must not leak. Public GET only for opted-in profiles; session-protected own GET/PATCH with strict Zod validation, reserved handles, abuse-safe slug/rename policy, unique index/transactional conflict semantics and rate limits. Do not mutate Better Auth sign-in identity or change signup payload yet. Add migration + down/documented rollback for disposable use, Drizzle schema, API tests: unauthorized, duplicate handles, visibility, IDOR, invalid data and concurrent handle claims. Feature-flag-safe with absent production tables; do NOT apply SQL to production. Run checks; commit/merge when safe; handoff.
~~~

**Done when:** owner edits work after schema installation; guest never sees private profile; no auth regressions; compatibility safe.

### Batch 1B — Profiles UI, optional onboarding, media, Settings

**Budget:** one UI-focused batch, backed by 1A. Require schema/app-readiness.
**Relevant files:** `components/settings-dialog.tsx`, `components/account-nav.tsx`, `components/auth-form.tsx`, new `app/u/[handle]` / profile UI.

~~~text
RECOMMENDED CODEX MODEL: GPT-6.1 Sol · Medium
BATCH 1B — Build public /u/[handle] profiles and a functional, polished Account Settings screen. Keep Theme but make Settings a spacious responsive page or well-organized tabs: Profile, Appearance, later Achievements/Verification placeholders ONLY if not dead controls. Implement displayName, bio, education level, canonical favourite topic multi-select, handle/visibility with clear save/error states and own preview. Add optional post-email-verification onboarding ("skip for now"); do not alter pre-verification signup, Terms, CAPTCHA or verification transport. Add avatar and banner upload using image-only PNG/JPEG/WebP, server-side byte/type/dimension limits, re-encoding/metadata stripping where feasible, safe object keys, ownership checks, replacement cleanup and reasonable quotas. Do not reuse private authored media permission model incorrectly. Public images only after explicit user choice; no arbitrary external URLs/SVG. Test edit/save/reload, media abuse/IDOR, opt-out/privacy, desktop/mobile/keyboard/reduced-motion. Commit/merge safely with gates.
~~~

**Done when:** users can edit profile + upload avatar/banner; privacy default is honored; existing auth unchanged.

### Batch 2A — Achievement engine + two showcase flairs

**Budget:** one independent data/renderer batch.
**Relevant files:** new community achievement registry, `lib/db/schema.ts`, author/attempt relations, profile and authored card components.

~~~text
RECOMMENDED CODEX MODEL: GPT-6.1 Sol · High
BATCH 2A — Implement server-owned achievement definitions (First Spark 1 authored publication, Problem Weaver 5, Equation Architect 15, Master Problem Setter 50; First Breakthrough 1, Persistent Solver 10, Olympiad Pathfinder 50 unique verified complete solves). Do not count drafts, self-favourites, ungraded/awaiting-reference results, or duplicate attempts. Be precise that user-authored problem solves require all mandatory parts of current revision graded correct and distinguish assisted solves. Use bounded recompute/materialization with reliable invalidation on publish/unpublish/regrade; no client-awarded badges. Allow user to select MAX TWO earned badges shown beside public display name. Include elegant consistent badge colors/rarity outline, rare subtle glitter using CSS with reduced-motion fallback and accessible readable labels. Do not implement medal claims or staff permissions in this batch. Test spoofed badges, duplicate submissions, race/revision changes, and mobile overflow. Merge after checks and handoff.
~~~

**Done when:** badge eligibility server-derived; exactly two show; badges can't be self-awarded.

### Batch 2B — Medal verification and developer-controlled staff role

**Budget:** independent backend and queue batch; handle private PDF safely.
**Relevant files:** community credentials, secure Blob helpers, private admin routes/dashboard.

~~~text
RECOMMENDED CODEX MODEL: GPT-6 Astra · High
BATCH 2B — Add Olympiad medalist verification requests for IPhO/APhO/EuPhO/national competitions. Form asks competition, award, year, country/competition for national awards, certificate full name, one private PDF proof. Server validates file bytes/type/size (5 MB suggested) and binds proof to requestor. Build admin-only pending/rejected/approved queue, private proof fetch, decision reason/time, revocation, immutable reviewer audit, duplicate-claim guard; no public proof URL or user-accessible list of others' claims. Public badge appears ONLY upon approval, can fill one of the two showcases. Add developer-only role assignment via audited privileged script/action to stable user IDs; staff label never grants permissions by itself. Support private CSV export of claim metadata (not certificates); defer Google Sheets automation unless independently configured and access-restricted. Test permission escalation, self-approval, PDF spoofing, URL leakage, deleted claim, concurrent approvals, retention/privacy. Never include proof in logs or public API. Merge only with safe migration flags and handoff.
~~~

**Done when:** admin can process real proof privately; no user can self-verify or assign Moderator.

### Batch 3A — Unified Arena presentation and authorship

**Budget:** targeted aggregator, not a database migration of problem bodies.
**Relevant files:** `components/physics/problem-library.tsx`, `arena-collection.tsx`, `authored/library-collection.tsx`, `authored-library-api.ts`, typed contracts.

~~~text
RECOMMENDED CODEX MODEL: GPT-6.1 Sol · High
BATCH 3A — Present a single Physcratic Arena collection combining static Arena entries and public current-revision authored problems; keep all source-specific readers/graders, immutable revisions, private solutions and original attribution unchanged. Provide type-safe problemKey namespace; no collisions between authored UUID and static IDs. Static internally authored Arena problems show publisher Physcratic; real user-authored problems show linked public author profile, display name and up to two approved achievements, respecting privacy. Original source attributions remain clear. Preserve efficient paginated authored discovery and avoid fetching full private authored documents or N+1 queries. Search/filter across sources must not silently omit results because one source is paginated; choose transparent "load more" behavior or a well-tested federated query. Test old routes, search, unpublication, private author fallback, publication races, performance, mobile. Merge safely and handoff.
~~~

**Done when:** one Arena view, clear origin and user authors, no backend data migration.

### Batch 3B — Favourites and verified completion counts

**Budget:** one additive migration plus UI/API and statistics tests.
**Relevant files:** new favourite model/API, shared problem identity, authored attempt aggregation, Arena cards/reader.

~~~text
RECOMMENDED CODEX MODEL: GPT-6.1 Sol · High
BATCH 3B — Build authenticated idempotent favourite/unfavourite for valid public Arena problemKey, uniqueness (userId, problemKey), accessible heart/bookmark control and aggregated favourite counts shown in Arena cards and detail reader. Persist across sessions; prevent inflated counters on races and retries; rate-limit writes. Add truthful public complete/solved counts only where the existing server grader can prove a unique verified user correctly completed all required parts of the current public revision; exclude repeated checks, ungraded, needs-review, assisted if presented as independent solves, and legacy awaiting-reference. For static Arena without trusted full-problem grading show explicit unavailable state, not 0. Do not confuse unique solves with page views, and do not reveal private user identities. Use bounded queries without N+1. Test concurrency, unpublish, fake problemKey, private ownership, account switch, data races. Keep existing solution permissions intact.
~~~

**Done when:** favourite totals are accurate and solve counts aren't fabricated.

### Batch 4 — Threaded comments and reactions, gated

**Budget:** one database/API batch and one UI commit within the same scoped worktree if needed. Do NOT launch publicly without Batch 5.
**Relevant files:** new comment APIs/contract, Arena problem detail UI, session authorization helpers.

~~~text
RECOMMENDED CODEX MODEL: GPT-6.1 Sol · High
BATCH 4 — Implement readable Reddit-like nested discussion threads for public Arena problems, with root and child comments, max 3–4 visual indentation levels, replying-to label for deeper threads, cursor pagination, newest/top sorting, like/unlike, safe body rendering, own-edit (edited timestamp) and soft-delete retaining child context. Parent must belong to SAME public problem; handle unpublished problem, deleted account/comment and concurrent replies. Verified sessions required to create/edit/like; guests read visible comments. Server validates text lengths and rejects unsafe markup/links. Add bounded per-account/IP throttling and spam duplicate guards. Feature flag COMMUNITY_COMMENTS_ENABLED must default FALSE until Batch 5 moderation/report UI and abuse controls exist; preserve current production behavior with absent schema. Browser-test 375px keyboard/screenreader, deep threads, loading/optimistic rollback, XSS and IDOR. Merge code with flag off, handoff.
~~~

**Done when:** comment code works in tests/staging but cannot expose unmoderated UGC publicly.

### Batch 5 — Reports, moderator console, filters, launch gate

**Budget:** highest-priority safety/completion gate for publicly visible comments.
**Relevant files:** new reports/admin/moderation APIs + UI, staff permission helper, comment create/edit flows.

~~~text
RECOMMENDED CODEX MODEL: GPT-6 Astra · High
BATCH 5 — Build user/problem/comment report API with reason enum, optional text, anti-abuse throttling and idempotent dedup. Implement restricted moderator/admin console for triage, private evidence, hide/restore comment, lock thread, dismiss/action reports, role-specific authority and immutable actor/time/reason audit. Implement server-side content rules on comment creation AND edit: normalized token-level slur/threat filter, conservative profanity/URL/link-spam handling, hold-for-review for uncertain cases, configurable tested allowlist of legitimate educational terms. Avoid false positives from substrings and never let users override server decisions. Provide appeal path/review correction. Every report and moderation endpoint must test unauthorized, owner impersonation, IDOR, CSRF/rate-limits, private proof isolation, duplicate spam, concurrent state changes. Validate reviewer UI mobile/keyboard, retention/privacy and no raw DB diagnostics. Only enable COMMUNITY_COMMENTS_ENABLED after private admin queue, reporting, and staging end-to-end verification are proven. Commit/merge and report deployment/migration status.
~~~

**Done when:** moderators can handle reports and no publicly postable comment can bypass server filters/rate limits.

## 7. Later cycle (do NOT sneak into first-cycle batches)

- **Following/followers:** unique directed edges, block/mute, opt-in private profiles, follower counts and cursor lists, prevention of self-follow and spamming; notification system only if justified.
- **Rating timeline:** display actual `individual_rating_event` snapshots by date (UTC/day policy, multiple events per day), distinguish from `contest_rating`, opt-in publication, keep `ratingVersion`; do not invent points for empty days.
- **Leaderboards:** separately defined user skill, popular authored problems (unique eligible favourites), verified completions; do NOT rank by raw pageviews until bot-resistant authenticated unique-visit definition. No private contest handles/attempts silently exposed. Pagination and ties defined.
- **Difficulty recalibration:** provisional editorial bands 0–199 Physics Fundamentals, 200–799 First-stage Selection, 800–1499 Second-stage Selection, 1500–1999 National Olympiad, 2000–3199 International Olympiad, 3200+ Mastery. These are NOT empirically validated. Use expert anchor problems, measure independent first-attempt correctness by demonstrated user ability, fit Rasch/IRT or a regularized item-response model once enough data, examine self-selection/hints/censoring. Distinguish immutable problem revision, problem difficulty and player skill. Avoid direct rescaling of old Elo events. Add transparent rating-review appeal for material misratings with reviewer notes and versioned changes.
- **Minor polish:** colour-coded accepted/incorrect/needs-review and solved/unattempted, better sorting, settings refinements, nonintrusive effects. Only ship when source statuses are authoritative.

## 8. Working-session handoff

At the end of every batch write `docs/engineering/COMMUNITY_STATUS.md`:

~~~text
Date/time, batch, base SHA, final SHA, branch/PR/merge status.
Changed files (only those relevant).
SQL additions and EXACT environments migrated (local/staging/production) / not migrated.
Feature flags and safe defaults.
Test commands + counts + failures (including inherited known TODOs).
Deployment handoff: mark `NOT DEPLOYED BY CODEX — USER ACTION REQUIRED`; provide merged feature SHA, schema/flag prerequisites and instructions for the user to trigger Vercel from the authorized account with a meaningful README commit. Report Production SHA, READY status and smoke results ONLY if genuinely verified after the user-triggered deployment.
Security/privacy properties tested.
Open blockers and single next Codex batch.
~~~

Do not claim production was checked if you only tested CI, and never claim a migration ran without actual evidence. Each new Codex session should read this handoff, this guide and the few relevant files, not the entire history.

## 9. Suggested order

Run **Batch 0 → 1A → 1B → 2A → 2B → 3A → 3B → 4 → 5**. If minimizing time-to-social-MVP is more important than medal verification, do **0 → 1A → 1B → 3A → 3B → 4 → 5 → 2A → 2B**, because comments must not go public before moderation. Both maintain the five feature groups. One batch per fresh Codex context. Normal merges into main after gates; no unnecessary long recovery runbooks for UI-only changes.
