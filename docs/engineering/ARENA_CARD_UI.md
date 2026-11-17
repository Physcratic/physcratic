# Arena card UI spec

## Status
| Phase | PR | State |
| 1 Layout | #193 | merged |
| 2 Colour | #196 | in review |
| 3 Like and status | none | not started |
| 4 Polish | none | not started |

## Decisions
- Accent is the existing primary token. No new accent colour.
- Single column list. Grid is a later optional phase.
- Liked state uses the accent, not red. Red means danger, green means success, everywhere.
- Band colours: Beginner teal, Intermediate blue, Advanced violet, Mastery amber.
- ProblemCard is shared. Callers: arena-collection.tsx, unified-arena-collection.tsx, corpus-collection.tsx, olympiad-problem-card.tsx. Check all of them every phase.

## Layout rules
- Gaps from one scale only: 4, 8, 16, 24, 32.
- Label closer to its own field than to the one above. More space between groups than within a group.
- One alignment edge. No mixed centering.
- Card padding 16px or more.
- Nested corner radius = outer radius minus padding, never below 0.
- Tap targets at least 44x44. No hover-only actions.
- Exactly one real link or button per card, with accessible name "Open problem: source, reference, title".
- Keep href plus onOpen behaviour (plain left click calls onOpen, modified clicks fall through).

## Colour rules
- One accent, for the main action only. Other buttons neutral.
- Text contrast 4.5:1 minimum, including on tints. Control borders 3:1.
- Never rely on colour alone. Band name stays visible as text.
- Soft tints for large areas, strong colour only for small details.
- Colours are theme tokens or CSS variables for dark and light. No hex inside components.

## Copy rules
No em dashes, en dashes or semicolons. No banned words from CONTRIBUTING.md. Spelling: medallist, practise, honourable mention.

## Verify ladder
1. Focused unit test for any logic touched.
2. Typecheck.
3. Lint.
4. SWEEP=1 node tests/solve-contrast.browser.mjs (signed in and guest).
5. Screenshots, once, maximum 8, at 375 and 1440, dark and light. One per caller page.
6. Push and let GitHub CI run the full build and browser suites.

## Handoff notes
(Each phase appends 3 to 6 lines here: what changed, files, open issues.)

### Phase 1 Layout
- Rating block on the left (number with tabular numerals, band name under it, "Unrated" and the language when there is no rating), on top below 640px. Source, reference and host flag are one quiet line above a `text-xl` title. Footer row has the tags on the left and the filled primary "Open problem" on the right, and stacks below 640px.
- One stretched link or button makes the whole card the tap surface. Tag filter buttons and a caller's attribution links sit above it (`relative z-10`), the rest falls through to open.
- Files: `components/physics/problem-card.tsx`, `tests/problem-card.test.ts`, `docs/engineering/ARENA_CARD_UI.md`, `docs/engineering/BETA_READINESS.md`.
- Open for phase 2: band colour on the rating block and the card border (the old `data-level` styling still applies), the footer tint and the competition colour on the source. The unused `competitionVariants` map is kept only for the `competition` prop type.
- Open: `arena-collection.tsx` is not mounted by any page. `.problem-entry-details` keeps its old rule and tint and `.problem-entry-header` has no element any more.

### Phase 2 Colour
- Four band colours as tokens `--band-beginner|intermediate|advanced|mastery` in `app/globals.css` (teal, blue, violet, amber, light and dark) and the badge variants `band-*`. `RatingBand.variant` names them and no band shares one. The old `elo-*` tokens and variants stay for the legacy `eloBands`.
- Rating block: 10% tint, a 4px stripe (top edge, left from 640px) and the band colour on the number and label only. The card border, competition names and tags are neutral. An active tag filter has the primary fill with the strong foreground border (a primary border alone is 1.82:1 on a light card, under the 3:1 rule), and the filled "Open problem" button is the only accent at rest.
- Lowest contrast is 5.45:1 for text and 7.15:1 for the stripe, in both themes. `lib/rating-band-colours.test.ts` guards this from the real tokens.
- Files: `app/globals.css`, `components/ui/badge.tsx`, `components/physics/problem-card.tsx`, `lib/rating-bands.ts`, `lib/rating-band-colours.test.ts`, `tests/problem-card.test.ts`, the two docs.
- Open: the footer tint (`.problem-entry-details`) is still the old neutral secondary tint. `ipho`, `apho` and `eupho` badge variants are neutral and now unused. Other badges that show a band changed colour as a side effect: Studio difficulty field, problem heading and dashboard highlight.

