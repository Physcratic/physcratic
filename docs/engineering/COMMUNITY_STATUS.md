# Community implementation status

## Batch 3A: unified Arena and authorship

**Deployment: PENDING USER ACTION. NOT DEPLOYED BY CODEX. No production/staging SQL, Vercel changes, feature enablement or README-trigger commits.**

Base main: `ca11233c035c5768bce9826694f244e51abee832`. Branch `codex/community-batch-3a`. PR/tested head/CI/final merge SHA are recorded in the final handoff after green CI.

- Arena now presents static Physcratic and published authored problems through the same cards, search, canonical/custom tag filter, difficulty controls and cursor navigation. Original internal Arena cards identify Physcratic as publisher. Authored source/rights declarations remain separate from author identity. No bodies, private keys, readers, grading, solution permissions, revision contracts or existing migrations were changed.
- New `ProblemIdentity` discriminant and `ProblemKey` template namespace use `arena:<registry-id>` and `authored:<uuid>`. Registry validation rejects unknown static keys. Discovery generates authored keys only from current published pointers. Existing `/dashboard/problems/<id>` and `/dashboard/authored/<uuid>` links are unchanged. Existing collection route parsing is unchanged, including legacy practice/default, authored-only deep links, archive and guided collections. The separate authored tab is folded into Arena, while old authored collection links retain their authored-only view and active Arena tab.
- `GET /api/arena/collection` returns at most 24 metadata-only entries. Stable order is static IDs followed by authored UUIDs. Authored search/tag predicates remain in the existing PostgreSQL discovery API **before keyset LIMIT**; no client-side filtering of a partial authored page and no full authored scans/downloads occur. A mixed boundary consumes only displayed authored rows and resumes from the last displayed namespaced key. New publications earlier than a retained cursor require explicit Refresh, as stated in the UI. Concurrent unpublication is excluded by each query's current-publication predicate; readers continue to enforce live authorization. Discovery responses are snapshots, not a cross-request publication freeze.
- Numeric estimates retain existing Arena ELO bands. Authored free-form difficulty labels have no calibrated numeric value: display them as author estimates, include them in All/Unrated, and exclude them from numeric bands. Shared search also searches authored difficulty labels and source metadata through existing discovery terms. Unrated does not invalidate archive/guided filters. Arbitrary authored tags can be entered, with canonical tag suggestions.
- Public attribution requires new default-off **`COMMUNITY_AUTHORSHIP_ENABLED=true` AND `COMMUNITY_PROFILES_ENABLED=true`**. It uses only opted-in public profile display name/handle, never Better Auth names/emails. Private/missing/disabled profiles show “Community author”. Public badges additionally require existing achievements flags; medals require all existing medal-showcase flags. Existing selected ordering and two-slot limits remain intact, with current earned eligibility/medal approval. Revocation and privacy changes apply on the next uncached read.
- At most one authored metadata query and one batched author query per page; distinct public authors are materialized before achievement progress calls. No per-card requests or profile API fan-out. Private proof, attempt contents and keys are never projected. Author query failures (including enabled-but-missing optional tables/grants) omit attribution with an explicit notice, preserving discovery. Authored database failures preserve static results and explicitly mark the page incomplete with Refresh feedback.

### Files, prerequisites and verification

- New `lib/unified-arena{,-api}.ts`, `app/api/arena/collection/route.ts`, `components/physics/unified-arena-collection.tsx`; focused changes to `problem-library.tsx` and shared `problem-card.tsx`. Tests: `lib/unified-arena.test.ts`, `tests/unified-arena{.test.ts,-harness.tsx,.browser.mjs}`.
- **No new migration or grants.** Base authored discovery retains existing deployed 0001–0006 schema/functions/grants. Public authorship additionally needs installed 0007 and runtime SELECT on community_profile (existing profile prerequisites). Earned badge attribution needs installed 0009 and its existing selection/progress/read grants. Medal attribution needs installed 0010/0011 and the exact existing view/helper/claim grants below. Optional media is not a dependency. All flags remain unchanged/default off. Missing optional schema cannot take down the collection.
- Later user/operator enablement: verify ledger/checksums and install only absent prerequisites through their reviewed procedures below; never replay migrations. Verify existing runtime grants and public/private/earned/revoked synthetic cases before enabling authorship. Only the user enables flags and deploys through their paid-seat GitHub/Vercel workflow. Confirm deployed SHA and READY, then smoke-test mixed search/pagination, old readers, author privacy, revocation, auth/submissions and authoring. No production schema or deployment has been inspected or asserted here.
- Targeted disposable PostgreSQL tests pass: mixed boundary pagination without duplicates, filtered 26-result traversal across pages, invalid namespaces/private selectors, old reader links, absent-schema fallback, private-author suppression including a privacy change between metadata/enrichment queries, unpublished exclusion, lost earned eligibility, missing medal migration and live medal revocation. Existing auth/grading/publication/solutions tests remain unchanged.
- Local full suite: **687 server passed, zero failures, one inherited corpus-punctuation TODO; **36 component tests passed**. GitHub CI is pending before merge**. Pinned `corepack pnpm` typecheck, zero-warning lint, production build, offline safety guards and `git diff --check` passed. Real UI/API/disposable-PostgreSQL Chromium flow passed for mixed cards, search, forward/back pagination/focus, public/private authors, preserved reader links, 1440px/375px overflow and axe (zero violations). Screenshots are synthetic local artifacts outside the repository. Local Docker disk pressure was handled with a disposable tmpfs PostgreSQL container and removal of clean completed worktrees, without touching remote resources.
- Built Next smoke with authorship/profile/badge flags OFF and an intentionally unreachable synthetic database: collection returned static results with explicit incomplete-community notice, numeric-filtered static results succeeded without authored access, and responses remained no-store. No community tables are required for disabled attribution.
- Remaining limitations: static-first ordering rather than a blended relevance ranking; authored numeric difficulty remains unavailable; keyset pages are current snapshots, so Refresh is needed for earlier new publications. Existing bounded achievement-progress budgets and default-off prerequisites remain. No favourites, completion counts, comments or Batch 3B features.
- **Next: Batch 3B. Stop after 3A.** Deployment, prerequisite migrations/grants verification and feature enablement remain **PENDING USER ACTION**.

---

## Historical Batch 2B2 handoff

## Batch 2B2: verification UI and medal badges

**Deployment: PENDING USER ACTION. NOT DEPLOYED BY CODEX. No production/staging SQL, Vercel actions, feature enablement or README-trigger commits performed.**

