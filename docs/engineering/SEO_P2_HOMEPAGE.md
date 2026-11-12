# P2 shared Lobby revision

12 November 2026. Owner-requested reversal of the earlier P2 design on draft PR #143, revision based on `989b03217c9de28dc85c42f8a96738350ce78e72` and integrated main `01757c0abf152e891fb896b6d77f302a87febca6`. The PR description and Checks tab record the final exact head. Keep draft, do not merge or deploy.

## Architecture

The anonymous homepage now renders the existing Dashboard and Overview directly. Featured contest, Arena recommendation, rating, coaching and history retain their existing components, order and guest states. The rejected standalone practice, suggestions, topics, guides and account cards are removed. Only the Lobby subtitle is replaced with a short public explanation and four primary links for Arena, library, archive and guides. Six crawlable topic anchors sit in secondary navigation after the complete Lobby content.

The shared recommendation starts with a stable real Arena entry on both server and first client render. Its title, summary and reader anchor are available without JavaScript. After hydration the existing `pickProblem` and browser-local solved history choose an unsolved problem. Another problem keeps its existing behaviour and requires JavaScript.

`app/page.tsx`, audience resolution, private/no-store response handling, root canonical, robots and structured data are unchanged. Members receive their existing Lobby without the guest discovery header. `/dashboard` remains noindex and accessible, and `/` is not redirected. No authentication, grading, rating, database or community permission change.

The earlier public sticky-header/menu correction is retained on the guest root. The original dashboard header defaults remain unchanged. No library redesign is included. Legacy practice retirement is a separate owner-authorized draft PR, not P3.

## Verification

Node 22.23.1 and frozen pnpm 10.34.9 installation. Final local production build `K0An7_ppHtyo1NpEDasEh` passes with synthetic auth and unreachable loopback database only. Typegen, TypeScript and zero-warning lint pass.

- Focused SEO/copy: 95 pass. Lobby/solved-selection/tour: 19 pass. Server-rendered statements and guide links: 7 pass, including the recommendation rendering case again.
- Real disposable PostgreSQL A/B/guest HTML and RSC isolation plus desktop/mobile sign-out transitions: 661 checks pass.
- Homepage contrast/keyboard/structure/axe: 375/390/768/1440, both themes, zero failures. Minimum text 5.25:1 and border 3.79:1.
- Public-home browser matrix covers 375/768/1440, both themes, normal synthetic guest state, actual Arena readers, same Lobby heading order as `/dashboard`, no hydration errors, account-error recovery and no-JavaScript navigation. 168 checks pass. First-time open-problem, topic and coaching tasks pass. The wider historical script fails a legacy-reader answer-recovery assertion on the unchanged reader, and cannot reach server-rendered sign-in on an unavailable database. Actual sign-in/sign-up navigation is covered by the disposable-session fixture. The separate retirement batch replaces legacy reader journeys with Arena coverage.
- The broad live no-JavaScript audit verifies the revised root, then stops at the existing IPhO 2026 T1 source-line/structured-data visible-label mismatch. Its unchanged native reader is outside this design reversal. This is not counted as a passing whole-site audit.
- Independent review checks source and 375/1440 in both themes with healthy synthetic guest and actual unavailable-API states. No confirmed privacy, rendering or accessibility blocker. Mobile discovery adds approximately 184px above the existing card stack, with Arena library entry still near the top.

Local logs are `/tmp/lobby-{focused,focused-ui,render,tsc,lint,build-final,browser,session,contrast,journey}.log`. GitHub Actions performs the full standard/database/browser suites on the final PR head. Earlier rejected-design test evidence is historical and does not establish this revision's visual acceptance.

## Screenshots and limits

[Comparison screenshots](seo-p2/) now pair the existing dashboard reference (`before-*`) with the revised root (`after-*`) at 375 and 1440 in both themes. Captures use the same build, Arena solved-history fixture and synthetic healthy guest responses. Tablet comparisons remain in local browser evidence. The original dashboard is the visual reference.

No Production data, provider, settings, flags or deployment operation. Physical devices, Firefox/WebKit, live providers and Google Search Console/indexation/rankings are unverified. No automatic merge or deployment is authorized.

## Final visual correction (12 November 2026)

From reviewed head `0d929b3`: move only the six topic anchors from the header into plain secondary navigation below the existing Lobby. The header keeps its four primary links. The Dashboard gets an optional server-rendered child slot after Content. No card, typography, recommendation, metadata, robot, session or cache change.

Node22.23.1/pnpm10.34.9 frozen install, 95 SEO/copy checks, 24 render/selection/tour checks, typegen/TypeScript, zero-warning lint and production build `zsQQxs_XcioDnuIccoEYN` pass. Updated browser checks: 205 pass, including four-versus-six navigation, after-content order, all no-JavaScript topic anchors and exact original five-card geometry. Disposable A/B/guest session checks: 661 pass. Eight homepage contrast/keyboard/axe combinations pass with zero failures, minimum text5.25:1 and border3.79:1.

The four `after-*` captures are replaced at375/1440 in both themes. The original Dashboard `before-*` files are preserved byte for byte. Comparison retains identical card sizes and order, with the first card88px higher on375px than the prior P2 header. Current exact-head CI links and final SHA are on draft #143. Keep both #143 and stacked #146 draft and unmerged. No deployment or P3.

Main advanced through #145 to `8bb5941057ab837fed2ade319d36e2380c0f3be6` during final verification, making the old draft conflict on the appended BETA_READINESS evidence. The normal reconciliation merge preserves both evidence sections and every upstream Studio/reader/tour implementation. The homepage browser now follows the upstream Coaching/Settings-before-practice tour order and checks that its existing fixed Arena destination resumes exactly one reader tour. Updated exact-head gates are on #143. No recommendation or tour application logic was changed by this correction.
