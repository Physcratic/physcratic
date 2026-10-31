# Authentication recovery plan — no recovery executed

2026-10-31 (Asia/Makassar). Snapshot: origin/main `0845052`, preserved origin/codex/auth-hardening
`052fe922ea1ced798fd5b265863f4ae055209700`. This readiness branch was created from that preserved head.
Only history/file comparisons were performed. No merge, cherry-pick, revert reversal, production-release PR,
branch rewrite, deployment or migration is authorized by this plan.

## Verified Git topology

| Event | Git evidence and current consequence |
| --- | --- |
| Original CAPTCHA #3 | Merge `ea2b65c`, parents `365eb62` + `99b5185`; #3 entered main. |
| Original Terms #5 | Merge `ca31b9d`, parents `99b5185` + `2f7870b`; this merge is NOT an ancestor of current main. |
| Original hardening #7 | Merge `ae74399`, parents `2f7870b` + `052fe92`; this merge is NOT an ancestor of current main. |
| Hardening revert #8 | `e5616ed`, merged as `f75fdb3`; current remote `codex/terms-review` points to `f75fdb3`. Do not use it as intact combined auth source. |
| Terms revert #10 | `fceefd1`, merged as `f23b34c`; current remote `codex/signup-captcha` points to `f23b34c`. Do not use it as intact combined auth source. |
| CAPTCHA revert #11 | `9e005c3`, merged into main as `969e83a`; this is an ancestor of current main. |
| Problem authoring | Original phase1 `365eb62`, revert `b106eab`/#9, restored by `e4fbc88`/#12; phase2 `6837ae3`/#13 and phase3 `0845052`/#14 are on main. |

The supplied account of accidental merges/reverts is broadly reflected in the refs, but the stacked target
branches matter: #5/#7 merge commits and their #10/#8 revert merges are not in current main's ancestry.
Do not infer that current main once had every combined feature. GitHub API PR metadata was not independently
queried here; PR associations above are verified from commit subjects/parents and remote ref pointers.
`git merge-base origin/main origin/codex/auth-hardening` is `99b5185`: merely merging the preserved branch
would not necessarily restore reverted Phase1 changes already present in main's ancestry. Do not remerge it.

## Current content differences

Current main retains the pre-existing unchecked Terms checkbox, inline server Terms validation, Terms audit
fields, email verification configuration and original `/terms` page. It does not have the combined CAPTCHA,
Terms-dialog and shared limiter implementation. Missing runtime/test assets versus the preserved source:

- `components/terms-consent.tsx`, `components/terms-content.tsx`.
- `lib/signup-captcha.ts`, `lib/signup-captcha-action.ts`, `lib/signup-captcha-client.ts`,
  `lib/signup-policy.ts`, `lib/signup-captcha.test.ts`, `lib/signup-captcha-client.test.ts`.
- `lib/auth-rate-limit.pg.test.ts`, `migrations/20261031_auth_rate_limit.sql`,
  `tests/terms-consent.browser.mjs`, `eslint.config.mjs`.
- Auth engineering handoff and document-only proposed Terms review assets are also absent on main.

Existing files needing deliberate reconciliation: `lib/auth.ts`, `components/auth-form.tsx`,
`app/terms/page.tsx`, `lib/db/schema.ts`, `migrations/README.md`, `package.json`, `pnpm-lock.yaml`.
The auth branch has not inherited authoring phase1/2/3. A whole-tree copy or checkout of that branch over main
would remove the problem studio, authored-problem routes/services/tests, authoring SQL and documentation,
and the Problem studio sidebar link. Those are unrelated working features and must be preserved.

Confirmed conflict hotspots:
- `lib/db/schema.ts`: main has authored problem/draft/revision/private-part/write-limit tables and invariants;
  preserved auth source has the `rateLimit` declaration instead. Add only the limiter import/declaration;
  never replace the current file or remove authored schema, deferred/sealing SQL invariants or relations.
- `migrations/README.md`: main documents authoring migrations0001/0002 and transaction/sealing contracts;
  auth source documents auth limiter. Combine relevant sections or link separate guides; preserve both.
- Main's sidebar and authoring WORK_STATUS/maps must remain. Package/lock updates must retain all current
  application dependencies/scripts and add only reviewed auth/testing requirements, without a broad upgrade.
- Future main or problem-authoring branch changes can add overlaps: recheck exact refs/diffs immediately
  before integration. Remote authoring phases0/1/2/3, restore-phase1 and problemsetting-work were inspected
  as references only; no branch was modified. Current problemsetting-work points to `27cb7cb` in this snapshot.

## Recommended future integration (requires separate human approval)

Use a dedicated fresh integration branch from then-current main, not a remerge/revert-of-revert and not a
production-release PR from this staging-only branch. Build a new, explicit auth-only patch using intact
combined commit `052fe92` plus reviewed readiness changes from this branch. Review file-by-file against
current main; recreate only intended auth additions and reconcile shared files above. Do not copy the old
whole-tree state. Blind cherry-picking stacked merges is inappropriate: their parents/targets and revert
history differ, and schema/docs have diverged. Original non-merge auth commits can be patch references,
not an unattended cherry-pick recipe. No integration or reverse-revert command was run in this task.

Required acceptance before any production-release PR:
1. Prove diff contains no deletion/rollback of authoring code, migrations, sidebar routes or private-key rules.
2. Preserve current main authored schema and execute authoring contract/API/browser tests as well as auth
   unit/browser/real PostgreSQL limiter tests, full suite, TypeScript, lint and build on the new integrated tree.
3. Preserve accepted Terms records/version; keep proposed legal text document-only and human publication gate.
4. Confirm the integration includes current staging recipient safeguards/preflight without weakening production
   email verification. Validate the exact integrated commit on authorized isolated staging before release review.
5. Resolve Vercel commit-author team authorization through an authorized team member. Never spoof author
   identity or use CLI deployment to bypass that restriction. No deployment is authorized by this plan.

## Migration-before-code order and rollback

Owner reports Neon physcratic-staging already has baseline application tables and auth rateLimit migration.
Treat this as supplied context until the authorized read-only preflight verifies endpoint/database/role/schema;
**do not reapply staging migrations**. Table existence alone does not establish Neon branch isolation.

Before any later production rollout, obtain explicit approval, inspect production migration ledger/DDL and
backup/restore readiness using authorized operators. Determine whether rateLimit already exists. If absent,
apply only the reviewed additive auth migration before code; if present, verify exact schema/checksum/ledger
rather than reapplying or ignoring name collisions. Retain existing authoring migrations and data. Do not run
Drizzle schema push or a guessed full baseline migration to reconcile the branches.

Coordinate main's automatic-deploy trigger: no integrated auth commit may reach the production deployment
path before schema/environment readiness. After separate release approval, deploy the exact staged commit,
monitor DB errors/connection load/429/503/mail and perform only approved controlled production smoke.
Rollback application first while retaining auth limiter and authoring tables. A memory-limiter rollback loses
cross-instance abuse protection, so registration may need restriction/monitoring until fixed. Never drop or
truncate auth counters while any live instance uses them; never roll back user consent or authored revisions.