Started from main `c7bb242c246bb4a43c01fe38058099d82f8f3d9b`; incorporated main's unrelated CSP diagnostics PR #93 (`c63d739ac850b4cd7488a34505ec2704eb0dbce5`). Branch `codex/community-batch-2b2`. Delivered in [PR #95](https://github.com/Physcratic/physcratic/pull/95), tested head `f6fccf2040c3b3b3758874c7f78190851ba52674`. Final feature merge SHA: **`f74ddcafcf2ead63d98ae146b767b546e1933422`**. [GitHub CI #163](https://github.com/Physcratic/physcratic/actions/runs/41580876669) passed both jobs, including database/operator guards, typecheck, lint, unit/component tests and production build. This handoff is a subsequent documentation-only commit. No implementation blockers remain.

### Implemented behaviour and changed files

- `/settings` now has a separately gated verification section: competition, award, year, country/National competition name, private certificate name and PDF submission, bounded validation, Unicode-safe claim headers, own claim history/status/reviewer feedback and explicit retry/reconciliation guidance. It uses the unchanged Batch 2B1 upload/status APIs. Approval does not publish a medal automatically.
- `/admin/verification` authorizes through the existing admin API before rendering the dashboard. It provides 50-record keyset pagination, claim-ID lookup for completed reviews, private certificate download, approve/reject/request-more-info/revoke with required reasons and version checks, and immutable audit history. CSV exports only the current page's metadata (ID, competition, award, year, country, state), with spreadsheet formula escaping. Certificate names, files and review reasons are excluded from CSV. Session changes reset scoped client state; authorization failures clear private details. Staff identity or appearance never grants permission. Existing server-side role, self-review and proof-download checks remain authoritative.
- Approved medals share the existing **two ordered showcase slots** with earned achievements. Existing selections are preserved without backfill or automatic publication. Gold, Silver, Bronze and Honourable Mention are distinct, labelled with competition/year and accessible keyboard/touch details. Only explicitly selected, currently approved medals on currently public profiles are returned publicly. Public responses omit certificate names, files, storage details, reviewer identity and claim reasons. Revocation removes eligibility on the next uncached read; dormant selections remain stored until replaced by the owner. Flags off hide medals safely without invalidating earned selections.
- UI: `components/community/verification-{settings,dashboard}.tsx`, `medal-badge.tsx`, existing `achievement-{badge,settings}.tsx`, `account-settings.tsx`, `profile-card.tsx`; `app/admin/verification/page.tsx`, `app/settings/page.tsx`, `app/u/[handle]/page.tsx`.
- Contracts/API wiring: `lib/community/medal-client.ts`, `achievements{,-api,-route,-server}.ts`, `medal-route.ts`; Drizzle `lib/db/schema.ts`; additive `migrations/0011_community_medal_showcase.{up,down}.sql`. Established PDF upload/review/storage backend and migrations **0001–0010 are unchanged**.
- Verification: `lib/community-medal-showcase.test.ts`, `tests/community-medal-badge.test.ts`, `tests/community-verification.browser.mjs`, extended `tests/community-profile-harness.tsx`.

### Default-off flags and exact schema/grant prerequisites

- **`COMMUNITY_VERIFICATION_UI_ENABLED=true`** exposes the Settings/review UI only when both existing `COMMUNITY_MEDALS_ENABLED=true` and `COMMUNITY_STAFF_ENABLED=true` are also set. The admin page's disabled gate runs before session/API/database access. Verification UI needs installed **0010**, its exact grants, audited staff setup and private storage prerequisites below. It does not itself require 0011 or a public profile.
- **`COMMUNITY_MEDAL_SHOWCASE_ENABLED=true`** additionally requires profiles, achievements, medals and staff flags all true. It enables approved-medal queries only after installed **0007, 0009, 0010 and 0011** and grants. With this new flag off, earned achievements still work on the existing 0009 schema without 0010/0011; neither the new view nor medal table is queried. Optional image migration 0008 and media flag remain independent.
- **0011** preserves the selection table and its existing data/order. It replaces the CHECK/guard to allow earned IDs or `medal:<uuid>`, still at most two unique entries. The guard locks the current approved claim and verifies ownership, preventing foreign/unapproved selections and serializing against revocation. `community_approved_medal` is a security-invoker view with public-safe columns only. Runtime retains existing 0010 SELECT/UPDATE on claims (the row lock requires UPDATE) and all existing 0009 grants. No staff-write or proof-access privilege is added.

**Later production procedure — user/operator only:**

1. Keep the two new flags OFF. Verify a recovery point, direct non-pooled owner connection, confirmed non-owner runtime role, migration ledger/checksums and installed prerequisite schemas/grants. Do not infer installation from merged code or replay 0001–0010. Install absent prerequisites only through their separately reviewed procedures below; reconcile drift before proceeding.
2. Review `sha256sum migrations/0011_community_medal_showcase.up.sql` against the reviewed merge (SHA-256 `d38abcc9f4efd5ed01e1f530e62d610e13ef91ef7ecf034c30bbce478ccd9802`). If 0011 is absent, use the confirmed owner connection with `BEGIN; SET LOCAL search_path=public,pg_catalog; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s'; SELECT pg_advisory_xact_lock(hashtextextended('physcratic:authoring:migrations:v1',0));`, then execute the complete reviewed 0011 up file once.
3. **Before COMMIT, in the same transaction**, grant the helper and view to the confirmed existing runtime role:

```sql
GRANT EXECUTE ON FUNCTION public.community_showcase_ids_valid(text[])
  TO "CONFIRMED_RUNTIME_ROLE";
GRANT SELECT ON public.community_approved_medal
  TO "CONFIRMED_RUNTIME_ROLE";
```

The helper grant is mandatory for **all** showcase writes after installation, including earned-only writes while the medal flag is OFF, because the CHECK calls it. Do not commit the migration without this grant. Retain existing schema USAGE, 0009 table/function grants and 0010 claim SELECT/INSERT/UPDATE grants documented below. Never grant runtime staff writes, audit writes, ownership or schema CREATE.
4. Verify constraints/view/trigger, existing selections/order and runtime earned/medal/private/revoked cases. Record ID, checksum, source commit, actor, time and result in `public.physcratic_production_migrations` using its existing format. Commit only after migration and grants succeed, otherwise roll back. Lock timeout means retry later in an appropriate window.
5. Only the user configures flags/deploys through the GitHub account associated with the paid Vercel seat, after prerequisite installation, grants, private-store access and audited staff setup are verified. Confirm the deployed SHA/READY state, then smoke-test own submission, non-admin and self-review denial, admin review/private download, mixed selection/order, profile privacy, revocation and existing auth/submission/authoring. No production installation or deployment is asserted by this handoff.
6. Roll back exposure by disabling the new flags and deploying through the user. Preserve claim/proof/audit/selection data. The 0011 down migration refuses any stored medal selection, including dormant entries; it restores the old earned-only guard and is intended for disposable verification, not automatic production rollback.

### Validation and limitations

