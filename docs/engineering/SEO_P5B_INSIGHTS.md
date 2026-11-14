# P5B problem insights editorial audit

Base `1189ab02878bf607cdf653d3ebdf33b250d1911e`, 14 November 2026. Exactly two original supplements are drafted. Both remain unpublished and have no recorded independent human reviewer. The complete copy lives in `lib/problem-insights.ts` and is reproduced in PR evidence. This automated physics review is not owner editorial approval.

## Selection

| Candidate | Sources and conceptual value | Existing discovery links | Decision |
| --- | --- | --- | --- |
| IPhO 2009 T1 | Complete original English statement and organizer solution available locally and from a mirror. Connect angular-momentum bookkeeping to power flow and dissipation without supplying final numerical answers. | Published Mechanics guide already links this problem, Mechanics topic lists it. | Select. Power ledger adds a diagnostic interpretation of the official energy and torque results. |
| IPhO 2010 T1 | Complete original English statement and organizer solution, including both energy derivations. Image-field versus configuration-energy confusion yields a precise factor-of-two diagnostic. | Electromagnetism topic already lists it. Existing books guide has an Electromagnetism section. | Select. A complementary boundary-condition insight extends the pilot beyond a second mechanics example. |
| IPhO 2016 T1 | Original English statement and 12-page organizer marking scheme available. Contact modelling has value, but the hidden-disk and stick-slip setups need substantial separate context. Organizer-hosted 2016 exam collection independently confirms the statement's provenance but explicitly excludes solutions. | Already linked from Mechanics guide and topic. | Defer. A short supplement would either cover only part of the reader or risk oversimplifying two different models. Not rejected for lack of a solution. |

Search Console performance, queries, indexing and rankings: **UNKNOWN**. No authorized Search Console tool/data is available. Selection uses source quality and educational fit, not invented search evidence.

## Source audit

The selected complete local PDFs were read before drafting: 2009 statement7 pages/solution4 pages, 2010 statement3 pages/solution8 pages. Text extraction misses some image equations in the 2010 solution, so all eight solution pages were also visually inspected. Both source pairs are original organizer-authored documents hosted by a mirror, not independently verified official hosting or third-party rewritten solutions. Live PDFs were opened through web access on 14 November 2026. No source is presented as a human review of our commentary.

