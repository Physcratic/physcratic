# X3D: fail-closed CSP regression inventory

Historical X3D evidence follows. [X3E](CSP_X3E.md) extends this same review PR with explicit coverage and current-main reconciliation. Its exact-head runtime qualification remains a separate gate from this original inventory failure.

Baseline: main `6f290654a0461560ce6aa9190e2bdf71fcc1dc2d`, 4 November 2026. Test tooling only. Application/header/policy output, public prerendering, auth, private media and community flags are unchanged. No adapter, provider call, deployment or enforcement is introduced. PR #121 remains the readiness report, not an enforcement approval.

## Coverage and deliberate qualification failure

`route-inventory.mjs` reconciles current App Router page/route/error filenames against the completed build's app-paths, prerender and routing manifests. It checks source-only/stale compiled pages, enumerates generated static slugs and RSC data mappings, and uses the **same exported matcher list that generates the detached prototype** plus actual static hash artifact keys. New error/not-found boundaries require explicit review of the boundary registry in the inventory module. New handlers require a reviewed entry in non-document-routes.json; this registry is a response-contract review boundary, not proof that every authenticated handler was exercised.

Current output: **19 document templates, 58 handlers, four error/not-found boundaries, 12 prerender RSC mappings and one routing-manifest redirect**. The generated artifact is `build/csp/route-inventory.json`.

| Classification | Routes |
| --- | --- |
| Request nonce (9 templates) | /dashboard, /dashboard/author, /dashboard/authored/[id], /dashboard/submissions, /dashboard/problems/[id], /sign-in, /sign-up, /u/[handle], /coaching |
| Static hashes (5 templates, 10 concrete artifacts) | /terms, /learn, /learn/[slug] (six generated slugs), /coaching/consultation, /coaching/become-a-tutor |
| **Uncovered (5)** | **/, /_not-found, /settings, /admin/moderation, /admin/verification** |

`architecture.mjs` writes the inventory then asserts no errors or uncovered HTML **before** building the detached hybrid experiment. Therefore the CSP qualification job is deliberately red on this candidate. Do not skip/xfail these five routes or add blanket exemptions to obtain a green result. A later reviewed prototype coverage change must handle them correctly; this batch does not implement the atomic adapter or assert enforcement readiness. The home redirect's generated HTML is not exempt simply because page.tsx calls redirect(). Generated not-found HTML remains a document. Error/global-error/not-found components are inventoried as boundaries, inheriting the responding document policy and still requiring runtime error-path qualification. Structural classification alone does not prove all error states or every route's functionality.

The browser harness additionally classifies actual same-origin responses by HTTP status and content type. Observed HTML at an unknown/API path fails rather than becoming a transport exemption. Known text/x-component responses are RSC; unknown RSC or inconsistent prefetch/RSC representations fail. Manifest RSC paths supplement App Router URL matching. Redirects require Location, are recorded without pretending the destination's HTML has been tested, and destination HTML is checked separately when fetched. 204/304, JSON, JS, CSS, images and attachments are non-document/no-body responses. The explicitly controlled /__csp fixture namespace is excluded from application route checks. This is not a new request interceptor or deployed router.

## Workflow triggers and cost

The existing three-engine workflow now watches app/**, components/**, lib/**, public/**, tests/**, optional future src/**, CSP tooling, root build/config files, middleware/proxy files, vercel.json, package/lock/workspace manifests, Node version/npm configuration, and standard/CSP workflow definitions. Broad shared-source and asset coverage is deliberate: imports, inline bootstrap text and trusted HTML/hash bytes can change transitively. It reads no generated corpus contents merely to evaluate a trigger.

Documentation, migrations/SQL-only changes, unrelated operator/release scripts and other workflow files are deliberately excluded. They do not change this synthetic Next build's document/script pipeline; standard/database CI retains its independent coverage. A build pipeline newly importing such a path must add it to the trigger set in the same change. Pure test edits under lib/tests still conservatively trigger qualification. No new dependencies or scheduled/Production job were added.

A matching PR schedules the existing 20-minute three-engine job: focused tests, one guarded baseline build and 54 report/enforce browser cases, then inventory qualification. If all documents are classified, the existing second hybrid build and four cases per available engine follow. Current uncovered routes stop before that second build, saving its cost. Docs-only PRs avoid the job. All three engines are required in CI; locally absent engines remain limitations, not passes.

## Verification

Local validation: 33 focused tests passed with no skips/failures; TypeScript and zero-warning lint passed; the guarded synthetic production build passed. Chromium 154.0.8037.57 completed all 18 existing report/enforce cases (10 functional successes, eight expected blocks with successful fallback), including observed HTML/RSC/non-document/no-body classification. No unexplained violation or functional breakage occurred. Firefox/WebKit executables were unavailable and are explicitly not counted as successes. Host Node 24.19.0 differs from required CI Node 22.

The architecture command exited 1 as intended, after writing the inventory with the five uncovered routes and zero source/build/handler drift errors. It did not build/run a newly qualified hybrid candidate. Standard CI and the three-engine CSP job are separately recorded on the PR's exact head; a red qualification gate is not a standard unit-test failure or evidence of a deployed-policy change.

Reproduce: run `node --require ./tests/server-only-register.cjs --import tsx --test tests/csp-*.test.ts lib/security-csp*.test.ts`, then `node --import tsx scripts/csp/local.mjs --build`; run the existing browser.mjs and architecture.mjs with AUTHORING_BROWSER_TOOLS pointing to existing Playwright tooling and CHROMIUM_PATH locally. CI uses CSP_REQUIRE_ALL=1 and installs all three engines. Inspect ignored build/csp/browser-results.json and route-inventory.json, not only process exit codes.

Focused tests cover new static/dynamic/admin/generated pages; source/build drift; render-mode changes; missing static slug hashes and dynamic fallback; route groups/parallel slots; unsupported interception syntax; unknown handlers; HTML masquerading as API/RSC; redirects; and actual temporary App Router/build artifact reconciliation. Existing CSP harnesses and synthetic environment/network guards are reused. No real provider or Production qualification is claimed. Production CSP stays report-only and enforcement remains NO-GO.
