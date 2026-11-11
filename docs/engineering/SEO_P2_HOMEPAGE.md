# P2 public homepage checkpoint

11 November 2026. Original base `b3912ce60f80929c360ccb7956d6b394eef1aff5`, branch `codex/seo-p2-public-home`. Implementation `c42295b` incorporates frozen main `01757c0abf152e891fb896b6d77f302a87febca6` through reviewed runtime merge head `af97dcff67889e9441fd63221ff3c8458dae0b99`. The final documentation-only commit preserves the verified application and test bytes. Draft PR #143 records its exact final head and GitHub results. No merge or manual deployment is authorized. P3 was cancelled by the owner; this mission stops after P2.

## Implementation and integration contracts

- The guest homepage uses the existing dashboard Layout, tokens, navigation and cards. Its explanation, practice action, two additional problems, topics, archive, guides and account actions are server-rendered ordinary anchors. Model-derived links retain existing reader identities. No new catalog or API is introduced.
- `app/page.tsx` and its session branching, root metadata, structured data and force-dynamic/private-no-store behavior remain unchanged. No-cookie requests still skip auth lookup. Verified members receive the existing dashboard. Public humans and crawlers use the same content.
- Logo, Workspace and Lobby destinations point to `/`. Other dashboard views, search/topic parameters, Studio, settings and account actions are preserved. `/dashboard` remains accessible and noindex. The manual tour's problem step supports both home URLs without enabling root auto-start.
- P2 does not redirect library routes or change collection logic. Any future library phase needs separate authorization and must preserve the existing discovery/session contracts. No P3 PR or merge is part of this delivery.

## Verification

Exact combined-tree local gate: Node 22.23.1, frozen pnpm 10.34.9, PostgreSQL 18.6, Playwright 1.64.1, Chromium 154.0.8037.57 and axe 4.14.0. Build ID `9ry1iIUw-Xr1u5oVMgeEj`.

| Check | Result |
| --- | --- |
| SEO, copy, server rendering and tour tests | 111 pass, no skips or failures |
| Next typegen, TypeScript, zero-warning lint | Pass |
| Guarded production build, synthetic auth and unavailable loopback DB | Pass, 182 generated pages |
| Public-home browser, 375/768/1440 in both themes, no-JS and unavailable account API | 142 checks pass |
| A/B session fixture, concurrent HTML/RSC, real 1440/375 member navigation/logout | 657 checks pass |
| Existing homepage-only contrast/structure/keyboard/axe sweep, 375/390/768/1440 both themes | Pass, zero failures. Minimum text 6.36:1, border 3.79:1 |
| Independent source and six width/theme browser review | Pass, zero axe violations and no material blocker |

The original broad suites are left to GitHub Actions on the draft PR. There is no local full-suite duplication. Detailed command logs are `work/p2/main144-{focused,typegen,typecheck,lint,build,browser,session,contrast}.log`. Failed/cancelled earlier attempts remain separate and are not counted as passes. Confirmed menu/header overlap and a manual-tour path/copy mismatch were corrected before these final gates. The public-only sticky header defaults OFF for existing dashboard/reader consumers. The Esc test waits for Radix exit animation, and mobile account recovery is checked through its actual Menu path.

The extended existing home-session fixture uses disposable PostgreSQL and synthetic A/B users. It checks concurrent HTML/RSC responses, audience selection, private/no-store, token/identity/solution exclusion, missing/tampered/expired cookies and actual member browser navigation/sign-out to the guest home. The separate public-home browser checks the six width/theme combinations, keyboard navigation, no-JavaScript links, actual practice readers and account-API error/retry controls. The existing contrast sweep is reused with a homepage-only stage filter.

The React best-practices checklist was applied: server-only public data, no new fetch waterfall or request-global state, stable typed problem identities, ordinary anchors and accessible existing controls. Source checks confirm upstream account-deletion APIs, settings, attribution and migrations remain byte-identical to main. All 24 runtime/test files introduced by #144 are also byte-identical to frozen main `01757c0`; only the three shared engineering logs gain the P2 checkpoint. Independent review of the final combined build passes root HTML/RSC/bot/invalid-cookie privacy and metadata checks, default dashboard query noindex, sitemap 150 and mobile/tablet geometry/axe/real reader navigation.

No Production data, settings, providers, flags or deployment was operated. Production behavior, real providers, physical devices and Google Search Console/indexation/rankings are unverified.

## GitHub component-test follow-up

CI #333 on initial PR #143 head `697afae` stopped in `tests/tour-layer.test.ts` because its source assertion required the old literal `className="relative z-40 ..."` form. The header still uses the same unconditional `z-40` layer in both modes. This test-only repair checks the static layer outside conditional interpolations, renders both default-relative and public-sticky headers, and checks computed z-index/position in the browser. Existing ring/menu/dialog/card ordering assertions remain unchanged. Seven focused layer checks, the 111-check combined focused set and the 142-check public browser set pass. No application bytes changed and no production rebuild was needed. CI #334 and community browser #60 passed on repair head `f0480a5`. Full CI #337 passes on integrated runtime head `af97dcf`. Final exact-head GitHub results are recorded on draft PR #143, with pending checks kept distinct from passing evidence.

## Screenshots

Before captures use the exact baseline source tree in a local production build. After captures use the P2 production build. Representative 375px and 1440px evidence in both themes is in [seo-p2](seo-p2/). The complete 375/768/1440 sets remain in `work/p2/screenshots`. Local screenshots show unavailable account-service recovery where applicable, not a production outage. Physical devices, Firefox/WebKit and live provider qualification were not performed.
