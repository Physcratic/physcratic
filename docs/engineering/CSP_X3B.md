# X3B: CSP diagnostics and local enforcement

2026-11-03. Base `c7bb242c246bb4a43c01fe38058099d82f8f3d9b`, including Batch 2B1. Production reference `31b9c1021ed6b956d4a590d9a8af8722aa801ed6`.

**Production remains NO-GO for enforcement. No enforcement before 9 November 2026, and the date is not automatic approval.** Only tests, diagnostics, CI and documentation change. Application code, deployed policy/collector, Zod configuration, private-media headers and community gates remain unchanged. The nonce prototype is uncommitted in a separate experimental worktree and excluded from this PR.

## Eval attribution

The eight historical reports discarded source locations and stacks. **Their individual causes cannot be reconstructed conclusively.** Zod is a demonstrated explanation, not proof of attribution for all eight.

Current Chromium reproduction identifies two locations in `/_next/static/chunks/9685-aa89586cd184f00e.js`:

| Location | Source match | Report-only | Enforcing |
| --- | --- | --- | --- |
| 1:2603 | Zod `allowsEval`, caught `Function("")` probe | Reports; returns true | Reports; catches rejection and returns false |
| 1:31529 | Zod schema generator: `Function`, `this.closed`, `this.content` | Reports while compiling schemas | Skipped after failed probe |

The harness matches the reported call site, not merely Zod's presence in a chunk. Other eval locations fail as **unexplained violations**. Enforcing browser workflows succeed through the caught fallback. Additionally, 43 authoring/editor/student/submission-security tests pass with V8 string code generation disabled.

`z.config({ jitless: true })` avoids the probe and JIT reports in the controlled browser fixture. Default, jitless and eval-denied processes all pass valid/deep-equality and three invalid-input checks. No runtime configuration change is proposed.

Fresh Node 22.23.4 processes; fixed nested problem-shaped schema; one warm-up and seven timed rounds of 100,000 parses:

| Variant | Median ms / 100k | Range ms | Median µs / parse |
| --- | ---: | ---: | ---: |
| Default JIT | 114.64 | 95.74–131.40 | 1.15 |
| Jitless | 283.53 | 215.97–606.99 | 2.84 |
| Eval denied, caught fallback | 227.32 | 178.78–389.55 | 2.27 |

JIT is faster when permitted. Jitless and eval-denied ranges overlap; this synthetic shared-host benchmark does not establish a meaningful UI latency difference between them. It does not justify `unsafe-eval`.

## Browser and authenticated results

Local Next 15.5.28 production build, React 19.3.1, pnpm 10.34.9, Playwright 1.64.1, Chromium 154.0.8037.57. Fresh contexts/loopback servers compare report-only against an **actually enforcing response header on HTML and workers**, using the unchanged production allowlist.

**18 Chromium scenarios pass: nine workflows in each mode. No final local application failure or unexplained violation.**

| Workflow | Result / classification |
| --- | --- |
| SSR, hydration, overview → Problems → filtered Arena reader, KaTeX | Functional success; enforcing mode also catches the attributed Zod probe |
| Deferred MathJS | Two deferred chunks load; `g*sin(pi/6)=4.905`, `2^(½)`, domain rejection and `2+2` pass |
| Original IPhO PDF | Real production reader/worker renders first page in both modes |
| Synthetic JPEG2000 PDF | Real PDF.js and production worker render expected RGBA `[20,150,80,255]`. Report-only uses OpenJPEG WASM; enforcing mode rejects compilation and renders through `openjpeg_nowasm_fallback.js` |
| Zod default / jitless controls | Expected probe blocking with successful fallback; jitless avoids eval reports |
| CAPTCHA | Real client loader succeeds with intercepted synthetic script/frame/connection responses. Live scoring/challenge/verification remains untested |
| Analytics | Real app loader executes a synthetic same-origin script and sends a local event. Actual Vercel script/ingestion is unavailable in `next start` |
| Worker WASM control | Compiles in report-only; rejected with successful controlled fallback under enforcement |
| Negative policy and reporting | Disallowed script executes only in report-only. Enforcement blocks it. Real browser HTTP reports reach the real local collector, separately from DOM events. Restrictive attachment headers remain intact |

