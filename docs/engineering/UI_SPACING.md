# UI spacing

Use the existing quarter-rem spacing scale. Pixel references assume the browser default root size of 16px. Keep that default: enlarge heading roles individually rather than scaling the entire interface.

| Relationship | Default | Tailwind |
| --- | --- | --- |
| Icon to label | 8px / 0.5rem | gap-2 |
| Small section label to content title | 12px / 0.75rem | gap-[var(--space-label-title)] |
| Title to description | 12px / 0.75rem | gap-3 |
| Related content groups | 16px / 1rem | gap-4 |
| Card edge to content | 24px / 1.5rem | p-6 |
| Separate page sections | 32px / 2rem | gap-8 |

These are defaults for future changes, not a claim that every existing component already follows them. Keep related content closer than separate sections. Do not add a decorative label merely to use this pattern.

## Label to title

The shared CSS token `--space-label-title` is defined in `app/globals.css` as `0.75rem`. Use it when a small section label sits above its main content title.

The Lobby recommendation card applies `pb-[var(--space-label-title)]` to its header. The content has zero top padding, so the gap from the For You label's line box to the problem title's line box is exactly one token, 12px at the default root size. Glyph shapes may make the visible whitespace appear slightly different.

When label and title share a wrapper, use `flex flex-col gap-[var(--space-label-title)]`. When separate header/content wrappers are needed, apply the spacing on one side only. Do not combine header bottom padding and content top padding for the same gap.

The top-right rating is positioned independently and must not increase the label-to-title gap. This token changes spacing only; it does not change typography or the card's outer padding.

## Lobby typography

| Role | Size | Weight | Classes |
| --- | --- | --- | --- |
| Lobby page title | 36px, 48px from sm | 600 | text-4xl sm:text-5xl font-semibold |
| Card and section headings, including For You | 20px | 600 | text-xl font-semibold |
| Problem and contest titles | 24px | 600 | text-2xl font-semibold |
| Topic navigation labels | 18px | 600 | text-lg font-semibold |
| Descriptions and secondary metadata | 14px | regular | text-sm |

Apply sizes by role. Font weight alone does not make small text a sufficiently clear heading. Keep body text, button targets and layout scale independent of heading adjustments.
