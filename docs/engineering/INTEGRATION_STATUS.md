# Phase 3A / Batch 1 — auth + authoring integration

2026-10-31 (Asia/Makassar). Working branch: codex/integrate-auth-authoring-v1.
Fetched main058fa3cf125920296227d0c8473cf70abe6ff593 and reviewed auth source
3a34ccbff56d1d10b3a4c761aea98a1ecf30aa1c exactly match supplied refs.
Read Batch 0, auth recovery/map, authoring map/status, root status and both migration guides first.
Phase 6A and v0 PR2 were fetched as references only; no changes imported from them.

## Integration and semantic resolutions
- Fresh branch from main; no merge/cherry-pick of historical auth branches or reverted merges.
- Restored reviewed CAPTCHA/client tokens, Terms dialog/shared renderer, DB-backed limiter,
  branded verification email/CID/base64/safe URL and Preview recipient allow-list unchanged from auth source.
- PR20 state UX preserved: verified login/dashboard redirect; only authenticated credential check
  EMAIL_NOT_VERIFIED triggers account-specific prompt; signup/duplicate/recovery stay generic.
- Auth runtime assets copied byte-for-byte from reviewed source, not independently reimplemented.
- Shared Drizzle schema: retain every main declaration; append only bigint import and rateLimit table.
  No user/account/session/verification/Terms column, ID, hash or identity migration/backfill.
- Preserve authored APIs/sidebar/editor, immutable revisions, private keys/media, grading and SQL triggers.
  Existing submissionUser -> auth.api.getSession bridge and verified author requirement unchanged.
- Retain main's server-only direct dependency and --conditions=react-server test script.
  Add only reviewed ESLint tools/config and auth PG test script. pnpm10 lock regeneration preserves
  every existing runtime specifier/resolved version; added package records are ESLint dependencies.
- Migration guide reconciles both families and warns against schema push, blind reapplication or down
  migrations deleting history. Authoring0001/0002/0003 SQL byte-unchanged; auth limiter SQL reviewed source.
- Active Terms text/version unchanged. Separate legal draft is documentation only, not published.
- No usernames, account lifecycle UI, social login, identity schema, Phase6A or PR2 implementation.

## Isolated verification / exact commands
Tools: Node24.19.0, pnpm10.20.0; external Playwright/axe in /tmp/terms-browser.
- Targeted real-PG auth/cross-feature/limiter:
  `bash scripts/test-problem-authoring.sh env NODE_ENV=production bash -c 'AUTH_TEST_DATABASE_URL="$AUTHORING_TEST_DATABASE_URL" node_modules/.bin/tsx --conditions=react-server --test lib/auth-authoring-integration.pg.test.ts lib/auth-rate-limit.pg.test.ts lib/verification-state.pg.test.ts'`
  PASS:3/3. Local PostgreSQL17; random isolated schemas; mocked Google/email, no real email/provider.
- Cross-feature test installs full Better Auth schema + all authored SQL, uses real signed cookie/session
  to authorize owner create/publish; anonymous401, revoked verification403, other verified owner404.
  Public output excludes keys; full owner row/password hash/Terms audit remain unchanged.
  Generated auth schema is fixture setup; separate limiter test applies exact reviewed SQL and proves
  concurrent atomicity/reset/saturation/IP handling/outage behavior across independent auth instances.
- Full regression with all PG suites enabled:
  `bash scripts/test-problem-authoring.sh env NODE_ENV=production bash -c 'AUTH_TEST_DATABASE_URL="$AUTHORING_TEST_DATABASE_URL" /home/agent/.npm/_npx/fed63785a0df9524/node_modules/.bin/pnpm test'`
  186 tests:185 PASS,1 inherited FAIL,0 skipped. Failure: corpus-translation.test.ts:66 comma/semicolon
  editorial-preservation mismatch already present on main. No corpus modification or new regression.
- `pnpm exec tsc --noEmit`: PASS. `pnpm lint`: PASS,0 errors; existing no-img-element warnings in
  authoring/media-controls.tsx:175 and physics/imported-source-content.tsx:46.
- `AUTHORING_BROWSER_TOOLS=/tmp/terms-browser bash scripts/test-problem-authoring.sh node_modules/.bin/tsx tests/problem-authoring.browser.mjs`:
  PASS: real editor/API/disposable PG, autosave/recovery/conflict/publication/privacy/media/mobile/axe.