- Targeted disposable PostgreSQL 18.6: **19 tests passed**, including 0011 up/down/up preserving old selections, populated-down refusal, restricted runtime privileges, missing-new-schema compatibility while disabled, ownership/forged IDs, two-slot uniqueness/order, private/public visibility and live revocation. Existing 2B1 tests cover self-review denial, staff role forgery/revocation, approval races, IDOR, PDF abuse and storage failures.
- Real-component/API/disposable-PostgreSQL browser flow: **23 assertions passed**. Covers PDF submission with a non-ASCII certificate name, paginated queue, secure download, metadata CSV, more-info/approval/audit, mixed slot selection/order/persistence, public redaction, revocation, private profiles and non-admin denial. Chromium desktop/mobile (1440px/375px), light/dark, keyboard disclosure and mobile overflow checked; axe found **zero violations** in all checked views. Screenshots visually reviewed; synthetic artifacts kept outside the repository.
- Typecheck, zero-warning lint, production build, offline isolation guards and `git diff --check` passed. Full suite on the synchronized main: **684 server tests passed, zero failures, one inherited corpus-punctuation TODO; 35 component tests passed**. GitHub CI #163 passed on the exact tested head before merge. An initial local rerun could not start disposable PostgreSQL due to local disk pressure; generated build cache was cleared and the suite restarted. No production resources were involved.
- Actual built Next server with all community flags OFF and an unreachable synthetic database: Settings and admin unavailable page returned 200; medal own/queue and achievement routes returned explicit disabled 503 with private/no-store. No new schema is required to ship disabled code. The existing global Better Auth connection diagnostic remains unrelated to community table access.
- Retained 2B1 limits: 5 MiB/20-page restricted PDFs, five upload attempts/day, 20 lifetime reservations/account; ambiguous uploads require operator reconciliation. More-info does not replace immutable proof; reviewers must reject before a corrected fresh claim. No automated retention/cleanup is introduced. The review queue contains pending/more-info records; completed claims are opened by claim ID. CSV is current-page metadata only. Previously downloaded proofs cannot be recalled.
- **Next phase: Batch 3A. Stop after 2B2.** Production migration/grants, enablement, private-store configuration, deployment and deployed smoke checks remain **PENDING USER ACTION**.

---

## Historical Batch 2B1 handoff

## Batch 2B1: medal verification backend and staff authorization

**Deployment: PENDING USER ACTION. No production/staging SQL or Vercel actions performed.**

Started from `0f77f22b21cbe43f09b7f128b7d8b59b5a072025`; incorporated main's PR #89 (`31b9c10`) without changing the calculator work. Branch `codex/community-batch-2b1`. Delivered in [PR #90](https://github.com/Physcratic/physcratic/pull/90), tested head `39da8d46fe9d31cef2946ef84fd260b39f02f94b`. Final feature merge SHA: **`092771998f5574c655c819ce7e85fc830773cc84`**. [GitHub CI #156](https://github.com/Physcratic/physcratic/actions/runs/41546255613) passed both jobs, including database/operator guards, typecheck, lint, unit/UI tests and production build. This handoff update is a subsequent documentation-only commit.

### Backend and security contract

- Independent default-off flags: **both** `COMMUNITY_MEDALS_ENABLED=true` and `COMMUNITY_STAFF_ENABLED=true` are required. The gate runs before importing auth/database/storage bindings. Profiles, media and achievement flags/migrations are not prerequisites. Existing Better Auth verified sessions and origin validation remain authoritative; no signup/profile/body/header role claims are trusted.
- `POST /api/community/medals`: raw `application/pdf` body, with an ASCII-safe JSON `X-Medal-Claim` header (use JSON Unicode escapes for non-ASCII names) (maximum 4096 bytes). Strict keys: `competition` (IPhO/APhO/EuPhO/National), `award` (gold/silver/bronze/honourable-mention), integer `year` (1959 through current UTC year), `certificateName` (1–160 characters), optional two-letter uppercase `country`, optional `competitionName` (maximum 120). National claims require country and competition name. Certificate identity is immutable and separate from profile display names. No public proof URL or automatic public medal is created.
- `GET /api/community/medals`: own claims/status only, at most 20. No other user's selector is accepted. Authentication and verified email are required. Own responses omit storage paths, hashes and reviewer IDs.
- Admin-only `GET /api/community/medals/review?after=<uuid>`: bounded queue, 50 records, UUID keyset cursor. `GET /api/community/medals/[id]/review`: claim and immutable audit history. `POST` to the same URL accepts only `{version, decision, reason}`; decisions approved/rejected/more-info/revoked. Version conflicts return 409; nonempty reason required. Pending/more-info can become approved/rejected or request more info; only approved can become revoked. Submitted fields never change. Rejected/revoked claims can be submitted afresh; approved/pending/uploading/more-info claims occupy one active competition/year slot (National also includes country/name). Changing country/name cannot duplicate an international claim.
- `GET /api/community/medals/[id]/proof`: verified current admin only, **including denial to the claimant even if they are an admin**. Moderators cannot review or download. Self-review is denied. Staff permissions are re-read with row locks inside review transactions; downloads recheck after bounded storage retrieval and compare claim version, byte count and SHA-256 before returning anything. Concurrent role revocation blocks further authorization. Downloads already sent cannot be recalled.
- Proofs are attachment-only `application/pdf`, sandboxed, nosniff, private/no-store/noindex; error responses never expose storage/database details. No SDK URLs, proof paths or certificate names enter public profiles or achievement responses.
- PDFs: maximum 5 MiB, actual signature/EOF/structure checks plus PDF.js parsing, 1–20 pages. Reject encrypted PDFs, compressed object streams and known JavaScript/action/embedded-file/rich-media markers, including hex-escaped names. Parser and worker are bundled together and loaded only on enabled submissions. Documents are never rendered by this backend. This is structural validation and a restricted PDF subset, not an antivirus service; some optimized PDFs require a conventional PDF export.
- Shared database limits: 30 requests/account/minute and 5 upload attempts/UTC day, including rejected input. Maximum **20 lifetime claim reservations/account**, bounding stored proof bytes to 100 MiB/account including failed/ambiguous uploads. Limits serialize across instances. Original submissions and audit rows cannot be updated/deleted; role changes record old/new role, reason, database session operator and timestamp.
- Storage PUT occurs only after a reservation is committed. Failed/ambiguous PUT or finalization leaves a tracked `uploading` claim; it cannot be reviewed or downloaded. It continues consuming the active slot and lifetime reservation until an operator reconciles the object. No automatic destructive cleanup or retry overwrite is performed. This conservative recovery/retention limitation is explicit; a retry must not create untracked objects. More-info does not mutate/replace the original proof; a reviewer can reject with instructions for a fresh corrected claim.

### Schema, privileges and exact operator prerequisites

Migration **0010_community_medals** adds `community_staff`, `community_staff_audit`, `community_medal_claim`, `community_medal_audit`, `community_medal_limit`, constraints/indexes, immutable/state/audit triggers and `community_admin_locked(text)`. Existing migrations 0001–0009 are untouched. It depends only on the existing Better Auth `user(id)` table. Drizzle declarations mirror fields/indexes; SQL is authoritative for guards and constraints.

