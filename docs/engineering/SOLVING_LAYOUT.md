# Friday practice and Arena layout

B4, 10 November 2026. Explicit base B3 PR #136 at `7d508f27c4b9a6df2fdfe71c7a83d98141aa8cb3`. It inherits B1 through B3. B2A/B2B remain independent and are not silently copied into this branch.

Practice and Arena use the authored reader's `xl` breakpoint and 23rem answer rail. The statement/solution reading column stays flexible. `AnswerWorkspace` is a small named, keyboard-focusable presentation wrapper. At desktop widths it sticks 20px from the viewport top, bounds its height to the viewport and scrolls its own controls. It has no sticky position, maximum height or nested vertical scrolling on mobile.

The practice solution stays in the left reading column while the rail spans both reading rows. This prevents the sticky rail from covering solution content. Statement, answer and solution remain in their original mobile DOM order. Hints, clear/reset, next-problem and correct-answer solution disclosure are preserved.

Arena retains the existing public statement/solution tabs and server-rendered statement/figures. Its unchanged answer panel now lives beside those tabs and remains mounted while the selected document changes. Returning to another problem resets document selection to statement through an identity-keyed reader. Optional `SolveSteps.onNavigate` selects the appropriate document before a normal anchor scroll. Other callers retain their native anchor behavior. Named document links remain reachable at the end of the answer rail.

No grading endpoint/algorithm, input contract, answer reader, recovery model, source document, diagram, solution permission, SSR/SEO contract, global style, dependency or CSP configuration changes. Imported/corpus/guided/contest readers are deliberately deferred. Their specialized PDFs, translations, self-review and contest timing/scoring stay untouched.

## Verification

The built-browser regression uses real production practice/Arena routes and the unchanged production guest grader through a loopback-only adapter. It covers original figures and pre-JavaScript rendered mathematics, 375/1440 light/dark, column geometry, sticky viewport bounds, keyboard scrolling on an 18-part problem, mobile normal flow, no overflow, axe, natural MathLive typing, a 201-character expression/reload, hints/checking/solution access and preservation of the live field node across document tabs. Source titles are read from the canonical index, not inferred from legacy URL slugs. Screenshots were inspected.

A visual QA pass found the practice solution spanning beneath the sticky rail. The final left-column solution and spanning rail remove that overlap, with a browser assertion. The initial new multipart check used an obsolete title from its URL slug. It now verifies the actual canonical title and rendered mathematics in server HTML. Existing assertions are not removed or relaxed.

The PR records exact local type/lint/server/component/build/browser results. Database tests are not required for this presentation-only diff. Physical phones/OS keyboards, Firefox/WebKit, live auth/providers/Preview and independent review remain separate qualification. B3's public-consent freshness limit remains documented in READER_METADATA.md and its flags are unchanged.

## Reconciliation

B2B replaces the practice panel's `key={reset}` with `resetToken={reset}` to preserve uncertain retry intent. Preserve that B2B property when combining this layout, including the rail and left-column solution. B4 does not change that property itself or import B2B's client model. Requalify the combined tree before release. Concurrent PR #135 editorial values remain in the central helper and are not copied. No PR merge, deployment, SQL/grant, provider/settings, flags, billing/workflow or CSP operation is authorized by this batch.