- Auth browser: `PLAYWRIGHT_MODULE=/tmp/terms-browser/node_modules/playwright/index.mjs AXE_MODULE=/tmp/terms-browser/node_modules/@axe-core/playwright/dist/index.mjs QA_ARTIFACTS=/tmp/integration/browser-artifacts node tests/auth-ux.browser.mjs`: PASS, all 10 viewport/theme combinations plus 12 mocked email previews.
- `PLAYWRIGHT_MODULE=/tmp/terms-browser/node_modules/playwright/index.mjs node tests/verification-login.browser.mjs`: PASS, generic recovery and verified dashboard navigation.
- `PATH=<pnpm10-bin>:$PATH node tests/auth-ux-local.mjs /tmp/terms-browser build-network` (executes `pnpm build`): PASS, completed production build including authoring routes.
  Build reuses prior local Inter fixture cache; fresh Google Fonts download remains unverified.
  Production font configuration is untouched. TypeScript checked again sequentially after build.
- `git diff --check`: PASS. Logs: /tmp/integration (session-local).

## Independent review
Separate read-only reviewer checked restored runtime provenance, schema/SQL, dependency versions,
server-only boundary, auth session bridge and cross-feature tests. No confirmed runtime/security defect.
Fixed its documentation finding: migration guide now distinguishes original auth-staging scopes from
new integration Preview configuration rather than instructing deployment of the old branch.

## Preview side effects / publication gate
README documents automatic main deployment. No tracked Vercel/CI configuration establishes Preview
branch exclusions. Handoff says Preview database/mail overrides were scoped to codex/auth-hardening;
that does NOT prove isolation for this new branch. No environment values/secrets were inspected.
Read-only deployment check failed exactly:
`Get "https://api.github.com/repos/Physcratic/physcratic/deployments?per_page=3": Forbidden`.
No Vercel connector available. Founder confirms integration-branch Preview configuration is UNKNOWN. Explicit instruction: commit locally only; no push or PR until verified.
Until automatic Preview is confirmed disabled OR isolated/safely configured, do not push a branch that
could trigger execution against unverified infrastructure. No deliberate deploy or live migration authorized.
Unknown/missing Preview email allow-list fails closed for delivery; that alone does not prove DB isolation.

## Remaining blockers and next batches
- Operator must verify the exact Vercel project/repository Git integration, automatic Preview branch rules,
  ignored-build behavior and deployment protection for codex/integrate-auth-authoring-v1.
- Operator must confirm effective branch-specific versus generic Preview scopes: DATABASE_URL points
  to an isolated disposable/staging DB (not production), BETTER_AUTH_URL/auth origins point to the
  intended Preview host, CAPTCHA keys/allowed hosts match, and the exact test-email allow-list is set.
  Confirm safe Resend sender/key scope without exposing secret values. Do not infer scopes from auth staging.
- Operator must attest the destination DB identity/isolation and migration ledger/schema (auth rateLimit
  plus authored0001/0002/0003) before any Preview runtime or smoke test. Do not blindly reapply migrations.
- If Preview is disabled, operator must confirm no push/PR-triggered deployment will execute. If enabled,
  isolation/protection and all effective scopes above must be verified first. No Vercel settings changed here.
- Only after those checks satisfy the founder’s publication gate: push and create a draft PR targeting main.
  No push or PR is attempted in this batch under the founder’s explicit local-only instruction.
- Authorized isolated staging validation of this exact integration commit remains required; no production claim.
- Existing auth release gates still apply: deployed schema parity/limiter table, origin/proxy/IP handling,
  counter retention, CAPTCHA provider behavior and real email-client rendering are not established locally.
- Phase6A: separately review the unmerged branch against this integrated base; preserve immutable revision
  selection/private grading, verified session, origin/body/deadline/shared-limit/idempotency controls.
  No student grading/reveal API or assisted-state policy is added here.
- Batch2/3 product hardening: password-reset callback is absent in existing auth config; document/design
  recovery before adding lifecycle UI. No delivery incident, username or social-login need is inferred.
- Main/authoring branches untouched; no merge, deployment, real email, live DB/migration or infrastructure change.