1. Keep both new flags OFF while deploying code against the current production schema. The user/operator first authorizes a recovery point and migration window, verifies the direct production owner connection and existing runtime role, inspects the existing migration ledger/checksums, and confirms 0010 is absent. Never replay earlier migrations or infer installation from merged code.
2. On that reviewed direct owner connection: `BEGIN; SET LOCAL search_path=public,pg_catalog; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s'; SELECT pg_advisory_xact_lock(hashtextextended('physcratic:authoring:migrations:v1',0));` then execute the complete reviewed `migrations/0010_community_medals.up.sql` once. Record checksum/source commit/actor/time/result in `public.physcratic_production_migrations` using its existing format. Verify all guards, indexes and privileges before commit; rollback on failure. The two SECURITY DEFINER functions capture this trusted search_path: one locks/reads staff without granting staff UPDATE, the other appends trigger-derived medal audit rows. Never install with an untrusted schema in search_path.
3. Apply the following to the **confirmed existing non-owner runtime role** (replace the placeholder). Audit existing inherited memberships/default grants: runtime must not own these objects or inherit owner/operator privileges. Preserve unrelated existing grants.

```sql
REVOKE ALL ON public.community_staff, public.community_staff_audit,
  public.community_medal_audit FROM "CONFIRMED_RUNTIME_ROLE";
GRANT SELECT, INSERT, UPDATE ON public.community_medal_claim,
  public.community_medal_limit TO "CONFIRMED_RUNTIME_ROLE";
GRANT SELECT ON public.community_medal_audit TO "CONFIRMED_RUNTIME_ROLE";
GRANT EXECUTE ON FUNCTION public.community_admin_locked(text)
  TO "CONFIRMED_RUNTIME_ROLE";
```

Existing schema USAGE is needed. Do not grant runtime staff writes, audit INSERT/UPDATE/DELETE/TRUNCATE, schema CREATE, owner-role membership or trigger-function EXECUTE. SQL trigger audit inserts run as the migration owner, with a fixed trusted search_path. Restrict table owner credentials to operators; owners inherently can bypass database permissions, so they must not be used by the app. Test the runtime grants before enablement.
4. Staff assignment/revocation is **only** the audited direct-connection operator procedure `scripts/community-staff.sql`. Supply psql `--set=ON_ERROR_STOP=1 --set=user_id=<stable Better Auth ID> --set=staff_role=admin|moderator|none --set=reason='<reviewed operator ticket/reason>' --file=scripts/community-staff.sql`. Verify account identity separately before assignment. `none` revokes; never delete staff history. The transaction records `session_user` and reason automatically, including bootstrap. No HTTP role-assignment endpoint exists. Do not run this script using application credentials.
5. Independently configure `COMMUNITY_MEDAL_BLOB_STORE_ID` to an intended **existing private** Vercel Blob store, with the project's per-request OIDC private put/get permission. The adapter uses only `community-medal-proof/<server UUID>.pdf`, private access and no overwrites; it never falls back to legacy/public credentials or the profile namespace. Confirm private-store configuration and runtime retrieval before enabling the flags. Codex has not configured/provisioned storage or changed Vercel settings.
6. Only the user deploys through the GitHub account associated with the paid Vercel seat. After migration/grants/store/staff setup are verified, the user enables both flags, deploys, verifies Production READY and the intended SHA, then checks own submission/status, admin review/audit/download, moderator/claimant denial, revocation and existing auth/submission flows. Production installation/storage transport remain unverified until this operator step.
7. Roll back exposure by turning either new flag OFF and redeploying via the user. Preserve all proof/claim/staff/audit data. The down migration refuses any claim or staff audit history and is for empty disposable testing only. Stuck uploading claims require operator verification of object existence/length/hash before finalization; do not blindly delete the reservation or enable review. Retention and automated cleanup are not included in 2B1.

### Files and validation

- API routes under `app/api/community/medals`; `lib/community/medal-{api,contracts,route,server,storage}.ts`; `lib/db/schema.ts`; SQL 0010 up/down; `scripts/community-staff.sql`; `types/medal-pdf-worker.d.ts`; `lib/community-medals.test.ts`.
- Disposable PostgreSQL checks cover up/down/up without any community prerequisites, runtime least privileges, role forgery/revocation, self-review, IDOR, review races, audit immutability, private downloads, PDF spoofing/abuse, ambiguous storage failures and shared limits. Private-store adapter tests cover explicit binding/namespace/OIDC/private options. Local full suite: **682 server tests passed, zero failures, one inherited corpus-punctuation TODO; 29 UI tests passed**. Seven targeted checks (including nested database cases and storage adapter) pass. Pinned `corepack pnpm` typecheck, lint and production build pass; isolation guards and `git diff --check` pass. The actual production-bundled PDF parser/worker also accepted a synthetic valid proof. GitHub CI #156 passed on the exact tested head before merging.
- Actual built Next server with both new flags OFF and an intentionally unreachable synthetic database: own/submit/queue/proof/review returned explicit disabled 503/private-no-store; Settings returned 200. No new schema is needed to ship disabled code.
- No review dashboard, medal showcase, public staff badges, comments or later batches implemented. **Next: Batch 2B2.** Deployment/migration/grants/private-store setup and smoke testing remain **PENDING USER ACTION**.

---

## Historical Batch 2A handoff

Updated: 3 November 2026, 05:21 WITA (UTC+8).

## Batch 2A: earned achievements and profile showcase

**Deployment: PENDING USER ACTION. NOT DEPLOYED BY CODEX.**

