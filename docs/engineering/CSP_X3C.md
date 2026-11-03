# X3C architecture decision and readiness

2026-11-03. Reviewed X3B PR #93 was compatible with unchanged main and both CI workflows were green. It merged as **`c63d739ac850b4cd7488a34505ec2704eb0dbce5`**, the base of this work.

**Decision:** pursue a hybrid of scoped request nonces for dynamic documents and build-bound hashes for cached public HTML. This is a locally demonstrated architecture direction, **not a Production release candidate**. Production remains report-only. No enforcement before 9 November 2026 and no automatic enforcement afterward.

Only diagnostics, tests and documentation ship. Prototype middleware is generated in a detached temporary worktree. No deployed CSP/collector, app layout, provider settings, database, migration, grant, community gate or private-media response changes are included.

## Options and security limits

| Approach | Cache / interaction effect | Decision |
| --- | --- | --- |
| Root layout reads request nonce | X3B lost 12 prerendered entries, 19 → 7, and public shared caching | Reject blanket conversion |
| Separate public/private root layouts | Can scope request APIs, but reorganises routes and may introduce full document navigation between roots | Defer; larger UX/maintenance change than necessary |
| Scoped nonce middleware plus fixed theme-bootstrap hash | Next receives nonce through request CSP; root layout does not read headers. Existing dynamic routes remain dynamic | Demonstrated for dashboard; auth/provider paths still need actual service tests |
| Hash trusted public build HTML | Preserves static rendering/cache. Hashes change with exact Flight/bootstrap bytes on every build | Demonstrated locally; requires atomic header/HTML publication |
| Hash each dynamic response | Per-response work, private-content coupling, potential blessing of injected content | Reject as a general strategy |
| Experimental Next SRI alone | Integrity attributes protect external bundles; they do not authorise inline Flight scripts | Insufficient alone |

