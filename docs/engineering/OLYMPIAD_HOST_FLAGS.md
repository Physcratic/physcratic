# Olympiad host flags

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

No currently imported edition has an unknown host. The joint 2016 host and online arrangements above are represented explicitly. Unsupported years, cancelled editions and 2026 return undefined. Add a separately verified lookup row when a future edition is imported, without changing either card component or the catalog contract. No 2026 import is included here. Emoji appearance depends on the operating system's native font support. The accessible country name remains available even when native flags are rendered as regional letters.

## Local checks

Exact results and final head are recorded in the draft PR. Focused tests cover all 100 cards, lookup coverage, competition/year identity, joint/online hosts, missing metadata, preserved metadata and opening action, and no extra tab stops. The focused browser renders the actual cards with production CSS at 375/1440 in light/dark and checks placement, wrapping, accessible names, keyboard opening/focus and axe. Full site sweeps and standard local checks are recorded separately from this component fixture. GitHub Actions usage remains exhausted, remote failures are not passing verification.

Concurrent PRs #133, #134, #136 and #137 do not change either card file or the new lookup. Their shared engineering-document additions need normal reconciliation if combined later. No reader, difficulty, grading, schema, authentication, source-document, dependency or deployment change is included. Draft only, do not merge or deploy.
