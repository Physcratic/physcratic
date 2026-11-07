# Overnight batch N1

Unattended run on the evening of 4 November 2026. Scope: the site name dot, an every-page sweep, a copy sweep, small UI bugs. Nothing touched the never-touch list. No deploy, purchase, plan, real database, `.env` file, PR or force-push.

## Result in one line

The sweep went from 359 distinct failures to 32. Thirty-one are in the coaching pages (inline text links under 44px and card borders at 1.47:1), which are left to the coaching owner. The last one, an equation region at 390px, was fixed in `d66bdf2` after the final sweep and has not been swept again.

## What was fixed, per commit

| Commit | What |
| --- | --- |
| `a767356` | The contrast script is now the sweep. `SWEEP=1` adds 18 routes and states (27 pages and states in all) and the widths 375, 390, 768 and 1440. It checks one h1, heading order, sideways scroll, 44px targets, visible focus, the site name dot and axe (serious and critical). |
| `dcbd805` | Plain copy for the error pages, the 404 page, the submissions subtitle and the Learn call to action. "practice" as a verb is now "practise". |
| `df319ff` | A semicolon removed from the expression syntax help. |
| `0e7f24f` | Button, Input, SelectTrigger and Toggle are 44px (they were 36 to 40px). |
| `b842656` | Sign-in, sign-up and the archive problem page get an h1. Alert titles that rendered as h5 carry their real level. The Arena cards have an h2 so (a) and (b) are h3. Two labelled divs got a role. A wide equation becomes a focusable, labelled region only when it scrolls. Terms links, source links and disclosure summaries are 44px. |
| `0e96a7d` | Dark `--border` and `--input` raised from 1.3:1 and 1.5:1 to 3.4:1 or better, the same values the solving screens used. |
| `4b6b8ff`, `5efa4b7` | Coaching country labels and medal chips. The first attempt used a theme token that turned dark in light mode (1.2:1), the second uses a fixed light grey. Both are in history on purpose. |
| `c07b9c3` | 44px top bars (logo, Workspace breadcrumb, Coaching, Search), the Terms link and agreement label on the sign-in pages, View rankings, Official solution PDF, the settings header links. |
| `ebe84ba` | Learn breadcrumb, profile not-found link, archive source link, coaching icon buttons, gallery toggle, header button, logo link and mobile menu links. |
| `ebc552c`, `d66bdf2` | Two checker corrections (transparent PDF text layers, text links judged by height) and the exact overflow condition for focusable equations. |

## 1. The site name dot

No dot after "Physcratic" exists as punctuation anywhere I could check:

- Source: `lib/site.ts`, the title template (`%s | Physcratic`), `app/manifest.ts`, the OG image routes, the JSON-LD names and every wordmark element have none. The only "Physcratic." matches are sentence endings in prose and in `lib/coaching/content.ts`.
- Computed styles: the sweep reads the `::before` and `::after` content of every element on every page, and checks any element whose whole text is "Physcratic." No hits in 27 pages and states, 4 widths, 2 themes.
- Images: the root OG image was fetched from the local build and looked at. `public/` has no text in its SVGs. The dot inside the logo mark is part of the mark.

The check stays in the sweep.

## 2. Every-page sweep

Routes covered: Learn hub and 3 guides, terms, sign-in, sign-up, settings, lobby, rankings, learning guide view, library (topic chosen), practice problem (4 states), Arena (statement with feedback, worked solution), archive reader, Guided reader, contests (with `/api/dashboard` and a signed-out session mocked), coaching, consultation, become a tutor, three 404 pages, and the authored student page on the throwaway PostgreSQL. 4 widths, light and dark.

Method: a production build from a clean worktree, served against the throwaway PostgreSQL (postgres user, loopback only). The Better Auth tables were created there by hand from `lib/db/schema.ts`, because the app refuses to render sign-in without them. The authored problem was published through the real API by the Studio harness.

Final lowest values: text 4.64:1 light and 4.89:1 dark. Borders outside coaching are 3:1 or better in both themes.

## 3. Copy sweep

All 1,179 multi-word strings in `app/` and `components/` (coaching and tests excluded) were read through the copy-rules extractor, including empty, loading, error and 404 states. The rules test already passes for dashes, banned words and the listed spellings. Changed: the error pages, the 404 page, one slogan, one call to action, two spellings, one semicolon. Left alone: the four reviewed guides and `lib/coaching/content.ts`.

## 4. Small bugs fixed

"1 problems on this page" (earlier, C5). Nothing else found that was clearly a bug and safe to fix.

## Skipped, and why

- **Coaching inline text links and card borders.** Under 44px (See all, Instagram, header nav at 1440) and 1.47:1 (cards, menu, FAQ). The coaching page has its own palette and spacing, owned by the v0 coaching work. I made size bumps that do not move the layout and a colour fix. A card border at 3:1 is a visible design change, so it needs the owner. One axe `color-contrast` hit on the coaching hero text sits over a photo and cannot be measured by element.
- **Pages that need a signed-in session:** Problem Studio, the draft list, submissions, admin pages and public profiles. They redirect or are flag-gated. The Studio and authored student suites run axe, overflow and tab checks on the real components, but not at 390 and 768 or in dark.
- **Community copy** (`components/community/**`). It is technical ("Upload needs reconciliation", "request reference") but plain. Codex is working there.
- **One semicolon** in `components/community/verification-settings.tsx` ("Five upload attempts per UTC day; 20 total..."). Same area, left for Codex.

## Needs the owner or Codex

1. **Dark borders are now 3:1 everywhere.** It matches the solving screens, but the whole dark theme looks firmer. Please look at it once on a phone.
2. **Buttons, inputs and selects are 44px everywhere.** Desktop toolbars are a little taller.
3. **Coaching:** decide whether card borders and inline links should meet the 3:1 and 44px rules, or be exempt as decorative and inline.
4. **`lib/copy-scan.ts`:** `PROSE_SEMICOLON` only matches a semicolon followed by a letter, so `; 20` and `; ^` slip through. Not edited (outside this batch's paths).
5. **Codex PRs #121 and #122:** nothing here touches `lib/security/**`, `next.config.ts` or the moderation and medal routes, so no conflicts are expected. `components/ui/button.tsx` and `input.tsx` changed.

## Screenshots

`/tmp/claude-0/-home-user-physcratic/e2f71d02-1835-5abd-a0a1-5a697b1c0cf0/scratchpad/n1-shots/` holds 36 files: sign-in, sign-up, settings, lobby, terms, 404, a Learn guide, the authored student page and coaching, each at 375 and 1440 in light and dark (for example `sign-in-375-dark.png`).
