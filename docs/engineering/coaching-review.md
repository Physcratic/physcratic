# Coaching Phase 4 review

A read-only review of the coaching pages: `main` (commit `2fc7740`) plus the Coaching Phase 3 branch (`claude/coaching-phase-3-seo`, PR #73, head `1717285`). It was run on a local `pnpm build` and `next start` of that combination, with Playwright in a real Chromium. No database, Vercel, Neon, auth or Blob setting was touched, and no Tally form was submitted.

Pages covered: `/coaching`, `/coaching/consultation`, `/coaching/become-a-tutor`.

## Result at a glance

| Check | Result |
| --- | --- |
| Every consultation and tutor button builds the right Tally URL, with pathway and source | Pass |
| The copy in `content.ts` is what renders | Pass (3 labels are state-dependent, see below) |
| The copy rules hold on every coaching page | Pass |
| 19 coaches, 12 countries, the flags and the photos | Pass |
| Mobile layout at 375 | Pass, with recommendations |
| Analytics events fire on click | Fixed one gap (middle-click), then pass |

## 1. Tally URLs

Forms: consultation `https://tally.so/r/XxZBr4`, tutor `https://tally.so/r/MeodDX`.

- **Hero button, all five pathways:** each opens `XxZBr4?pathway=<pathway>&source=direct` with the pathway encoded (`Olympiad Beginner`, `Olympiad Intermediate`, `Olympiad Advanced`, `IB or A-Level`, `Not sure yet`).
- **"Ask about this program" (4 links):** each goes to `/coaching?goal=<pathway>#hero-cta`, preselects the matching pathway, and the hero button then opens the right URL.
- **`/coaching/consultation`:** `XxZBr4?pathway=Not sure yet&source=direct`. **`/coaching/become-a-tutor`:** `MeodDX?source=direct`, with no pathway.
- **Source:** `?utm_source=newsletter` gives `source=newsletter` (also checked with `instagram` on both form pages), a Google referrer gives `source=google.com`, a referrer on `physcratic.com` counts as `direct`, and no referrer is `direct`.
- **Safety:** every link opens in a new tab with `rel="noopener noreferrer"`.
- **No stray forms:** on all three pages every `tally.so` link is one of the two forms above.
- **Behaviour to know:** until a pathway is chosen the hero button has no `href` and is `aria-disabled`. The "Get a consultation", "Ask for your local price" and "Start step 1" buttons only scroll to that picker, so reaching Tally from them takes two clicks. That is by design.

## 2. Copy matches what renders

- 254 user-visible strings from `lib/coaching/content.ts` (not counting the metadata and the SEO fields) were looked up in the rendered text and attributes of the three pages at 375 and 1440. All are present except three that only appear after an interaction, which is expected: `hero.slideshowPlay` and `coaches.play` (shown after pausing) and `coaches.backToSlider` (shown after "See all").
- The `<title>` and meta description of all three pages equal the strings in `content.ts` (the root template adds " | Physcratic").

## 3. Copy rules

Every text node, title, description, `og:title` and `aria-label`, `alt` and `title` attribute on the three pages at both widths was run through `findCopyProblems` (no em dash, no en dash, no semicolon, banned phrases). There are no problems. Script and style bodies were excluded, because the JSON-LD and Next's data legitimately contain semicolons.

- **British spelling:** no "medalist", "honorable" or verb "practice".
- **"Tutor":** on `/coaching` it appears only in the verbatim student quote, the "Tutor with Physcratic" footer link and the FAQ link. On the other two pages it appears only in the tutor page copy, as agreed.
- **"one-to-one":** only in the FAQ question "Can I get one-to-one classes?".

## 4. Roster

- 19 coach cards and 12 distinct countries (India, Indonesia, Mongolia, Philippines, Iran, Peru, Japan, Kyrgyzstan, Pakistan, Saudi Arabia, Portugal, Costa Rica), and the page says "19 coaches" and "12 countries" in the hero, the stats and the intro text.
- Every card has a flag that loads. Each flag file matches its country's ISO code (`in`, `id`, `mn`, `ph`, `ir`, `pe`, `jp`, `kg`, `pk`, `sa`, `pt`, `cr`), and I looked at all 12 flag images: they are the right flags.
- Every card has a photo that loads or the silhouette. The silhouette is used for exactly Nima, Yota and Ignat.
- Photo alt text reads "<name>, physics coach from <country>", ids are unique (`coach-<slug>`) and every card has at least one medal chip. Honourable mentions (Mohammed's APhO 2026, Santiago's IPhO 2026) show as "Honourable Mention".

## 5. Mobile layout at 375

- No horizontal scroll on any of the three pages, and nothing sticks out past the viewport. The header is one line (65px).
- The hero, chips, program ladder, packages, steps and FAQ wrap cleanly. The rendered screenshots show no clipping.
- **Text under 12px:** only the scheduling chart's hour labels (11px), in an `aria-hidden` visual.
- **Tap targets under 44px** (all pass the WCAG 2.2 AA minimum of 24px, or its spacing exception, but are below the 44px guideline):
  - FAQ questions: 28px high. **Fixed in this PR** (see below): the rows are now 84px high.
  - Footer links (17 to 20px), "Back to coaching" (20px), "See all 19 coaches" under the hero slideshow (20px) and "See all guides" (20px).
  - The slideshow pause button and the gallery arrows (40px).
- **Observation:** the fixed "Get a consultation" bar is always visible at 375. Next to "Ask for your local price" it shows two orange full-width buttons at once, and it covers about 64px of content (48px high plus a 16px margin). Whether to hide it while a section's own call to action is on screen is a design decision.

## 6. Analytics events

With Vercel Analytics initialised, the hero button and the consultation page send `coaching_consultation_click` with the pathway chosen (`IB or A-Level`, `Not sure yet`), and the tutor page sends `coaching_tutor_click`. The disabled hero button sends nothing.

- Left click, keyboard Enter and ctrl+click each send one event.
- **Gap found and fixed in PR #73 (`1717285`):** a middle-click (which opens the form in a new tab) sent no event, because browsers send `auxclick` instead of `click`. Both links now handle it.
- Not checked: that the events appear in the Vercel Analytics dashboard. They were read from the page's analytics queue.

## Fix in this PR

- `components/coaching/coaching-faq.tsx`: the vertical padding moved from the `<details>` wrapper to the `<summary>`, so the whole row is the tap target (28px to 84px). The closed row is the same height as before (85px). Tapping the top or bottom edge of a row on a touch screen opens and closes it, and Enter still works.

## Recommendations (not done)

1. ~~Make the footer links 44px tall.~~ **Fixed in batch C4:** every footer link and the Instagram link is at least 44px tall on touch screens (`pointer: coarse`), and the desktop footer is unchanged. Still open: "Back to coaching" (20px) and the two "See all" links (20px).
2. ~~Hide the fixed mobile bar while a call to action is visible.~~ **Fixed in batch C4:** the bar hides while the hero's call to action or the footer is on screen, and the footer keeps 4rem (the bar plus its margin) of room at the bottom on small screens.
3. Raise the 40px slideshow and gallery buttons to 44px.
4. `/dashboard` already scrolls sideways by 12px at 375: the right-hand group of the top bar ends at 387px (`components/kokonutui/top-nav.tsx`, outside the coaching area).

## Not covered

Real form submissions in Tally, screen reader testing, Safari and Firefox, the analytics dashboard, and slow or offline connections.