The codec fixture supplies local codec assets and `wasmUrl`; the production viewer does not configure that option. This proves PDF.js fallback capability, not every shipped PDF's codec coverage or production asset availability. No WASM permission is added.

Firefox and WebKit binaries are absent locally (`firefox-1555`, `webkit-2370`): **test environment limitations**. GitHub CI installs all three engines and has exercised all 54 workflow/mode combinations. Chromium and Firefox completed all assertions on the first run. WebKit completed functional flows, but exposed an incorrect test assumption: report-only Zod eval produced no event, despite valid/invalid parsing succeeding. Its enforcement fallback and negative-script blocking/report-delivery checks succeeded.

The corrected test checks Zod's cached eval capability directly and records absent report-only eval events as an explicit **test environment / browser observability limitation**, rather than an application failure. Unexpected sites still fail. WASM fallback is verified independently through pixel output and downloaded assets, including when a worker report is absent. This blind spot is further evidence that report-only telemetry alone cannot justify enforcement. Require the corrected three-engine job to be green on the final PR head.

Both existing authenticated student/editor browser suites pass with enforcing headers, disposable PostgreSQL 18.6, injected verified identities and in-memory private storage. They cover authoring CRUD/publication, math/media, private PDF downloads, explicit solution access/revocation, answer modes, assisted submissions, recovery/history, account isolation, keyboard controls, desktop/mobile overflow and axe. These are injected sessions, not real Better Auth login.

**Remaining environment limitations:** real login/logout/cookie renewal; signup CAPTCHA scoring/challenge/server verification; verification/resend mail; private Blob transport; Vercel analytics execution/ingestion. No live credentials are bound. Stop those tests rather than using Production writes. Later setup needs isolated accounts, disposable DB, controlled mail recipients/provider sandbox and isolated storage. Community stays disabled; no migration or flag activation belongs to X3B.

An initial build exhausted generated-cache disk space; the clean rerun passed. Early harness selector, guard argument-normalisation and uniform report-only eval-event assumptions were corrected. Those are not application regressions.

## Attribution privacy and abuse resistance

The unused diagnostic proposal `safeViolation` retains only build-manifest-approved public asset paths, bounded line/column numbers and enumerated directive/disposition/blocked categories. It excludes document URLs, arbitrary hostnames, tokens, query strings, fragments, script samples, raw stacks and user identifiers. Unknown sources stay unknown. A future deployment could associate build SHA and route templates separately, never raw authenticated paths.

The live collector is unchanged: 8 KiB streamed cap, at most 20 items and bounded sanitised log fields. A 204 also covers discarded bodies. Local diagnostics cap memory at 100 records. Reports are untrusted and can be forged or dropped. There is no demonstrated global abuse budget or durable representative coverage. Production attribution/retention/rate-control changes require a separate reviewed proposal; do not log full URLs or samples to obtain attribution.

## Isolated nonce experiment

Prototype middleware generates a 192-bit per-request nonce, forwards request CSP/nonce, and attaches enforcing CSP to HTML. Root layout reads `headers()` and passes the nonce to next-themes. Script `unsafe-inline` is removed only in this worktree. Static workers retain the original report-only policy: this is an HTML architecture experiment, not a release candidate.

| Measurement | Current | Nonce prototype |
| --- | --- | --- |
| Prerender-manifest entries, including metadata | 19 | 7 |
| Learn and Terms | Static, `s-maxage=31536000` | Dynamic, private/no-store |
| Dashboard first-load JS | 476 kB | 476 kB |
| Cold compiler time, one shared-host build each | 3.2 min | 2.9 min |
| Dashboard hydration | Navigation/search pass | Navigation/search pass; fresh nonces |

15 sequential warm local requests after one excluded request, same Node/reverse proxy. Median/p95 time to response headers, milliseconds:

