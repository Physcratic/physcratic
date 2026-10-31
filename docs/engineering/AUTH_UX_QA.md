# PR18 local browser and email QA

Use pnpm 10 and a clean checkout of `codex/auth-ux-email-polish` without `.env` files.
The launcher intentionally discards ambient application configuration. It never uses Neon or Resend.
Only the disposable loopback database below is initialized; remove it after QA.
Browser requests to auth are mocked; external browser requests are aborted. This tests rendered UX,
not deployed auth integration, Google scores, email delivery or live token redemption.

## Reproduce

Install QA-only tools outside the repository (no manifest/lockfile change):

```sh
npm install --prefix /tmp/terms-browser --no-audit --no-fund playwright@1.64.1 @axe-core/playwright@4.14.0 @fontsource-variable/inter@5.3.0
# Use local Docker explicitly; do not use a remote Docker context.
env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH \
  docker --host=unix:///var/run/docker.sock run --rm -d --name pr18-browser-pg \
  -e POSTGRES_PASSWORD=disposable-qa -e POSTGRES_DB=physcratic_test -p 127.0.0.1:55418:5432 postgres:16
# Wait for pg_isready in that container, then start the supported Next development server:
node tests/auth-ux-local.mjs /tmp/terms-browser dev
```

The launcher uses the installed Better Auth migration generator only against that disposable fixture.
Its local key strings are deliberately fake. No signup or email POST reaches the real server in this test.
Next's existing `NEXT_FONT_GOOGLE_MOCKED_RESPONSES` test hook loads an npm-distributed Inter WOFF2;
production font code stays untouched. This fixture can differ from Google's current font binary.

In another terminal, with system Chromium installed:

```sh
PLAYWRIGHT_MODULE=/tmp/terms-browser/node_modules/playwright/index.mjs \
AXE_MODULE=/tmp/terms-browser/node_modules/@axe-core/playwright/dist/index.mjs \
node tests/auth-ux.browser.mjs
```

Optional test-only selectors: `CHROMIUM_PATH`, `QA_ARTIFACTS`, `AUTH_QA_ORIGIN` (loopback only).
Default artifacts: `/tmp/pr18-phase2/artifacts`; screenshots, axe findings/incomplete checks, matrix,
and actual mock-generated email HTML/text. The HTML contains only synthetic URLs and recipient data.
All five requested viewports run in light/dark mode. This is viewport emulation, not physical-device QA.
Email previews cover 320/375/600px, light/dark preference and blocked images. The preview replaces CID
with the actual attachment bytes; it does not establish email-client CID support or forced dark mode.

Stop Next before builds so `.next` is not written by two processes:

```sh
node tests/auth-ux-local.mjs /tmp/terms-browser build-network # ordinary pnpm build, real Google fetch
node tests/auth-ux-local.mjs /tmp/terms-browser build         # pnpm build with local Inter fixture
```

A fixture build is separate evidence, not proof that the network-dependent build passed.
After stopping the local server:

```sh
env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH \
  docker --host=unix:///var/run/docker.sock stop pr18-browser-pg
```

## Manual checks still required (no mail sent in Phase 2)

1. Once separately authorized, use approved test mailboxes with Gmail web/mobile, Outlook desktop/web,
   and Apple Mail iOS/macOS. Keep the preview recipient allow-list in force; do not alter sender settings.
2. Send the current template through the normal verification path. Confirm a single sharp 72px body
   logo, no unwanted attachment presentation, readable CTA/copy and full fallback URL at narrow widths.
3. Test images allowed/blocked and each client's light/dark mode. Check logo contrast, alt text,
   table sizing, wrapping and CTA background; browser color-scheme emulation cannot prove these.
4. Confirm CTA and copied fallback reach the same intended origin; verify a fresh link, an invalid link
   and a link after one hour. Confirm verification still requires explicit sign-in. Keep tokens out of reports.
5. Inspect the received MIME for HTML + plain text and inline `Content-ID: <physcratic-logo>`.
   The body logo is not an inbox avatar; DNS/BIMI/provider configuration is outside this phase.
6. Check Safari/Firefox, physical iOS/Android keyboard/viewport behavior, browser zoom and VoiceOver/NVDA
   announcements of headings, errors and busy states. Axe and Chromium keyboard tests are partial evidence.

See WORK_STATUS.md for exact results and remaining staging blockers. No production readiness claim.
