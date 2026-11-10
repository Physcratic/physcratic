# Olympiad host flags

Update: the native IPhO 2026 T1 import adds verified Colombia hosting, bringing current coverage to 45 editions and 101 problems. See [native import sources and QA](IPHO_2026_NATIVE.md). The mapping and original verification below record the PR #138 baseline.

10 November 2026. Base main `40ced00d20c4ef01f34b6cedf80caa8c06bc2a47`.

Flags identify the competition host, never a student or author nationality. The typed lookup in `lib/olympiad-hosts.ts` covers the 44 editions represented by the 100 current imported problems. It adds no catalog schema field and reads no problem content. The optional card prop contains the verified country name, native flag emoji and online status. Flags are named images for assistive technology, with a host tooltip, and add no tab stop. The flag and competition badge stay together when metadata wraps. No host means no flag or reserved empty slot.

## Verification sources

- [Official IPhO documentation and past organisers](https://www.ipho-new.org/documentations/) supplies the IPhO countries, including Lithuania online in 2021 and France in 2025. Its organisers table identifies both Switzerland and Liechtenstein for 2016, despite the shorter problem-download heading mentioning only Switzerland. [ETH Zurich's 2016 report](https://www.phys.ethz.ch/news-and-events/d-phys-news/2016/07/talented-physics-youngsters.html) confirms Liechtenstein's organising collaboration. Both flags are shown as one named host group.
- [Official APhO organiser history](https://www.apho2026.kr/en/sub1_2.html) supplies all APhO hosts. Hong Kong, China uses its regional flag and the archive's name. [Taiwan's 2021 organiser](https://tpmso.k12ea.gov.tw/apho/index.php/about/) explicitly describes the online format. [Vietnam National University's 2022 report](https://en.vnu.edu.vn/vnu-students-win-prizes-at-apho-2022-post30915.html) confirms India's online hosting, also described in the [IAPT September 2022 bulletin](https://www.indapt.org.in/api/campusfeed/downloadCfFile?blog_id=21458&file_name=1169_1703758938_3ce8667995e24e530a4694ce80683a80.pdf). The bulletin's current download redirects to an inaccessible signed archive, so the available university report supports that format detail.
- [Official EuPhO archive](https://eupho.ee/archive/) supplies all EuPhO hosts and explicitly identifies Estonia for both online editions. The abandoned 2020 on-site venue in Romania is not used.

Sources checked on 10 November 2026. No host is inferred from a source URL, title or topic. Existing coaching nationality metadata is not competition-host evidence and is not reused.

## Current mapping

| Competition | Year | Host | Format |
| --- | --- | --- | --- |
| IPhO | 2004 | 🇰🇷 South Korea | On site |
| IPhO | 2005 | 🇪🇸 Spain | On site |
| IPhO | 2007 | 🇮🇷 Iran | On site |
| IPhO | 2008 | 🇻🇳 Vietnam | On site |
| IPhO | 2009 | 🇲🇽 Mexico | On site |
| IPhO | 2010 | 🇭🇷 Croatia | On site |
| IPhO | 2011 | 🇹🇭 Thailand | On site |
| IPhO | 2012 | 🇪🇪 Estonia | On site |
| IPhO | 2013 | 🇩🇰 Denmark | On site |
| IPhO | 2014 | 🇰🇿 Kazakhstan | On site |
| IPhO | 2015 | 🇮🇳 India | On site |
| IPhO | 2016 | 🇨🇭🇱🇮 Switzerland and Liechtenstein | On site |
| IPhO | 2017 | 🇮🇩 Indonesia | On site |
| IPhO | 2018 | 🇵🇹 Portugal | On site |
| IPhO | 2019 | 🇮🇱 Israel | On site |
| IPhO | 2021 | 🇱🇹 Lithuania | Online |
| IPhO | 2023 | 🇯🇵 Japan | On site |
| IPhO | 2024 | 🇮🇷 Iran | On site |
| IPhO | 2025 | 🇫🇷 France | On site |
| APhO | 2006 | 🇰🇿 Kazakhstan | On site |
| APhO | 2009 | 🇹🇭 Thailand | On site |
| APhO | 2011 | 🇮🇱 Israel | On site |
| APhO | 2012 | 🇮🇳 India | On site |
| APhO | 2013 | 🇮🇩 Indonesia | On site |
| APhO | 2014 | 🇸🇬 Singapore | On site |
| APhO | 2015 | 🇨🇳 China | On site |
| APhO | 2016 | 🇭🇰 Hong Kong, China | On site |
| APhO | 2017 | 🇷🇺 Russia | On site |
| APhO | 2018 | 🇻🇳 Vietnam | On site |
| APhO | 2019 | 🇦🇺 Australia | On site |
| APhO | 2021 | 🇹🇼 Taiwan | Online |
| APhO | 2022 | 🇮🇳 India | Online |
| APhO | 2023 | 🇲🇳 Mongolia | On site |
| APhO | 2024 | 🇲🇾 Malaysia | On site |
| APhO | 2025 | 🇸🇦 Saudi Arabia | On site |
| EuPhO | 2017 | 🇪🇪 Estonia | On site |
| EuPhO | 2018 | 🇷🇺 Russia | On site |
| EuPhO | 2019 | 🇱🇻 Latvia | On site |
| EuPhO | 2020 | 🇪🇪 Estonia | Online |
| EuPhO | 2021 | 🇪🇪 Estonia | Online |
| EuPhO | 2022 | 🇸🇮 Slovenia | On site |
| EuPhO | 2023 | 🇩🇪 Germany | On site |
| EuPhO | 2024 | 🇬🇪 Georgia | On site |
| EuPhO | 2025 | 🇧🇬 Bulgaria | On site |

## Missing metadata and future imports

No currently imported edition has an unknown host. The joint 2016 host and online arrangements above are represented explicitly. Unsupported years and cancelled editions return undefined. IPhO 2026 now uses the separately verified native-import metadata. Add a separately verified lookup row when a future edition is imported, without changing either card component or the catalog contract. No 2026 import is included here. Emoji appearance depends on the operating system's native font support. The accessible country name remains available even when native flags are rendered as regional letters.

## Local checks

Implementation `cd049d2903b17df844e16b682be40749d74c5cee` was tested in a fresh clean worktree, using Node 22.23.1, pnpm 10.34.9, Chromium 154, external Playwright 1.64.1 and axe 4.14.0. Later changes only record verification and handoff documentation. The draft PR records the final head.

| Check | Result |
| --- | --- |
| Frozen install, offline guards | Pass. Transport guards retain two platform skips |
| Next typegen, TypeScript, zero-warning ESLint | Pass |
| Focused lookup, catalog and card tests | 34 pass, including all 100 imported cards |
| Full server suite | 794 pass, 24 database-dependent skips, one inherited TODO, no failures |
| Full component suite | 139 pass, no skips or failures |
| Guarded production build | Pass with synthetic loopback configuration |
| Focused card browser | Four width/theme combinations, nine actual cards each, pass |
| Full guest site sweep | 336 route/width/theme combinations, zero distinct failures |
| Signed-in site sweep | 72 route/width/theme combinations, zero distinct failures |

The focused browser uses the current production CSS at 375/1440 in light/dark. It checks flag placement, joint/online accessible names, missing metadata, wrapping, no horizontal overflow, keyboard opening/focus and zero serious/critical axe violations. Screenshots were inspected. Initial new fixture runs exposed a wrong badge-element assertion and missing Next client environment and browser-context setup. These test fixtures were corrected without removing existing assertions or changing application behavior.

Commands run with the Node 22 executable first on PATH and inherited service credentials removed:

```sh
corepack pnpm install --frozen-lockfile
python3 -B scripts/phase-c-offline/run.py safety
corepack pnpm exec next typegen
corepack pnpm exec tsc --noEmit
corepack pnpm lint --max-warnings=0
node --require ./tests/server-only-register.cjs --import tsx --test lib/olympiad-hosts.test.ts lib/corpus-catalog.test.ts tests/problem-card.test.ts
corepack pnpm run test:server
corepack pnpm test:ui
node --import tsx scripts/csp/local.mjs --build
AUTHORING_BROWSER_TOOLS=/external/browser-tools CHROMIUM_PATH=/usr/bin/chromium node tests/olympiad-host-flags.browser.mjs
```

The focused browser saves screenshots under `work/olympiad-host-flags`, or `BROWSER_SCREENSHOTS` when supplied. External browser tools are not application dependencies. GitHub Actions usage remains exhausted, remote failures are not passing verification. No live provider, physical-device or Firefox/WebKit result is claimed. Full database/release package suites were not repeated for this presentation-only change, their source and contracts remain unchanged.

The existing `SWEEP=1 node tests/solve-contrast.browser.mjs` ran against the actual guarded production server at 375/390/768/1440 in both themes. The guest sweep covers 42 stages per viewport/theme, including current card collections. Its existing contest fixtures remain in use. The second invocation supplies a synthetic `SESSION_COOKIE` and covers nine signed-in stages per viewport/theme. Signed-in qualification uses only a disposable PostgreSQL 18.6 container, synthetic account/session and locally seeded schema. No real account or shared database is used. Guest minimum text/border contrast is 4.64:1/3.70:1. Signed-in minimum text/border contrast is 5.25:1/3.67:1. The optional admin and published-authored-student stages are not included.

Concurrent PRs #133, #134, #136 and #137 do not change either card file or the new lookup. Their shared engineering-document additions need normal reconciliation if combined later. No reader, difficulty, grading, schema, authentication, source-document, dependency or deployment change is included. Draft only, do not merge or deploy.
