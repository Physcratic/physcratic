# Arena card UI spec

## Status
| Phase | PR | State |
| 1 Layout | #193 | merged |
| 2 Colour | #196 | merged |
| 3 Like (favourite) | #197 | merged |
| 4 Polish | see BETA_READINESS | in review |

## Decisions
- Accent is the existing primary token. No new accent colour.
- Single column list. Grid is a later optional phase.
- Liked state uses the accent, not red. Red means danger, green means success, everywhere.
- Band colours: Beginner teal, Intermediate blue, Advanced violet, Mastery amber. Confirmed by the owner on 17 November 2026, after #195 had made Beginner green and Mastery red: the spec palette supersedes #195, and no band is red or green.
- ProblemCard is shared. Callers: arena-collection.tsx, unified-arena-collection.tsx, corpus-collection.tsx, olympiad-problem-card.tsx. Check all of them every phase.

## Layout rules
- Gaps from one scale only: 4, 8, 16, 24, 32.
- Label closer to its own field than to the one above. More space between groups than within a group.
- One alignment edge. No mixed centering.
- Card padding 16px or more.
- Nested corner radius = outer radius minus padding, never below 0.
- Tap targets at least 44x44. No hover-only actions.
- Exactly one real link or button opens the problem, with accessible name "Open problem: source, reference, title". The tag filters, attribution links and the favourite control are the only other controls, and they sit above the stretched layer.
- Keep href plus onOpen behaviour (plain left click calls onOpen, modified clicks fall through).
- Motion is only a 2px lift and a border colour change, 150ms, and only for a device that can hover and a person who has not asked for less motion. Keyboard focus never depends on hover. Long words wrap inside the card and nothing scrolls sideways at 375px.
- The rating block is plain text with the word "Rating" read before the number. It is not a labelled group.
- A loading card is the skeleton, built from the card's own layout classes. A loading or refreshing statistic never changes the height of the footer.
- An empty list is one plain line and a Clear filters button, on the same left edge as the heading above it.

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
- Owner decision, 17 November 2026: Option A. The spec palette supersedes the green Beginner and red Mastery of #195. Its `elo-mastery` token and variant are removed, its guard test in `lib/rating-bands.test.ts` now asserts the `band-*` variants, and no band reads an `elo-*` variant. Surfaces that read `RatingBand.variant` or the band id: the problem card (library, archive and guided lists), the problem heading badge, the Problem Studio difficulty field and the dashboard highlight. The rating popover and the library filter show band names as plain text.

### Phase 3 Like
- ProblemCard takes optional `likeCount`, `liked`, `onToggleLike`, `likeAccess` (ready, signed-out, unverified), `likeBusy`, `likeStatus` and `likeError`. With none of them the markup is unchanged, so corpus, olympiad and archive cards pass nothing. Only the unified Arena collection passes them, and only inside `ProblemStatsBatch`, which mounts when `COMMUNITY_PROBLEM_STATS_ENABLED` is `true`.
- Footer DOM order is Open problem, then the favourite control (count, then toggle), then tags. On desktop the toggle sits 16px right of Open (phase 4b removed the reversal). The word stays "Favourite" and "Favourited", with `aria-pressed` and the title as its description. Guests get "Sign in to favourite", unverified accounts a disabled toggle and "Verify your email to save favourites.".
- `useProblemFavourite(key)` in `components/community/problem-stats.tsx` reuses the existing fetch and `save()`. The change shows at once and is dropped if the write fails. 429 shows "Too many requests. Try again in a minute.", and the 409 account change keeps its message. While a write is in flight the toggle uses `aria-disabled` so focus stays on it. Pure logic is in `lib/favourite-toggle.ts`.
- Heart: neutral outline, then filled with `--primary` and a `--foreground` outline. The primary fill alone is 1.82:1 to 2.00:1 on a light card, under 3:1, so the outline carries the shape there (14.83:1 or more). Dark fill is 7.72:1 or more. The fill fades over 200ms and not at all under reduced motion.
- Total verified solves moved from the old control to a plain text line in the attribution slot, unchanged. Files: `components/physics/problem-card.tsx`, `components/physics/unified-arena-collection.tsx`, `components/community/problem-stats.tsx`, `lib/favourite-toggle.ts` and its test, `tests/problem-card.test.ts`, the two docs.
- Open: no solved or attempted marker yet. Corpus, olympiad and archive keys are not allowed in `community_favourite`, so those cards would need a schema change and owner approval.