- Started from main `b98e97c6f6fee107749b99d87caa68a0e7b8a795`, then fast-forwarded the user's README deployment commit `6c2946d8c5309b902362488a7392fc653bd92740`. No README changes were authored by Codex. Branch: `codex/community-batch-2a-2026-11-03`.
- Implementation/tested head: `88c5291cdaaf775387870490be3830419c23b354`. Delivery: [PR #86](https://github.com/Physcratic/physcratic/pull/86). Final feature merge SHA: **`e4f6ad2bf88f68ca9a4ea1b48607ba02ddd7e1d3`**, merged after successful [GitHub CI #151](https://github.com/Physcratic/physcratic/actions/runs/41526808039). Both jobs passed, including database tests, release/transport guards, typecheck, lint, server/component tests and production build. This final handoff is a subsequent documentation-only commit.
- Earlier prerequisites remain outstanding: user/operator must verify/install 0007 and runtime grants; 0008/private Blob is a separate optional image prerequisite. Merged code does not establish database installation or deployment.

### Definitions and authoritative eligibility

| ID | Badge | Current requirement |
|---|---|---|
| `first-spark` | First Spark | 1 published owned problem |
| `problem-weaver` | Problem Weaver | 5 published owned problems |
| `equation-architect` | Equation Architect | 15 published owned problems |
| `master-problem-setter` | Master Problem Setter | 50 published owned problems |
| `first-breakthrough` | First Breakthrough | 1 verified complete solve |
| `persistent-solver` | Persistent Solver | 10 distinct verified complete solves |
| `olympiad-pathfinder` | Olympiad Pathfinder | 50 distinct verified complete solves |

- The typed client-safe registry is `lib/community/achievements.ts`. SQL 0009 independently enforces its thresholds; integration tests check the thresholds and persisted selections. No client counts, arbitrary IDs, credentials or manual staff awards are accepted.
- Author count is distinct owned `authored_problem` identities with `state='published'` and a valid current revision. Drafts and historical/repeated revisions do not count. Unpublish removes the problem; republish counts the same identity once. Counts cap at 50.
- A solve requires a currently published, non-self-authored schema-v1 revision with at least one part. Every relational part is required and must support automatic numeric or expression grading. For every part, the same user must have a current-revision immutable receipt with `status='correct'`, `assisted=false`, matching answer kind and supported engine/reason (`numeric-v1`/`within-tolerance` or `symbolic-v1`/`symbolic-equivalent`). Multiple attempts count one problem. Partial, incorrect, needs-review, ungraded/manual, unsupported and cross-revision work is excluded. Static/legacy self-review, solution/page views, Elo and contest events provide no authoritative completion evidence and are excluded.
- Existing reveal tracking makes every later attempt in that revision assisted. Earlier qualifying unassisted receipts remain qualifying after a later reveal. The grader, immutable attempt/reveal records, auth, authoring and ratings are unchanged.
- Eligibility reflects a database statement snapshot. Unpublication removes author and solve credit; a new revision needs complete receipts for that revision. Restoring the exact previously solved revision can restore credit. No historical award ledger is implied.
- Live indexed reads avoid cache invalidation: author aggregation stops at 50; loose seeks over the partial correct/unassisted index skip repeated attempts. Solver evaluation stops at 50 qualifying problems or 2,000 candidate identities. If more candidates remain and 50 cannot yet be established, solver progress is **null/unavailable**, not zero or a fabricated total. Author progress remains independently available. SQL request statements have a five-second timeout; contention/errors return generic unavailable responses.

### Selection, API and screens

- `GET /api/community/achievements`: authenticated own progress, active ordered `selectedIds`, `hiddenSelectionCount`, and `profileExists`; no profile is auto-created. No email/name copying or identity backfill.
- `PATCH /api/community/achievements`: strict `{selectedIds: [...]}` only; zero to two distinct known eligible IDs. Requires verified existing Better Auth session, same-origin request and existing own profile. No target user ID is accepted. Shared PostgreSQL quota is 10 writes/account/minute, independent of profile/image quotas; invalid writes consume quota. Per-owner transaction serialization prevents interleaved array updates. Last successful whole-array write wins; order persists.
- `GET /api/community/achievements?handle=<handle>`: currently public profiles only; missing/private both 404. Returns only `{selectedIds}`, with no internal IDs, counts, attempt details or unpublished content. Every nonempty public showcase is filtered against live eligibility and current visibility in the same SQL snapshot. All responses are private/no-store/noindex and vary on Cookie.
- Ineligible saved choices are dormant and immediately hidden publicly and in active preview. They can reappear if eligibility returns; the owner sees the hidden count. Saving replaces the entire saved preference, including dormant choices. SQL CHECK/FK/trigger constraints also reject forged, unearned, duplicate, oversized or identity-changing runtime writes.
- `/settings` has an Achievements section with definitions, measured progress, locked/unlocked/unavailable states, 0–2 selection, order swap, live profile/showcase previews, save/reload and loading/error/success states. Saves remain disabled without a saved profile or verified session. Account changes abort requests and reset scoped state through the existing keyed editor.
- `/u/[handle]` renders active badges beside the display name only after public authorization. Reusable badges have distinct colors/icons, restrained rare styling, wrapping and native keyboard/touch-accessible details. Styling is static and respects reduced motion without animation. No medal/staff/credential placeholders were added.

### Changed files

- API: `app/api/community/achievements/route.ts`; `lib/community/achievements{,-api,-route,-server}.ts`.
- UI: `components/community/achievement-{badge,settings}.tsx`, `account-settings.tsx`, `profile-card.tsx`; `app/settings/page.tsx`, `app/u/[handle]/page.tsx`.
- Database: `migrations/0009_community_achievements.{up,down}.sql`, `lib/db/schema.ts`, `migrations/README.md`. Migrations 0001–0008 are unchanged. New selection/rate tables, two read-only progress functions, a guard on the new selection table and two additive indexes; no new triggers on existing publication/grading tables.
- Verification: `lib/community-achievements.test.ts`, `tests/community-achievement-fixtures.ts`, `tests/community-achievements.browser.mjs`, and extended existing profile browser harness. No dependency/infrastructure changes.

### Validation

- Targeted disposable PostgreSQL 18.6 tests: **10 passed**, including author/solver thresholds, drafts, repeated publication, multipart/cross-revision/manual/unsupported results, assisted receipts, idempotent concurrent submissions, unpublish/restoration, forged/oversized/unauthorized writes, SQL constraints, restricted runtime privileges, selection races, shared limits, private lookups and bounded sparse-history unavailable semantics. 0009 up/down/up preserves existing default-private 0007 profiles; populated rollback is refused. 0008 is deliberately absent throughout these tests.
- Browser: **21 assertions passed** with real UI/API factories and disposable PostgreSQL, Chromium at 1440px/375px, reduced motion, light/dark, keyboard disclosure, selection limit/order/persistence, public/private and live eligibility revocation, generic error/retry, feature-off no API requests and no server query code in the browser bundle. Axe: zero violations in all four checked configurations. Mobile screenshots visually reviewed; local synthetic artifacts are outside the repository at `/workspace/work/batch2a-ui-final`.
- `bash scripts/test-problem-authoring.sh corepack pnpm test`: **675 server passed, 0 failed, 1 inherited corpus-punctuation TODO; 29 UI passed**. Includes existing profile/auth/authoring/submission/grading/solution regressions.
- Pinned `corepack pnpm exec next typegen`, `corepack pnpm exec tsc --noEmit`, `corepack pnpm lint --max-warnings=0` and `corepack pnpm build`: passed. Synthetic build credentials only. `python3 -B scripts/phase-c-offline/run.py safety` and `git diff --check`: passed. React lifecycle, serialization, privacy and accessibility review completed.
- Actual built Next server with all community flags OFF and an intentionally unreachable synthetic DB: new GET/PATCH routes returned explicit disabled 503/private-no-store, profile URLs consistently returned 404, and mobile Settings/Appearance loaded with theme persistence and zero community API requests/browser errors. No new schema is required to ship disabled code.
- The full suite caught the existing copy rule against “unlock”; the interface now uses Earned/Locked without weakening that rule. The browser harness now lets theme color transitions settle before contrast measurement. Generated prior-batch build caches were removed to recover local test disk space. No unrelated production features or tests were rewritten. GitHub CI #151 passed on the exact tested head above before PR #86 was merged.

### Exact later production enablement: user/operator only

1. Keep `COMMUNITY_PROFILES_ENABLED`, `COMMUNITY_PROFILE_MEDIA_ENABLED` and **`COMMUNITY_ACHIEVEMENTS_ENABLED` OFF** while shipping this code against the current schema. The achievements gate requires both profiles and achievements to equal `true`, and precedes session/database imports and all new table access. Media readiness is independent. Settings/Appearance and existing application features work with all community tables absent.
2. Separately authorize a recovery point and migration window; confirm the production direct/non-pooled owner connection, existing runtime role and current migration ledger. Inspect `public.physcratic_production_migrations`, schema and checksums from the reviewed merge. Do not infer any installed migration from a merged PR. Never replay 0001–0008 or frozen historical packages. If 0007 is absent, install its complete reviewed up file **once** using the earlier profile procedure below and verify its grants/private defaults. If installed, verify checksum/schema and skip its SQL. Drift means stop and reconcile.
3. After existing authored migrations 0001–0006 and 0007 are verified, install **0009 only if absent**. Review `sha256sum migrations/0009_community_achievements.up.sql`. On that confirmed direct owner connection, explicitly `BEGIN`, `SET LOCAL search_path=public,pg_catalog`, `SET LOCAL lock_timeout='5s'`, `SET LOCAL statement_timeout='60s'`, then `SELECT pg_advisory_xact_lock(hashtextextended('physcratic:authoring:migrations:v1',0));`. Execute the complete reviewed 0009 up file once. Verify both new tables, constraints/FKs/selection guard, both eligibility functions and partial indexes; compare source counts/read plans on synthetic operator-controlled accounts. Record migration ID/checksum/source commit/actor/time/result using the existing ledger format, and commit only after all checks succeed. Roll back on failure. Index creation takes bounded locks on existing authored tables; choose a quiet window and retry later if the lock timeout fires. No automatic build/start migration hook exists.
4. Grant only to the confirmed existing application role (substitute its reviewed name; retain existing schema USAGE):

   ```sql
   GRANT SELECT ON public.community_profile, public.authored_problem,
     public.authored_revision, public.authored_revision_part, public.authored_attempt
     TO "CONFIRMED_RUNTIME_ROLE";
   GRANT SELECT, INSERT, UPDATE ON public.community_badge_selection,
     public.community_achievement_write_limit TO "CONFIRMED_RUNTIME_ROLE";
   GRANT EXECUTE ON FUNCTION public.community_achievement_progress(text),
     public.community_achievement_problem_solved(text, uuid)
     TO "CONFIRMED_RUNTIME_ROLE";
   ```

   Preserve existing auth/authoring/profile grants. Do not grant PUBLIC access, trigger-function EXECUTE, table ownership, schema CREATE or new private-key access. Test these exact privileges before enabling. Functions run with invoker privileges, not SECURITY DEFINER.
5. The user may enable profiles after 0007/grants and achievements after 0009/grants by setting `COMMUNITY_PROFILES_ENABLED=true` and `COMMUNITY_ACHIEVEMENTS_ENABLED=true`. Keep media OFF until its separate 0008/grants/private Blob prerequisites below are satisfied. 0008 is not an achievement dependency.
6. **Only the user** triggers deployment through the GitHub account associated with the paid Vercel seat. Verify Production READY and a deployed SHA containing this merge; then smoke-test Settings save/reload/clear/order, public/private visibility, unpublication/revision revocation, auth, submissions and authoring. Codex has not initiated Vercel builds, changed flags/settings, applied SQL, or made a README-trigger commit. Git merge is not deployment evidence.
7. Roll back exposure by disabling achievements (or profiles to gate all community features) and redeploying through the user. Preserve saved selections and immutable history. Do not run down on populated production tables: 0009 down deliberately refuses any saved selection. Disposable up/down/up is not production SQL authorization.

### Outstanding and next phase

- No implementation blockers. PR #86 merged after local verification and green GitHub CI #151. Production migration 0007/0009, runtime grants, flag enablement, deployment and deployed smoke remain **PENDING USER ACTION**. Optional media retains separate 0008/private-storage prerequisites.
- Counts are current eligibility rather than lifetime awards, capped at 50; sparse histories beyond the bounded budget report unavailable solver progress. No unsupported/static completion claims or background projection jobs were introduced. The new indexes need an operator migration window. No production schema introspection or deployed verification was performed; current-schema compatibility is established by default-off lazy gates and local built-server checks.
- **Next: Batch 2B**, starting from latest main in a new request. No medal verification, staff roles, favourites, comments or leaderboards are included. Stop after Batch 2A.

---

## Historical Batch 1B handoff (pre-Batch 2A; retained for media/profile operator details)

**Deployment: PENDING USER ACTION. NOT DEPLOYED BY CODEX.**

- Starting base: latest main `cfcbfaa97cb33db44e7bd85e520dd63c45c31a1d`. During work, main advanced through PR #80 to `5689bb193fe466faa6058202a4477f46886246d9`; integrated it normally as `3bcf7627b8f2e05b5309af20ffe3fa56a9260382`, preserving all new guides/metadata changes, then reran combined checks.
- Implementation SHA: `3b640c8c176bf32e5fde4a1be48635c4cccaded4`. Final synchronized/tested PR head: `b1f1ad4b7b896695cf977985b764233604cb9828`.
- Branch: `codex/community-batch-1b-2026-11-03`. Delivery: [PR #83](https://github.com/Physcratic/physcratic/pull/83). Final feature merge SHA: `643a7d83c60bada14d3903cfd672580a2ecc2718`, merged to main after green CI. This final handoff update is a subsequent documentation-only commit.
- Prior deliveries remain intact: Batch 0 PR #77 (`5209a47`), Batch 1A PR #79 (`07dcad9`). The user reports production migration 0007/runtime grants are **not installed**. No installation or production readiness is assumed here.

### Implemented screens and behaviour

- `/settings`: responsive Account Settings with Profile, Appearance and Images sections. Dashboard/sidebar and Learn desktop/mobile Settings entries now link here. Removed the old theme-only dialog; the same Light/Dark/System preferences, storage and default theme remain available to guests and when profiles/media are unavailable.
- Profile form reuses the Batch 1A API/validation: explicit first save, empty identity defaults, editable display name, permanent lowercase username with a clear pre-save warning and read-only control afterward, 500-code-point biography, education preferences, canonical favourite topics and default-private visibility. Includes loading/retry, conflict/error/success states, dirty-change warning, discard action, live preview and saved-public-profile link. Does not modify Better Auth name/email or verification records.
- `/u/[handle]`: server-approved public fields only, banner, overlapping avatar, biography, education and topic chips. Missing/private profiles have the same non-disclosing not-found page. All profile pages are noindex; no public member date, achievements, invented statistics, followers or comments.
- Verified signed-in users without a profile may see an optional dashboard setup invitation. Skip creates/publishes nothing. Completion/dismissal is versioned and scoped to the stable account ID in device-local browser storage, containing no profile draft fields. If storage is unavailable, automatic invitations are suppressed. Existing users are never redirected or forced through setup. Setup remains available through Settings. No signup/CAPTCHA/Terms/verification transport changes.
- Auth return-path allowlist additionally accepts only `/settings` (and its query), so the Settings sign-in link can return there. Existing dashboard targets and off-site/unsafe target rejection remain tested.

### Private image lifecycle

- Separate **default-off** media flag and migration 0008; profile fields can work with 0007 alone while images stay off. Avatar/banner changes require an existing own profile, verified Better Auth session and configured same-origin request.
- Raw PNG/JPEG/WebP bytes only. Client MIME/extension is not trusted. Input caps: avatar 2 MiB, banner 5 MiB. Actual image validation rejects invalid, SVG/HTML, animated, tiny, oversized-edge and excessive-pixel inputs. Limits: 20 megapixels, edges at most 8192 and at least 32 pixels. Sharp rotates orientation, centre-crops/resizes and re-encodes to metadata-free WebP: avatar 512×512, banner 1600×400, maximum 1 MiB output. No original filenames or EXIF/XMP/ICC are retained.
- Private Vercel Blob objects use server-generated `community-profile-media/<uuid>.webp` paths, no overwrite, and an explicit existing private-store binding. API responses contain application URLs/IDs only, never SDK URLs, store identifiers, OIDC credentials or paths. Existing private authoring/evidence storage is unchanged.
- Every image read checks current registry state and owner/public visibility. Image URLs bypass Next image optimization, use private/no-store responses and render a placeholder on unavailable storage. Opt-out immediately denies subsequent guest reads, including previously public IDs. Replacement/removal revokes old IDs before physical cleanup. Removing an image also cancels a reserved upload, preventing a late storage response from restoring it.
- Atomic shared limits: 5 image mutations/minute, 20 upload attempts/UTC day, at most 8 tracked objects/account, one active avatar and banner each. Profile-detail write quota is independent. Invalid/conflicting uploads consume quota.
- Pending/ambiguous PUTs are retained for one hour as cleanup evidence. Retired/deleting records support retries after storage failures. Cleanup processes at most three objects/call, outside database locks, during image changes or the owner's cleanup action. Inactive accounts retain bounded orphans until later activity/cleanup; no scheduler/infrastructure was introduced. Down refuses any nonempty media registry.

### Changed files and API routes

- Pages: `app/settings/page.tsx`, `app/u/[handle]/{page,not-found}.tsx`.
- UI: `components/community/{account-settings,appearance-settings,profile-card,profile-image,profile-media-controls,profile-setup-prompt}.tsx`; Settings links in `components/kokonutui/sidebar.tsx` and `components/learn-header.tsx`; gated invitation in `components/kokonutui/layout.tsx`; removed `components/settings-dialog.tsx`.
- Shared profile client/contracts: `lib/community/profile-client.ts`, `profile-media-contracts.ts`. Media server: `profile-image.ts`, `profile-media-api.ts`, `profile-media-route.ts`, `profile-media-server.ts`, `profile-media-storage.ts`.
- `GET /api/community/profile-media`: own metadata; `?handle=<handle>` returns metadata only for a currently public profile.
- `PUT/DELETE /api/community/profile-media/[kind]`: own avatar/banner upload/remove. `GET /api/community/profile-media/image/[id]`: authorized current image proxy. `POST /api/community/profile-media/cleanup`: bounded own orphan cleanup. Every route is disabled before loading DB/auth/storage bindings unless both feature flags are enabled.
- Additive `migrations/0008_community_profile_media.{up,down}.sql` and corresponding `lib/db/schema.ts` declarations. New tables: `community_profile_media`, `community_profile_media_limit`; SQL owns immutable identity/state-transition/delete guards.
- `package.json`/`pnpm-lock.yaml`: direct pinned `sharp@0.35.5`, already the version used transitively by Next, for supported server-side validation/re-encoding.
- `lib/submission-security.ts` and its test: narrowly extended safe Settings return target.
- Tests: `lib/community-profile-media.test.ts`, `lib/community-profile-pages.test.ts`, `tests/community-profile.test.ts`, `tests/community-profile-harness.tsx`, `tests/community-profile.browser.mjs`. This handoff is the only documentation change.

### Migration and flags: safe with the current production schema

- **No staging/production SQL executed.** Migration work ran only in disposable PostgreSQL 18.6 test containers, including CI services. Existing migrations 0001–0007 and historical release packages are unchanged. No account backfill/reset, infrastructure or Vercel settings changes.
- `COMMUNITY_PROFILES_ENABLED`: exact string `true` enables profiles; default OFF. Keep OFF until 0007/runtime grants are verified. Disabled Settings still supports appearance; public routes return not found without profile reads.
- `COMMUNITY_PROFILE_MEDIA_ENABLED`: exact string `true` **and** profiles enabled are required; default OFF. Keep OFF until 0008/grants/private store are verified. Disabled handlers do not load media server bindings, and profile UI/pages do not request media tables.
- `COMMUNITY_PROFILE_BLOB_STORE_ID`: user/operator must explicitly bind the intended existing **private** Blob store connected to the intended project with working request-scoped OIDC authorization. No store was created, selected remotely or configured by Codex. Missing storage produces nonleaking errors while profile details remain functional.
- SQL up/down source commit for 0008: `3b640c8c176bf32e5fde4a1be48635c4cccaded4`. Up SHA256: `02a7f6f1850e4092933426275e36431a967810dd1ce2644d6f09ee0780dd0e0b`. Down SHA256: `6d6231f80df6c503e3879b10401675b86aff3fb3f7b44cc5d7426ed34158c753`.
- Preserved 0007 up SHA256: `7fcba67760efa0d265c949f20dc3351a49721c9285c21e498b70013969e19f0e`, original source commit `bd3ee3bffbf360301faa8289e2c11b3d954108d8`.

### Verification

- Pinned `corepack pnpm install --frozen-lockfile`: passed after the direct Sharp dependency/lockfile update.
- `corepack pnpm exec next typegen && corepack pnpm exec tsc --noEmit`: passed. `corepack pnpm lint --max-warnings=0`: passed.
- `bash scripts/test-problem-authoring.sh corepack pnpm test`: 666 server tests, 665 passed, zero failures/skips, one inherited corpus punctuation TODO. All 29 component tests passed, including the incoming product-guide checks. Includes existing actual Better Auth, CAPTCHA/Terms, authoring, grading, private solutions and submission regressions.
- New media coverage: valid formats/dimensions/re-encoding/metadata removal, MIME spoofing/animation/size rejection, owner/guest/other-account access, origin rejection, cross-instance limits, daily/storage quotas, replacement/removal, remove-versus-late-PUT race, ambiguous upload and delete outage/retry, restricted runtime grants and migration up/down/up preserving 0007 profiles. Disabled route/page exports are tested without new schema.
- `AUTHORING_BROWSER_TOOLS=<local Playwright+axe tooling> CHROMIUM_PATH=/usr/bin/chromium bash scripts/test-problem-authoring.sh node --require ./tests/server-only-register.cjs --import tsx tests/community-profile.browser.mjs`: **91 assertions passed** using real production UI components/API factories, disposable PostgreSQL, actual Sharp and an in-memory private-storage boundary. Covers save/reload/permanent handle/duplicate identity, private/public changes, guest image revocation, image changes/failures/spoofs/size limits, onboarding skip/completion/account switch, flags, errors/retry, guest/unverified settings, native keyboard radio controls and System persistence. Axe reported zero violations at 1440px/375px in light/dark. Desktop/mobile screenshots were visually reviewed; synthetic artifacts are outside the repository under `/workspace/work/batch1b-ui-artifacts`.
- `corepack pnpm build`: passed. The actual built Next server was additionally checked with both flags OFF and an intentionally unreachable synthetic database: Settings/theme worked at 375px with no profile/media requests, missing/private profile URLs returned consistent 404, and all new API methods returned disabled 503/private-no-store. No live DB/Blob binding was used.
- `python3 -B scripts/phase-c-offline/run.py safety`: passed runner self-test, transport tests (5 pass, 2 expected skips) and ESLint scope guard (1 pass). `git diff --check`: passed. React lifecycle/privacy/serialization/accessibility review completed.
- New test-runner JSX compatibility, landmark issues, a theme-harness mismatch and the remove/upload race found during checks were fixed. Final checks have no new failures. Actual production Blob authorization/transport and deployed UI smoke remain unverified until the user configures/enables/deploys.
- [GitHub CI #147](https://github.com/Physcratic/physcratic/actions/runs/41521599289) passed on final synchronized PR head `b1f1ad4b7b896695cf977985b764233604cb9828`. Both jobs succeeded, including database tests, reviewed release/transport guards, typecheck, lint, server/component tests and production build. PR #83 merged at `643a7d83c60bada14d3903cfd672580a2ecc2718`.

### Exact later production-enablement prerequisites: user/operator only

1. Ship code with both flags OFF for current-schema compatibility. Separately authorize a migration window, recovery point and the correct production direct/non-pooled owner connection and current application runtime role. Never infer/reuse staging credentials. Check the existing production ledger/schema and reviewed file checksums. Do not replay migrations 0001–0006 or the frozen historical operator package.
2. The user reports 0007 absent. Confirm that before applying it. In an explicit transaction with `search_path=public,pg_catalog`, `lock_timeout='5s'`, bounded statement timeout and `SELECT pg_advisory_xact_lock(hashtextextended('physcratic:authoring:migrations:v1',0));`, execute the complete reviewed **0007 up file once if absent**, then **0008 up file once**. If 0007 is already installed, verify its ledger/checksum and grants and skip its SQL. If either migration is already present with drift, stop and reconcile rather than masking it with IF NOT EXISTS. Record each migration ID, reviewed checksum/source commit, actor/time and verified result in the existing `public.physcratic_production_migrations` ledger before committing. Roll back on failed checks.
3. Grant the confirmed existing runtime role the following privileges. Replace `CONFIRMED_RUNTIME_ROLE` with that reviewed role; do not create a role or grant PUBLIC access. Existing schema USAGE remains required:

   ```sql
   GRANT SELECT, INSERT, UPDATE ON public.community_profile,
     public.community_profile_write_limit TO "CONFIRMED_RUNTIME_ROLE";
   GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_profile_media
     TO "CONFIRMED_RUNTIME_ROLE";
   GRANT SELECT, INSERT, UPDATE ON public.community_profile_media_limit
     TO "CONFIRMED_RUNTIME_ROLE";
   ```

   Do not grant profile DELETE, schema CREATE or table ownership. No trigger-function EXECUTE grant is needed, as tested under a restricted role. Before/after commit verify new constraints/indexes/triggers, correct parents, no existing-user backfill, private defaults and runtime grants. Preserve existing profile/auth/authoring/attempt data.
4. **Profiles only:** after 0007/grants are verified, the user may enable `COMMUNITY_PROFILES_ENABLED=true` while leaving `COMMUNITY_PROFILE_MEDIA_ENABLED` OFF. Settings, optional setup and public text profiles work without 0008/media queries.
5. **Images:** only after 0008/grants, configure `COMMUNITY_PROFILE_BLOB_STORE_ID` to the intended already-existing private store and verify the intended project's per-request OIDC private put/get/delete access. Then the user may enable `COMMUNITY_PROFILE_MEDIA_ENABLED=true`. No permanent public URLs or legacy/public-store fallback is permitted. No storage provisioning or Vercel configuration is authorized to Codex here.
6. Only the user, through the GitHub account linked to the paid Vercel seat, triggers deployment using their normal meaningful README commit after the feature merge. The user verifies Production READY and a deployed SHA containing this feature merge, then smoke-tests `/settings`, explicit private creation, editing/reload, public lookup, image changes and guest revocation on opt-out/removal, plus existing sign-in/CAPTCHA/Terms/submission flows. Codex did not deploy, initiate Vercel builds/redeploys, change flags/settings or make a README-trigger commit; merge is not deployment evidence.
7. To roll back exposure, have the user disable the media flag (profiles can remain enabled on 0007), or disable profiles to gate both features, and redeploy. Preserve DB/storage data. Never run down on a populated production registry; 0008 down deliberately refuses it, and 0007 down refuses populated profiles. Local/CI up/down/up does not authorize production SQL.

### Outstanding and next phase

- No implementation blockers. PR #83 merged after local combined verification and successful GitHub CI #147. Database installation/grants, private-store binding/authorization, feature enablement, Vercel deployment and production smoke remain **PENDING USER ACTION**.
- Onboarding dismissal is per account **on this device**, not cross-device server state. Orphan cleanup is activity/owner-driven and bounded; there is no new scheduled job. Image crops are centred, without a crop-editor UI.
- No achievements, medal claims/staff markers, followers, leaderboards or comments implemented. Next: **Batch 2A** in a fresh session on latest main. Migration 0008 is now reserved for profile media; check free IDs before any later migration. Stop here before Batch 2A.
