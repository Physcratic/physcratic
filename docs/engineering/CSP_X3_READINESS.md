# X3 CSP readiness

12 November 2026. Audited main `facb396`. **NO-GO for enforcement.** The production header stays `Content-Security-Policy-Report-Only`. This change touches tests, the harness and this document only. It changes no application code, policy, header or setting, and no provider, database or deployment was touched. It rebuilds what was still valid from the closed PRs #121 (readiness checklist) and #122 (route inventory, document checks and their tests), updated for the routes and screens added since 4 November.

## What the policy is today

`lib/security/csp.ts`, sent by `next.config.ts` as report-only on every route. `script-src` and `style-src` both keep `'unsafe-inline'`. Production has no `'unsafe-eval'`. Allowed origins are self, and Google reCAPTCHA for scripts, frames and connections. Reports go to `/api/csp-report`. Enforcing this policy as written is not the goal, because `script-src 'unsafe-inline'` lets any injected inline script run. The goal is nonces or hashes with no `'unsafe-inline'` for scripts.

## What the harness checks now

`scripts/csp/*` and `tests/csp-*.test.ts`, run by `.github/workflows/csp-harness.yml` on every pull request that touches `app/`, `components/`, `lib/`, `public/`, config, dependencies, `tests/` or `scripts/csp/`. The job installs Chromium, Firefox and WebKit and fails if any of them is missing (`CSP_REQUIRE_ALL=1`).

- **Route inventory (fail closed).** Every page, route handler and error boundary in `app/` is compared with the production build. An HTML route with no nonce or hash strategy, a handler that was not reviewed, a stale hash, an unknown error boundary or a route that is in the source but not the build fails the run. HTML is never exempt because of its path, status or `Accept` header. A 404 page passes only when its bytes match the built not-found page.
- **Build-free guard.** `tests/csp-route-inventory.test.ts` also walks `app/` in the ordinary unit tests and fails when a page or route handler is added without review, before anyone builds.
- **Document checks** (`document-checks.mjs`). Cold documents for the gap routes (`/`, `/_not-found`, an unknown path, an unknown Learn slug, `/settings`, both admin pages) in Chromium, Firefox and WebKit, in report-only and in the detached hybrid build, with strict headers, theme bootstrap, error states and a deliberate injected inline script that only the report-only build runs.
- **Browser cases** (`browser.mjs`), each in report-only and in enforcement: hydration, navigation, KaTeX and the analytics loader; the MathJS calculator; **MathLive answer field and Math Pad**; **the guided tour**; **the public problem library**; **the coaching booking link to Tally**; the PDF.js reader and its worker; the PDF.js JPEG2000 codec; Zod with and without eval; the reCAPTCHA loader with a synthetic provider; a WASM worker; a negative control that proves a blocked script is blocked and a report arrives.
- **Hybrid architecture** (`architecture.mjs`). A detached build with nonces for dynamic documents and exact hashes for the prerendered ones, compared with the report-only build for cold entry, theme, and navigation in both directions between the public Learn pages, the public library and the app, without a reload.

## Route inventory (current main)

| Group | Count | Strategy |
| --- | --- | --- |
| Dynamic HTML routes | 16 | Per-request nonce: `/`, `/dashboard`, `/dashboard/author`, `/dashboard/authored/[id]`, `/dashboard/contests/[id]`, `/dashboard/submissions`, `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/email-change`, `/settings`, `/u/[handle]`, `/coaching`, `/admin/moderation`, `/admin/verification` |
| Prerendered HTML routes | 11 | Exact hash for every served file: `/learn`, `/learn/[slug]` (6), `/terms`, `/problems`, `/problems/archive`, `/problems/topics/[slug]` (6), `/dashboard/problems/[id]` (121), `/dashboard/contests/manage`, `/coaching/consultation`, `/coaching/become-a-tutor`, `/_not-found` |
| Prerendered HTML files | 151 | All byte-verified. The largest selected static policy is 4,721 bytes |
| Route handlers | 75 | Reviewed: none may return HTML. Includes the metadata routes (`opengraph-image`, `manifest.webmanifest`, `robots.txt`, `sitemap.xml`, `llms.txt`) |
| Error boundaries | 4 | `/` error, global-error, not-found, and `/u/[handle]` not-found |
| App Router data (RSC) routes | 141 | Representations of the documents above, never a separate exemption |
| Redirects | 13 | The retired practice routes in `next.config.ts` |

Added since 4 November: seven route handlers (`/api/account-deletion`, `/api/admin/account-deletion`, `/api/authored-problems/[id]/attribution`, `/api/community/actions`, `/api/practice-checks`, `/api/practice-progress`, `/api/problem-progress`) and the 13 redirects. No page route was added. The first run on current main stopped on the seven handlers, which is the fail-closed gate working. The screens that changed behaviour without a new route are the unified solving workspace, the interactive public library, MathLive in answer fields and Studio equations, the guided tours and the coaching booking button.