### Phase 4 Polish
- Hover lifts the card 2px and strengthens its border (foreground at 70%, which is darker than the resting border in both themes, where the old 40% was lighter on a light card). The hover is read on a wrapper (`.problem-entry-lift`) that never moves, so a pointer parked on the card's lower edge does not flicker. No lift on touch, and none under reduced motion. Keyboard focus outlines the whole card in the foreground colour (14.8:1 light, 14.0:1 dark), because the shared button ring is 2.64:1 against the page in light.
- `ProblemCardSkeleton` and `ProblemCardSkeletonList` share the card's layout classes and replace the loading lines in the Arena collection. The like slot keeps the height of the toggle while statistics load, and a refresh after a change is announced but takes no room. Edge cases fixed: a long unbroken word in a title or description was clipped inside the card at 768px and below, and now wraps. Russian titles, 11 tags, no description, unrated cards and cards with and without the like control all fit at 375, 390, 768 and 1440.
- The empty state in the shared collection is one line (`emptyMessage`) and the button. The rating block no longer has `role="group"` and an `aria-label`, which read twice. `data-rating-block` marks it for tests, and its hover tooltip (band name and range) is gone, since touch and keyboard users never saw it.
- Removed: the `--elo-foundation`, `--elo-intermediate` and `--elo-advanced` tokens and badge variants, `eloBands` and `getEloBand`, and the unused `ipho`, `apho` and `eupho` badge variants. A grep found no user outside tests. `legacyRanges` stays in `lib/rating-bands.ts` because old filter links still use those ids.
- Files: `app/globals.css`, `components/physics/problem-card.tsx`, `problem-collection.tsx`, `arena-collection.tsx`, `corpus-collection.tsx`, `olympiad-catalog.tsx`, `unified-arena-collection.tsx`, `components/ui/badge.tsx`, `lib/problem-archive.ts`, three tests in `lib/`, `tests/problem-card.test.ts`, `tests/library-tags.browser.mjs`, the two docs. No file pinned by an activation or runtime-role manifest changed.
- Open: the shared `--ring` token is 2.64:1 on a light page, so every button in light has a focus ring under 3:1. The card has its own outline now, other screens do not. `.contest-motif` and `.hero-image` in `globals.css` have no user, but they are not from the card work. The statistics allowlist problem from phase 3 is unchanged and still needs a migration.

### Phase 4b Follow-ups
- The desktop footer is no longer reversed. Open problem, the favourite control and the tags are in DOM order and in visual order from the left edge, so Tab runs left to right. Mobile stays stacked.
- `ProblemCardSkeleton` matches a real card height at 375 and 1440 (attribution line, 22.75px description lines, three tags). `ProblemCardSkeletonList` is `role="status"` without `aria-busy`.
- The base `.problem-entry` rule is gone because the Card utilities set the same values. `data-competition` stays because `tests/archive.browser.mjs` reads it.
- The light `--ring` is 22 65% 48% (3.52:1 on the page, 3.88:1 on the card). The card keeps its own foreground outline. The shared ring open item from phase 4 is closed.
- Files: `app/globals.css`, `components/physics/problem-card.tsx`, `lib/rating-band-colours.test.ts`, `tests/problem-card.test.ts`, three docs. No file pinned by an activation or runtime-role manifest changed.

### Phase 5 Card image (C2)
- `ProblemCard` takes an optional `image` ({src, alt, width, height}). With none, the markup is identical. Only the two Arena callers pass it (`unified-arena-collection.tsx` for Arena entries, `arena-collection.tsx`). Corpus, olympiad and archive callers pass nothing.
- Frame: 120px high on a phone and 160px from 640px (width 176px, 240px from 1024px), `rounded-lg` (the card radius token) with 8px padding, white ground because the figures are drawn on white, `object-contain`. The picture's own corners are the token minus the 8px padding, 4px. Strictly, a frame inset 16px or 24px from the card edge would have a nested radius of 0, so the rule is applied inside the frame.
- Placement: DOM order is text, then picture, then footer, so below 640px it sits between the title block and the footer. From 640px the content row is `sm:flex-row` and the picture is on the right. The stretched link still covers the picture, so a press opens the problem. No new control, no tab stop.
- Data: `scripts/build-arena.ts` takes the first statement figure, measures it with sharp and adds `image` to `lib/arena/index.json`. Short alt text is in `lib/arena/card-images.ts`. `lib/arena-card-images.test.ts` guards that no path is a solution image, every file exists with the stored size, and alt is short and not a file name.
- Open: the loading skeleton has no picture slot, so a card with a figure is taller than its skeleton, by 38px on desktop and 136px on a phone in the cards measured (the 11 problems without a figure are unchanged). Community cards have no image, since their media route is `private, no-store` and serves full-size originals.

