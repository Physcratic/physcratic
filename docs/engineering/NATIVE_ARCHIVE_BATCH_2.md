# Native olympiad archive conversion, batch 2

## Scope

Continues draft PR [#178](https://github.com/Physcratic/physcratic/pull/178) from first-batch head `3ed4b1857efb77a6ccda4d6591aa4a2211c1a34e`, with main still at `bcc132eb44b01d67402910015972b594b08810c2`. Adds EuPhO 2019 T1 Ice pellets, T2 Motion of a charged ball, T3 Water hose and APhO 2012 T3 Pancharatnam Phase. These four canonical records keep their IDs, titles, ratings, source links and original PDFs. Their shared EuPhO PDFs are split at the actual question and solution boundaries.

The first five native conversions match the reviewed first-batch head. Other 103 imported records match main. Total remains 112 records, now 12 native including the three pre-existing IPhO 2026 records, with **100 PDF records remaining**. This is not a whole-archive conversion. The dated [first-batch report](NATIVE_ARCHIVE_BATCH_1.md) describes its earlier five-problem scope.

## Source review

All 11 original source pages were rendered and compared. Ten original diagram crops were visually inspected, with corrected crop boundaries to preserve axes, labels and the full Poincare sphere. [Source hashes and document disposition](native-archive-batch-2-sources.json), [figure coordinates and hashes](native-archive-batch-2-figures.json), and [the full archive inventory](native-archive-inventory.json) are committed. Original PDFs remain available beside each native document. Independent human physics review remains pending.

Regenerate all nine conversions with `node --conditions=react-server --import tsx scripts/build-native-olympiads.ts`. The two batch source ledgers remain separate. The script preserves the other records and updates canonical JSON, the collection, public answer metadata and asset checksums.

## Answer conventions

The new four problems add 13 automatic scalar checks and eight self-review fields. Together with batch 1 this is 32 automatic checks and ten self-review fields across nine problems. Reuse the existing stateless checker. No account progress, marks or ELO is saved.

- Ice pellets: frozen fraction is entered from 0 to 1. Both official temperature estimates, 7.9 degrees Celsius with thermal lag and 8.0 with the dissipation estimate, fit the explicit 0.15 degree tolerance. Workings should state the approximation.
- Charged ball: scalar radius and angular speed use positive Q for charge magnitude. The qualitative description and circulation direction are self-review. Rolling angular speed is distinguished from the centre path angular speed.
- Water hose: graph-derived speed accepts 0.3 m/s reading uncertainty. The graphical construction and both alternative envelope proofs are retained, with a clarification of instantaneous-stream tangency at the interior maximum.
- Pancharatnam: preserve and annotate the sign inconsistencies in printed intermediate sine expansions. Final time-averaged intensities are unchanged. Positive-amplitude phase and positive-area fields explicitly use the nonzero branch 0<gamma<pi/2 or 0<alpha<pi/2. Vector fields, polarization descriptions and the sphere construction remain self-review. The original full parameter range stays in the statement.

## Validation

Focused regression passes 70/70, including source LaTeX, immutable existing grading snapshots and new physical negative cases. Independent numerical checks integrate charge forces over the sphere volume, time-average vector electric fields, evaluate the spherical-triangle solid angle and recompute thermal and plot estimates. TypeScript and changed-file zero-warning lint pass. Expanded browser coverage passes 329 checks across all nine problems at two widths and in two themes, including keyboard submission, retained automatic and self-review drafts, zero persistence POSTs, no horizontal overflow and zero serious or critical axe findings. Exact-head full CI outcomes are recorded in #178. Browser authentication uses synthetic identities, not live account/provider claims. The browser harness defaults to a verified fixture. Run it again with `NATIVE_BROWSER_SESSION=guest` for guest submission coverage. Actual per-role outcomes belong to #178.

## Remaining work

Continue the 100 PDF records in source-reviewed batches. Preserve all subparts, numerical data, diagrams and alternative solutions. Determine answer tolerances and phase/sign conventions from each original solution. Keep qualitative work visibly distinct from automatic scalar checks. Saved progress needs its own explicit catalogue and verification. Coordinate the metadata-generator and count assertions with open beginner Arena PR #175 if it lands first. No source text or historical migration should be replaced with an unverified automated extraction.