## What would break under enforcement today

These come from running the harness against current main, in Chromium here and in all three engines in CI. The two experiments below were run once and not committed. Each changed one directive in `lib/security/csp.ts` and ran the enforcement cases.

1. **Enforcing today's policy as written: nothing breaks.** All 13 workflows pass in Chromium. Two operations are blocked, and both fall back. Zod's JIT uses `eval`, so every page that loads Zod (most of them) reports `script-src eval` and Zod runs without it. PDF.js compiles WASM for JPEG2000 images, which is blocked, and the JavaScript codec takes over. This makes no route safer, because `unsafe-inline` is still there.
2. **Enforcing the real goal, `script-src` without `'unsafe-inline'`: every HTML route breaks.** Production has no nonce or hash publication, so Next's inline bootstrap scripts are blocked. The server HTML renders and nothing hydrates: no library filters, no MathLive field, no tours, no Math Pad, no navigation without a reload. In the experiment all seven route cases (library, problem page, answer field, tour, calculator, PDF viewer, coaching) failed.
3. **Dropping `'unsafe-inline'` from `style-src` too: pages keep working, styling is lost in places.** Inline `style` attributes and elements are blocked on the KaTeX output, MathLive's field, the tour card and ring (they are placed with inline `top` and `left`), the PDF viewer and the coaching page. Every functional step still passed, so this is a visual risk the harness records as violations but cannot judge.
4. **Tally** needs nothing. It is an outbound link that opens in a new tab, with no script or frame. A future embed needs `frame-src https://tally.so` and a review.
5. **reCAPTCHA** passes with a synthetic provider. The real sign-up form cannot be driven in the harness because the auth database is deliberately unreachable and the page shows its error state. The loader, script, connection and frame paths are covered through the fixture. Live scoring, hostname and replay checks are not.

Firefox and WebKit results are in the pull request's CI run (artifact `local-csp-results`). Chromium here is 154 (Playwright 1.64).

## What is left before enforcement is safe

1. **Publish nonces and hashes in production.** The nonce middleware and the hash publication exist only in the detached harness. A supported atomic build-output adapter has to bind the HTML bytes, the per-route hash policy, the build ID, CDN publication and rollback. `next.config.headers` cannot read hashes from its own unfinished build. Never hash live or private response bodies, reuse a nonce, or publish a union of every route's hashes.
2. **Decide the style policy.** Either keep `style-src 'unsafe-inline'` and accept it, or move the tour, KaTeX, MathLive and PDF viewer off inline styles. This is a product decision, not a harness result.
3. **Three engines green on the exact candidate** in `csp-harness`, not only this document's run, and a green run after the adapter exists.
4. **Collector privacy.** `/api/csp-report` still logs bounded labels and raw pathnames, and a pathname can hold a handle. Add fixed route, source, build and category projections, bounded reads, global ingress control, an approved sink and retention. Zero reports is not proof of safety.
5. **Real providers in a disposable environment.** reCAPTCHA hostname, score, action and replay rejection, real auth cookies, mail delivery, the Analytics asset and ingestion, and private media with a real object. A mock is not evidence.
6. **Production observation.** Seven consecutive representative days of report-only data including one deployment and old tabs, with zero unexplained first-party violations. The owner approves the volume and coverage.
7. **A separate decision.** Security, application and operator sign-off, a rollout cohort, latency budgets (at most 1% more gzip JavaScript, warm p95 within the larger of 5 ms or 10% of baseline, cold p95 within the larger of 50 ms or 10%) and a tested report-only rollback. Only that later change switches the header to enforcing.

## Rollback for a future rollout

The operator picks a known-good immutable report-only release before the rollout. Roll back on any auth, CAPTCHA or private-media regression, missing hydration or deferred chunks, mixed build, hash or HTML, a reused or cached private nonce, unexplained first-party blocking or a breached budget. Restore the matching HTML, assets, header and build artifact together through the approved deployment workflow, invalidate the affected CDN entries, then check that every document class answers report-only, that old tabs still load deferred chunks, and that auth and private media work. Keep the restrictive attachment policy (`sandbox; default-src 'none'`) on private media throughout.

## Run it

```sh
node --require ./tests/server-only-register.cjs --import tsx --test tests/csp-*.test.ts lib/security-csp*.test.ts
node --import tsx scripts/csp/local.mjs --build
CSP_REQUIRE_ALL=1 node --import tsx scripts/csp/browser.mjs
CSP_REQUIRE_ALL=1 node --import tsx scripts/csp/architecture.mjs
```

Without `CSP_REQUIRE_ALL=1` the scripts run whichever engines are installed and say which were missing. Set `CHROMIUM_PATH` to use an installed Chromium, and `AUTHORING_BROWSER_TOOLS` to use an external Playwright. Results are written to `build/csp/` and uploaded by the workflow.
