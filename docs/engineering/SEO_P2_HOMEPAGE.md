# P2 public homepage checkpoint

11 November 2026. Base `b3912ce60f80929c360ccb7956d6b394eef1aff5`, branch `codex/seo-p2-public-home`. The draft PR records its final head and GitHub results. No merge or manual deployment is authorized.

## Implementation and integration contracts

- The guest homepage uses the existing dashboard Layout, tokens, navigation and cards. Its explanation, practice action, two additional problems, topics, archive, guides and account actions are server-rendered ordinary anchors. Model-derived links retain existing reader identities. No new catalog or API is introduced.
- `app/page.tsx` and its session branching, root metadata, structured data and force-dynamic/private-no-store behavior remain unchanged. No-cookie requests still skip auth lookup. Verified members receive the existing dashboard. Public humans and crawlers use the same content.
- Logo, Workspace and Lobby destinations point to `/`. Other dashboard views, search/topic parameters, Studio, settings and account actions are preserved. `/dashboard` remains accessible and noindex. The manual tour's problem step supports both home URLs without enabling root auto-start.
- P3 can reuse the dashboard Layout and static model. It must preserve `/problems` canonical/discovery links and old dashboard query behavior, and stack from the P2 verified head. P2 does not redirect library routes or change collection logic.

## Verification

Local production-mode build, focused SEO/copy/render/tour tests, Next type generation, TypeScript and zero-warning lint use Node 22.23.1 and frozen pnpm 10.34.9. Detailed counts and the final browser/session results are recorded after the local gate completes.

The extended existing home-session fixture uses disposable PostgreSQL and synthetic A/B users. It checks concurrent HTML/RSC responses, audience selection, private/no-store, token/identity/solution exclusion, missing/tampered/expired cookies and actual member browser navigation/sign-out to the guest home. The separate public-home browser checks the six width/theme combinations, keyboard navigation, no-JavaScript links, actual practice readers and account-API recovery. The existing contrast sweep is reused with a homepage-only stage filter.

No Production data, settings, providers, flags or deployment was operated. Production behavior, real providers, physical devices and Google Search Console/indexation/rankings are unverified.

## Screenshots

Before captures use the exact baseline source tree in a local production build. After captures use the P2 production build. Representative 375px and 1440px evidence in both themes is in [seo-p2](seo-p2/). The complete 375/768/1440 sets remain in the task's local evidence directory.