| Route | Current | Nonce |
| --- | ---: | ---: |
| `/learn` | 8.25 / 23.06 | 30.94 / 122.77 |
| `/terms` | 7.26 / 23.90 | 15.47 / 21.51 |
| `/dashboard` | 18.36 / 29.59 | 19.31 / 27.37 |
| `/coaching` (already dynamic) | 42.55 / 199.15 | 39.11 / 79.37 |

Timings are local/shared-host diagnostics, not build-speed or network-latency claims. Loss of 12 prerendered entries and shared caching is deterministic. **Do not adopt the blanket root-layout approach.** Investigate route-scoped layouts/theme bootstrapping or reviewed static hashes separately. [Next 15 nonce guidance](https://nextjs.org/docs/15/app/guides/content-security-policy) requires dynamic rendering; SRI support is experimental. Current CAPTCHA allowances match [Google's guidance](https://developers.google.com/recaptcha/docs/faq).

## Reproduction and checks

Use a clean worktree without `.env*` or `.vercel`. The harness starts its own loopback-only server, strips service credentials, blocks server egress, intercepts synthetic providers before network contact and blocks browser external requests. It needs no migrations or live secrets. External tools are not application dependencies.

```sh
pnpm install --frozen-lockfile
npm install --prefix /tmp/csp-tools --no-audit --no-fund playwright@1.64.1 @axe-core/playwright@4.14.0
/tmp/csp-tools/node_modules/.bin/playwright install --with-deps chromium firefox webkit
node --import tsx scripts/csp/local.mjs --build
AUTHORING_BROWSER_TOOLS=/tmp/csp-tools node --import tsx scripts/csp/browser.mjs
node scripts/csp/zod-benchmark.mjs
```

`CHROMIUM_PATH=/usr/bin/chromium` selects system Chromium. `CSP_REQUIRE_ALL=1` rejects missing engines in CI. Ignored evidence goes to `build/csp/`. Repeat the disposable fixture command below with `tests/problem-authoring.browser.mjs` too:

```sh
AUTHORING_BROWSER_TOOLS=/tmp/csp-tools CHROMIUM_PATH=/usr/bin/chromium \
  bash scripts/test-problem-authoring.sh node \
  --require ./scripts/csp/network-guard.cjs \
  --require ./tests/server-only-register.cjs --import tsx \
  --import ./scripts/csp/fixture-policy.mjs tests/authored-student.browser.mjs
```

Local checks pass: offline safety guards; Next typegen and `tsc --noEmit`; zero-warning ESLint; server suite (588 tests: 573 pass, 14 skipped, one existing todo); component suite (33 pass); disposable DB suite (121 pass); release-package/transport/operator guards; production builds; 18 production-build browser scenarios; both authenticated fixture suites. A focused no-eval schema run adds 43 passing tests. Standard GitHub CI and the three-engine job must both pass on the final PR head.

## X3C / eventual enforcement gates

**X3C diagnostics/prototype GO:** this test-only PR is reviewed, reconciled with current main and green in standard CI plus all three browser engines; functional assertions pass, every observed exception is classified, and privacy/egress guards pass. X3C may then develop separately reviewed attribution and a scoped candidate while Production stays report-only. Missing real-provider credentials block those particular tests, not unrelated isolated diagnostic work. Replace missing historical evidence with reproducible current-flow coverage; do not assert all eight reports were Zod.

Production remains NO-GO until all gates hold:

1. On/after 9 November 2026; immutable reviewed candidate; green standard CI and all three browser engines.
2. Required public and isolated authenticated/provider flows succeed. No confirmed functional breakage or unexplained first-party violation. Expected blocks have independently verified successful fallbacks.
3. Report transport, privacy, retained representative coverage and abuse handling verified. Zero reports alone is insufficient.
4. Nonce/hash strategy and residual inline permissions explicitly reviewed. Public rendering/cache changes and measured performance effects accepted; no hidden blanket dynamic conversion.
5. Final headers preserve private-media CSP/attachment/privacy controls. Community gates, database settings, migrations and grading remain untouched.
6. Compatible preceding report-only deployment ready for rollback. After release verify exact SHA, headers, auth/read access, provider loading, calculator chunks and reporting. Roll back on functional regression or unexplained first-party blocking without weakening the allowlist.