Next 15.5.28 source confirms inline Flight emission accepts a nonce (`use-flight-response.js:85`), while SRI is applied to external scripts (`required-scripts.js:34`). The [Next 15 guide](https://nextjs.org/docs/15/app/guides/content-security-policy) documents dynamic rendering for request nonces and experimental webpack-only SRI. No Next 16 issue is used as proof of this version's behaviour.

The prototype removes script `unsafe-inline`, retains the existing origin allowlist and inline-style permission, and adds no `unsafe-eval`, WASM exception or wildcard. It intentionally does not add `strict-dynamic`: doing so would disable host-based authorisation for parser-inserted external scripts without a separately validated trust chain. Residual `'self'` permits same-origin script gadgets; hashes permit replay of the exact trusted bootstrap text. CSP is defence in depth, not a replacement for escaping, sanitisation or private-media controls.

## Concrete candidate and publication dependency

The experimental matcher covers existing dynamic dashboard/auth/profile documents and `/coaching`. It generates a fresh 192-bit nonce, forwards request CSP for Next's framework scripts, and allows the invariant next-themes bootstrap by SHA-256. Root `app/layout.tsx` stays byte-identical. No nonce is generated for cached Learn/Terms documents.

For ten selected static public documents (Learn hub and guides, Terms and coaching form pages), tooling derives executable inline hashes from **trusted completed build files**, records their HTML digest/build ID, and verifies served HTML including a synthetic query parameter. JSON-LD data and external script tags are not mistaken for executable inline bootstrap. This scanner is for validated Next-generated artifacts, not arbitrary HTML sanitisation. Any unsupported markup/build mismatch must fail closed.

Never hash arbitrary live responses, accept caller-provided hashes, reuse a fixed nonce, or cache private nonce-bearing HTML. Do not compute hashes from private SSR/user data. A header-wide union would trust more cross-page scripts and increase header size; route-specific hashes keep the authorised set smaller.

`static-header-proposal.json` is only an ignored proposal artifact, not deployed configuration. A future build adapter could merge header-only `routes` with `continue: true` into [Build Output API v3](https://vercel.com/docs/build-output-api/configuration), preserving all existing framework routes. `next.config.headers()` and bundled middleware run before completed static HTML exists, so importing a post-build hash file into that same build creates a circular pipeline. Do not silently use yesterday's hashes or rely on two unverified builds.

**Unresolved production dependency:** implement and review an atomic adapter that couples immutable HTML, headers, build ID, rollbacks and CDN invalidation. Local reverse-proxy success does not prove Vercel adapter behaviour. Verify route aliases/encoding, trailing slash redirects, not-found/error pages, all dynamic document routes, RSC/prefetch responses and old tabs across deployments. Unknown HTML routes need an explicit policy; they must not silently fall back to report-only. No adapter, routing configuration or infrastructure change is activated here.

## Measured local evidence

Node 22.23.4, pnpm 10.34.9, Next 15.5.28. Two cold builds, identical application client source, synthetic child environment and loopback guards. The detached experiment changes only middleware. Nineteen prerender-manifest entries remain in both builds. Ten static HTML artifacts verify in both variants; public `s-maxage=31536000` is retained. Maximum public policy header: **2,561 bytes**, below the experiment's 8 KiB budget (not a claimed vendor limit).

| Measurement | Report-only | Hybrid |
| --- | ---: | ---: |
| Next dashboard first-load JS | 476 kB | 479 kB |
| Learn cold JS resource count | 14 | 14 |
| Learn raw / gzip-9 bytes | 463,181 / 143,461 | 463,243 / 144,320 |
| Dashboard cold JS resource count | 24 | 24 |
| Dashboard raw / gzip-9 bytes | 1,771,410 / 494,001 | 1,771,540 / 496,113 |
| One cold compiler observation | 113 s | 144 s |

Resource sizes deduplicate actual `/_next/static/*.js`/worker URLs observed before interaction, including prefetch/shared resources, then compress corresponding build files. They are not identical to Next's manifest metric. The hybrid adds 859 gzip bytes on Learn and 2,112 on dashboard (about 0.43%); it is not a JS optimisation. Compiler observations include shared-host variation and are not a causal build-cost estimate.

Fresh local servers; one initial full response, five additional warm-ups, then 15 sequential requests. Warm times are median/p95 time to headers. CPU is Linux process user+system ticks for those 15 requests, excluding browser/proxy CPU; 10 ms resolution here.

| Route | Warm ms, current → hybrid | Server CPU ms, current → hybrid | Initial full-response ms, current → hybrid |
| --- | --- | --- | --- |
| Learn | 5.44/8.25 → 5.73/15.53 | 70 → 90 | 7.08 → 5.92 |
| Terms | 5.69/9.46 → 5.31/7.81 | 60 → 60 | 7.84 → 11.81 |
| Dashboard | 17.57/23.59 → 22.82/29.53 | 430 → 520 | 157.32 → 220.02 |

Scoped middleware has real server/cold-start cost despite retaining public caching. An earlier one-warm-up run saw a 314 ms dashboard tail and 1,630 ms CPU for 15 hybrid requests; startup/JIT/GC effects require controlled repetition. Do not claim these local samples predict Vercel latency or invocation counts. Before release, qualify cold/warm serverless behaviour and accept an explicit workload/latency budget, or investigate a different supported middleware runtime.

Local Chromium passes four architecture cases: cold hash/public and nonce/dynamic documents, SPA navigation both directions without full reload, dark-theme initialisation, search and history, and deliberately injected inline JS blocked only by the hybrid. Before the negative control, only call-site-attributed Zod eval events are permitted. Source attribution is projected to bounded IDs. Two sampled navigation sequences were 1,379/522 ms under current policy and 1,172/574 ms under hybrid; these are controller timings, not user/network performance claims. Firefox/WebKit are absent locally; the existing three-engine CI job is extended to repeat these boundary checks in all engines, after the original 54 X3B workflows.

## Privacy and abuse design

The deployed collector is unchanged. Its existing page-path log can retain an identifier embedded in an authored/profile pathname; do not merely append more fields to it. The unused `attribution` prototype replaces raw paths with fixed templates and demonstrates the proposed contract:

- Source IDs are 96-bit prefixes of public asset SHA-256, selected only from the trusted build's first-party static JS/worker registry. At most 2,048 registry entries; collision checks use full hashes. Unknown/foreign sources stay unknown. No private/server bundles are enrolled.
- Persist only server-selected known build ID, route template, source ID, directive/category/disposition enums, bounded line/column and count. Never record document/source URLs, query strings, fragments, nonce/policy text, tokens, samples, raw stacks, account IDs, handles, IPs or user-agent fingerprints. Report body build IDs are not trusted.
- Keep the existing 8 KiB body and 20-report request bounds. Prototype aggregation caps 1,000 events and 256 keys per five-minute window, expires on read/write and records overflow counts. It is per instance, **not a global rate-limit guarantee**.
- Proposed deployment-wide ingress budget: 2,000 requests per five minutes, burst 100, shared across builds; validate against representative traffic before approval. Proposed durable sink: hourly roll-up of at most 64 keys plus overflow counters, seven-day expiry. Retain only four known public build registries/policies for at most 14 days to classify late old-tab reports; unknown versions stay unknown. No exporter/sink or platform rule ships.
- Reports are forgeable and can be lost, throttled or deduplicated. An attacker can exhaust a shared telemetry budget; reports alone cannot establish safety. Audit platform/request logging and referrer handling separately so the application projection is not undermined by infrastructure logs. Live retention/abuse controls require separate review; zero reports is never a GO criterion.

Unit tests exercise private query/path/sample exclusion, foreign sources, fixed cardinality, saturation/expiry, exact hashes and provider fail-closed behaviour. The live collector receives no additional data.

## Provider readiness and gates

Real Better Auth, reCAPTCHA v3, Resend, private Blob and Vercel Analytics are **BLOCKED** by missing isolated identities/secrets/origin and approved egress. The offline preflight and [provider handoff](CSP_PROVIDER_VERIFICATION.md) specify exact bindings, namespace-to-app mapping, real assertions, privacy and teardown requirements. Even configured services are `PREPARED_NOT_VERIFIED`. X3B mocks/injected sessions are not provider compatibility evidence. Existing authoring Preview guards/resources must not be repurposed.

**GO for the next isolated adapter/provider preparation:** reviewed safe tooling PR, green standard CI and original plus architecture checks across three engines; all failures classified; privacy/egress and mismatch guards pass.

**NO-GO for merging an active nonce/hash architecture or Production enforcement** until all hold:

1. Separate architecture/policy review; verified atomic publication/rollback adapter and complete route/alias/error/SPA inventory. No unreviewed public dynamic conversion or private header regression.
2. Attested disposable services and actual provider assertions pass in all engines. No Production/staging fallback, provisioning, migrations, grants or community activation in this work.
3. Representative cloud cold/warm load, JS and interaction budgets are explicitly accepted. The observed middleware overhead is resolved or accepted with evidence.
4. Privacy projection, platform logs, global abuse budget, bounded retention and independent positive/negative report delivery are verified. No unexplained first-party violation or functional breakage remains; known WebKit report-only blind spots stay classified.
5. Earliest 9 November 2026, never automatic. An immutable reviewed release and compatible report-only rollback are ready. Verify exact SHA, headers, provider flows and deferred chunks after any future authorised release; rollback on regression without weakening sources.

## Reproduction

Run the X3B guarded production build and original browser suite, then:

```sh
AUTHORING_BROWSER_TOOLS=/tmp/csp-tools node --import tsx scripts/csp/architecture.mjs
node scripts/csp/providers.mjs # expected exit 2 without isolated setup
node --import tsx --test tests/csp-architecture.test.ts tests/csp-harness.test.ts
```

Use `CHROMIUM_PATH=/usr/bin/chromium` locally; CI installs/requires all three engines. The architecture command creates/removes a detached temporary worktree and writes only ignored evidence. `CSP_KEEP_EXPERIMENT=1` retains it for inspection. `CSP_REUSE_EXPERIMENT` accepts only a matching dedicated temporary worktree, commit and middleware; CI always builds fresh. `CSP_METRICS_ONLY=1` repeats isolated performance sampling without rerunning browser cases. No `.env`/`.vercel` files or live credentials are accepted by the local build harness.
