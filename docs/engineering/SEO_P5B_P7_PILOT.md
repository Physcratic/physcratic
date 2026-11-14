# P5B publication and P7 monitoring baseline

14 November 2026. Base `7fee15204122f65befe9aa6d25b398e398ead66c`. Owner approves only the existing IPhO2009T1 and2010T1 insights. Only their publication flags change in application code. All approved copy, equations, source records, PDFs, null reviewers, closed native disclosure, metadata, grading and account behaviour remain unchanged. Publication PR records exact-head CI, merge SHA and actual deployment evidence.

## Read-only baseline

Before editing flags, both target pages were fetched from the existing isolated production build at02c379e, whose application/source tree is identical to main7fee152. This reuses the qualified build, not a development server. Raw snapshots were retained locally. Live HTTPS was attempted separately and rejected by the execution proxy before origin: tunnel403. No live application response was observed.

| Technical contract | Before publication, measured locally | Publication contract to verify |
| --- | --- | --- |
| Reader status | Both200, guest-accessible | Both200, same routes |
| Canonical | `https://physcratic.com/dashboard/problems/ipho-2009-t1` and `/ipho-2010-t1` | Unchanged |
| Metadata/indexing directives | Existing descriptions/OG text, no noindex/nofollow meta or header | Unchanged |
| Crawl access | Production robots has no restriction on either reader | Unchanged for Googlebot and generic crawler |
| Sitemap |139 URLs, both readers already included | Same registry/policy/count |
| Internal links |2009 linked by Mechanics Learn guide and topic,2010 by Electromagnetism topic | Existing links retained; supplements link back to relevant learning |
| Source availability | All four statement/solution PDFs200, byte-identical to audited local source hashes | Same PDFs and hashes |
| Supplement | Absent from public HTML/RSC | Exactly one matching section per target, meaningful server HTML/MathML |
| Spoilers | No supplement to disclose | Derivations/results closed by default, native keyboard/no-JS toggle |
| Reviewer | Both null | Both null, no expert-review claim |

Technical index eligibility is not actual Google indexation. The new educational prose uses the existing reader URLs, not new pages or a new sitemap category. Closed native details remain accessible to users without JavaScript. Source/physics provenance and previous independent critique are in SEO_P5B_INSIGHTS.md. Further independent review must verify this flag-only application diff, not invent a new human reviewer attribution.

## Search and engagement evidence

Search Console observations: **UNKNOWN**. No authorized Search Console connection is available. Actual indexing status, Google-selected canonical, last crawl, impressions, clicks, CTR, positions and ranking changes are UNKNOWN. No engagement measurements were collected in this task. There is no claim of improved rankings, traffic or learning outcomes. Live visibility checks blocked by network policy must stay BLOCKED even if provider deployment metadata says READY. Local screenshots and builds are not live HTTP evidence.

## Four to eight week follow-up

- Week0: record actual release date/SHA and use owner-authorized URL Inspection for both exact URLs. Record indexed status separately from live-test eligibility, Google-selected canonical, last crawl and sitemap discovery. Save a Search Results export for the preceding28days with page/query/device/country breakdown where available. Do not fabricate a pre-release baseline if exports are unavailable.
- Weeks1–2: check whether Google has recrawled the changed pages and whether eligibility/canonical status remains healthy. Investigate real coverage errors, not an expected delay in recrawl. Any indexing request should be an explicit owner action through their account, not an action taken by this task.
- Week4: compare the next28days with the preceding28days for each exact page: impressions, clicks, CTR and position with sample sizes. Review query/device mix, seasonality and concurrent archive changes. Small samples and query-mix changes can dominate averages.
- Week8: repeat a consistent four-week comparison and inspect the full eight-week trend. These two pages are a limited descriptive pilot, not a controlled experiment. Do not attribute ranking movements causally to the insights without supporting evidence.
- Engagement: use only already authorized/enabled analytics for page visits and any engagement metrics it actually provides. Visits alone do not show that a user opened or understood a derivation. Native disclosure-open events are not currently instrumented. No new tracking dependency/event is added. Any future instrumentation requires a separate proposal. Supplement available data with voluntary qualitative feedback without collecting private answers or identities.

## QA and release evidence

Focused publication/model/source/render/SEO tests retain negative unpublished fixtures and source fingerprints. Production-mode browser QA checks actual target pages, closed spoiler state, existing solution-tab access, native keyboard/no-JS behaviour, MathML, attribution, source links and page overflow. Compare metadata/sitemap/robots/PDF hashes before and after and check an unrelated reader. Exact executed commands, limitations, final independent review, exact-head CI and post-merge state are recorded on the publication PR. No manual deployment, provider settings, Production SQL, B6 execution, new content or P6 is part of this pilot.
