# Legacy practice retirement

12 November 2026. Separate draft stacked on P2 #143 head `0d929b3ee81567b447c281436ed0ec3cf2ce9b3a`, incorporating main `01757c0abf152e891fb896b6d77f302a87febca6`. The PR body records exact final head and CI. No merge, deployment or settings change is authorized.

## Boundary and implementation

The complete retired set is derived from `lib/physics.ts`, not difficulty: `incline`, `circuit`, `string`, `projectile`, `spring`, `resistors`, `power`, `wave`, `echo`, `heat`, `gas`, `first-law`.

`lib/legacy-practice.ts` supplies exact Next redirect sources and the Arena-library destination. Next handles them before `dynamicParams=false`. Production HTTP tests verify permanent 308 responses, query precedence, trailing-slash normalization, successful landing and no loops. Similar unknown IDs still return 404. The retired metadata fallback is noindex with no canonical, and their reader/OG/static generation is absent.

The shared public registry now contains Arena and archive problems only. Sitemap, library, topics, related links, structured data and AI discovery derive from that registry. The old practice section and AI examples are removed or replaced. Arena remains the existing default interactive collection. All five Guided exercises have distinct identities and remain intact.

Guide links use relevant Arena problems. The marking example now follows the published Mind the Gap derivation, and the product guide's feedback screenshot shows its real answer workspace. Guide dates and getting-started copy are updated. The unused quick-practice list and aggregate-stat component had no imports and are removed.

Legacy definitions remain unchanged for historical grading hashes and saved records. The legacy reader is retained only because actual room/progress compatibility harnesses and secret-exclusion tests still depend on it. It has no public route or discovery entry. No SQL, deletion, schema, ratings, grading definitions, authentication or permission change. All 18 Arena and 103 imported problems remain byte-identical.

## SEO consequences

Registry observation: 121 retained static problems, 18 Arena plus 103 archive. The two existing thin archive pages remain noindex, leaving 101 indexable archive pages. The sitemap contains 138 URLs. Derive counts from the model when it changes.

A permanent redirect to the noindex interactive Arena library intentionally retires each old search page. It does not promise an indexed replacement or transfer to an unrelated individual problem. Root stays indexable, dashboard stays noindex, and authored readers remain dynamic noindex/nofollow. Actual Google indexation, rankings and Search Console performance are UNKNOWN.

## Verification and review

Node22.23.1/pnpm10.34.9 frozen install, typegen/TypeScript, zero-warning lint and guarded production build pass. Build `lMY_nI8YqWQs1H358MJog` generates 170 total app pages, including the 121 retained problem readers.

- Focused SEO/registry/guide/copy/routing and unchanged grading snapshot: 202 pass. Render/guide/solved-selection: 14 pass.
- Focused grading/progress API and disposable PostgreSQL regression: 63 pass, no skips. Historical grading snapshot covers more than 1,500 answer variants without regeneration.
- Built HTTP audit: 2,782 pass, all 12 legacy paths with queries and trailing slashes, 121 retained reader statuses/canonicals/indexing/structured identities, discovery exclusions and 138 sitemap URLs.
- Retirement browser: 124 pass, 375/1440 both themes, Arena default, actual retained Guided reader, actual wrong/correct Arena checking, recovery, worked solution, next problem and discovery axe checks.
- Combined homepage browser: 168 pass. Real disposable A/B/guest HTML/RSC isolation, redirect boundaries and first-time journeys: 734 pass on the combined implementation, with a repeat on the final build recorded in the PR. Six guest tasks pass, including the original eight-tap account path. Two publication tasks require a separate signed-in fixture and are not claimed as tested here.
- Contrast/keyboard/structure/axe: 48 combinations, zero failures, minimum text 4.97:1 and border 3.79:1. Full GitHub CI runs on the exact final head.
- Independent source review found no privacy, identity or routing defect. Its guide-copy and image omissions were corrected before final verification. Final independent production-browser review is recorded on the PR. Retained dashboard topic/concept aliases use the existing shared tag filter and have focused regression coverage.

The broad historical live SEO script stops at the existing IPhO 2026 T1 source-label/visible-text mismatch. Native source data and reader are unchanged. This is recorded as an inherited concern, not a passing whole-site audit. The focused retirement audit verifies the unchanged structured resource identity and canonical on every retained reader. The broad older first-time script is updated away from retired fixtures but is not claimed as a full new acceptance run.

No Production operation or manual deployment. Local browser fixture APIs use loopback synthetic guest data, real local reader/checker/collection requests and disposable auth sessions only. Physical devices, Firefox/WebKit and live-provider qualification are unverified. Stop after these two draft PRs, no P3.
