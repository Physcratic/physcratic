# Physcratic B1 PR 2 local review

Base: `509ba35b3db2624ce214d0ece1e918d0f36113dd`
Candidate: `b1ed89b2ed070b5e8ef08e49b25329c95709a13c`
Branch: `codex/b1-public-profile-policy`

## Review order

Use `git diff 509ba35b3db2624ce214d0ece1e918d0f36113dd b1ed89b2ed070b5e8ef08e49b25329c95709a13c` in the local worktree. Start with `lib/community/profile-publication.ts` and its callers. Check the owner mutations and database guard together, then compare the signup and Settings disclosure with the Privacy Notice. Finally review the disposable fixtures and the corrected release gate.

## Commands and results

Commands ran from the isolated worktree with Node 22.23.1. The database URL below used a disposable local PostgreSQL 18.7 instance and synthetic credentials. Browser tooling was already installed.

```bash
export PATH=/workspace/work/p1-tools/node_modules/node/bin:$PATH
export AUTHORING_TEST_DATABASE_URL=postgresql://postgres:local-test-only@127.0.0.1:32785/physcratic_authoring_test
export AUTHORING_BROWSER_TOOLS=/workspace/work/physcratic-212-browser CHROMIUM_PATH=/usr/bin/chromium
node --conditions=react-server --import tsx --test lib/{community-profile,profile-signup.pg,community-achievements,community-medal-showcase,community-comments,community-moderation,community-profile-media,authored-attribution,unified-arena,auth-account.pg}.test.ts
node --conditions=react-server --import tsx --test lib/profile-signup.pg.test.ts
DATABASE_URL="$AUTHORING_TEST_DATABASE_URL" node --require ./tests/server-only-register.cjs --import tsx --test scripts/activation/runtime.pg.test.ts scripts/runtime-role/runtime.pg.test.ts
```

The focused PostgreSQL suite passed 89 tests. The final signup-only run passed 12 tests, including re-verification after permanent deactivation. The existing activation and restricted-role suites passed 12 tests.

```bash
node --require ./tests/server-only-register.cjs --import tsx tests/community-profile.browser.mjs
COMMUNITY_PROFILE_ACCOUNT_GUARD_ONLY=1 node --require ./tests/server-only-register.cjs --import tsx tests/community-profile.browser.mjs
node --require ./tests/server-only-register.cjs --import tsx tests/authored-metadata.browser.mjs
node --require ./tests/server-only-register.cjs --import tsx tests/unified-arena.browser.mjs
node --require ./tests/server-only-register.cjs --import tsx tests/community-achievements.browser.mjs
node --require ./tests/server-only-register.cjs --import tsx tests/community-verification.browser.mjs
```

All six browser runs passed. The main profile run covered signup, error recovery and Settings at 375px and 1440px, keyboard, light and dark themes, axe, and media deactivation. The signup browser transport was synthetic. Actual Better Auth signup and email verification ran separately against disposable PostgreSQL. The additional runs covered stale account rejection (21 assertions), reader metadata (28 checks), the unified collection (2 views), achievements (21 assertions) and verification (23 assertions).

```bash
node_modules/.bin/tsx --test tests/{auth-form,account-pages}.test.ts
node --require ./tests/server-only-register.cjs --import tsx --test lib/{signup-captcha,signup-captcha-client,copy-rules}.test.ts
node_modules/.bin/next typegen && node_modules/.bin/tsc --noEmit
node_modules/.bin/eslint . --max-warnings=0
NEXT_TELEMETRY_DISABLED=1 BETTER_AUTH_SECRET=ci-build-only-physcratic-synthetic-secret-0000000000000000 BETTER_AUTH_URL=http://localhost:3000 COMMUNITY_PROFILES_ENABLED=false node_modules/.bin/next build
python3 -B scripts/phase-c-offline/run.py safety
sha256sum -c --quiet scripts/activation/PACKAGE_SHA256SUMS
sha256sum -c --quiet scripts/runtime-role/PACKAGE_SHA256SUMS
git diff --check
```

The component suite passed 8 tests and the CAPTCHA and copy suite passed 32. Type generation, TypeScript, zero-warning lint, the profiles-OFF build, offline guards and both manifests passed. The production-mode build ran without a database binding and logged Better Auth schema-validation messages during page generation. It exited 0 and generated all 197 static pages. The old-schema OFF path was separately exercised with a restricted login.

## Release boundary

Existing profiles with only legacy visibility stay private. Unverified registrations reserve their chosen username indefinitely pending the accepted product decision. New public reads consult the current database state after deactivation. Copies already delivered can persist. The local candidate requires independent review and exact-head GitHub CI before a release decision. Production migration 0022 installation and profile activation each require separate approval.