- [2009 statement](https://olimpicos.net/files/ipho/IPhO_2009_Q1.pdf), sections1–4. Local SHA256 `d33c90b9353747045d51c1fcf29c28290371fcdc036ae79aa6dc41409bc56560`.
- [2009 solution](https://olimpicos.net/files/ipho/IPhO_2009_S1.pdf),3g,3h,4a–4d. SHA256 `ce30702d56bfd330316994aa217f3b66b716b465efadcdebc9ecdf21982982be`.
- [2010 statement](https://olimpicos.net/files/ipho/IPhO_2010_Q1.pdf), introduction and Task4. SHA256 `67701ceca004cc12a187b6f0d8dc950a73ec9af64dc1a22b2f7e0bba0af0d195`.
- [2010 solution](https://olimpicos.net/files/ipho/IPhO_2010_S1.pdf), equations8–10 and25–31. SHA256 `b7b89a6e6394a7b4a10d21c091d0eb90b9b58ed5bac5df9044e69c82e9fbe20f`.
- Evaluated alternative: [2016 statement from organizers' exam collection](https://science.olympiad.ch/fileadmin/user_upload/Archiv/Public/Reports_Intl_Olympiads_in_Switzerland/Final_Report_IPhO_2016/Exams-IPhO-2016-International-Physics-Olympiad.pdf), [original marking scheme on mirror](https://olimpicos.net/files/ipho/IPhO_2016_S1.pdf).

## Physics review

An independent automated reviewer read the source extracts, checked relevant image-rendered equations and all four PDF hashes, and independently derived the following. No confirmed physics or attribution defect remained. The primary author also checked these identities with SymPy. These checks validate the draft, not every statement elsewhere in the imported corpus.

For the Earth-centred circular-orbit approximation, differentiation gives `dL/dD = M_M sqrt(GM_E)/(2sqrt(D))` and `dE/dD = GM_E M_M/(2D²)`. Their ratio is `n = sqrt(GM_E/D³)`. A positive torque on the orbit is negative on the Earth's spin. Fixed Earth inertia gives spin power `−Ωτ`, orbital power `nτ`, and heat `τ(Ω−n)`. Each power has energy/time units. For the present ordering and outward transfer the heat is positive. The equality-of-speeds check is a consistency limit, not a constant-torque extrapolation or a realistic future prediction including the Sun, lunar spin or changing Earth structure. Original value: make the different powers of equal angular-momentum transfers explicit, rather than merely repeating the final yearly energy calculation.

For the grounded sphere with fixed q,R and d>R, `q′=−qR/d` and `d′=R²/d`. The interaction term is `−kq²R/(d²−R²)`. The induced-charge self-interaction contributes the opposite half, leaving total configuration energy `U=−kq²R/[2(d²−R²)]`. Its negative derivative is the outward signed force `−kq²Rd/(d²−R²)²`, agreeing with the direct image-field force. Treating the full interaction term as total energy doubles the force. A quasistatic charge-assembly argument uses linear response at fixed geometry to explain the half. Units and zero-force-at-infinity limit agree. The reviewer also checked the near-surface grounded-plane limit. Original value: distinguish the fixed-configuration field replacement from differentiation along changing induced configurations. This does not treat an isolated charged sphere as grounded.

## Architecture and boundaries

The imported reader is a client component with statement/solution tabs. The existing public server page supplies crawlable statements and static metadata. The supplement is a small separate server section after the existing reader, using the existing Learn paragraph, citation and server KaTeX/MathML renderer. It does not enter the client reader, answer workspace, grading, progress, permission or publication lifecycle code.

A server-only registry allows only records with `published:true` to reach that section. Both current records are false/null, so all public responses and client bundles must exclude their draft copy. No environment-dependent preview, public preview route or second CMS is introduced. A direct component render fixture supplies owner-review/browser evidence only. After separate owner approval, published content would be real server HTML. Native closed details keep result-bearing commentary and equations behind an explicit spoiler label even without JavaScript. This is a user disclosure, not a hidden crawler-only catalog or a substitute for the existing solution tab.

Canonical/indexability,139 sitemap URLs,121 readers and103 archive entries remain model-derived and unchanged. No article, topic/catalog, source PDF, official statement/solution, image, rating or grading data is modified. Citations identify sourced models/results; prose explicitly identifies the original synthesis. Sources and stronger hints are inside the spoiler disclosure. No expert approval or learning-outcome claim is invented.

## Verification and approval

Focused tests validate exactly two drafts, source fingerprints, reader/guide links, copy rules, closed native disclosures, accessible server math, citation targets, negative public output and an isolated positive publication fixture. TypeScript, zero-warning lint, guarded production build, production HTTP/HTML and browser/CI results are recorded in the PR at its exact head.

Owner editorial approval remains required for both complete supplements, source audit, scope/placement and spoiler level. No merge, publication, provider change, SQL or paid resources are authorized by this pilot. Physical Safari and search-engine indexation are not inferred from a successful build or HTTP200.

Editorial revision, 14 November 2026: #165 now labels the closed disclosure “Show derivations and final results (spoilers)” and the introductory heading “Concepts to consider”. Visible attribution is “Original Physcratic commentary”, while both null reviewer fields and unpublished gates remain. P_heat is explicitly the model's mechanical-energy loss rate, and the image-field domain is explicitly outside the grounded sphere. A second-pass author review checked these terms against the already verified equations and source references. This is not a new independent human review. Final commands, browser evidence and exact-head CI are recorded on the draft PR.
