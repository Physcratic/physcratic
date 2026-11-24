## Quiet colour on the problem pages, U6c (24 November 2026)

The solve page, the Arena page and the Progress page now keep colour for state only: green for success, red for wrong and peach for the main action. Parts are told apart by their bold letter and their order. `PartChip` is a neutral badge (idle tint, 1px border token, foreground text). Answer cards are the plain card with a thin border. The next empty part gets a 2px ring token outline, nothing else. A correct part shows its "Correct" line with a small success tint behind its icon and word only. The invalid field now uses the same danger ink as "Not correct." The parts bar is outlined neutral segments that fill with the success colour. The Solved note is the one green area. The check summary box is plain with an icon in the state's ink. Arena statement parts lose their coloured stripes. Progress card headers stay on the plain card with an icon in its ink and the coloured count badge, and the summary is tinted only when solved is above 0.

Measured on 10 states at 390 and 1280, light and dark, with the real components, the coloured area of the first screen fell from up to 51 percent to under 10 percent, and no state shows more than 2 non-neutral hue families. No text pair is under 4.5:1. `partToken`, `partTokenClasses`, `partTokenNames` and the part colour tokens in `app/globals.css` are kept but unused by app code. `partStyle` is a no-op and `partBorder` is empty, kept so the authored and Studio callers compile unchanged. The guest contrast sweep was not run here and is an owner check.

## Solve page leftovers, U10 (23 November 2026)

A 429 on a pending save now honours Retry-After. When the header is a positive number of seconds, the next retry timer waits the longer of the policy delay and Retry-After, capped at 120 seconds. A missing, zero, negative or non-numeric header changes nothing. `parseRetryAfter` and the optional `takeRetryAfter` host hook are in `lib/pending-save-retry.ts`. The panel reads the header from the save response before the body. The idempotency key, one attempt in flight, the 5 timer attempts and the no timer retry of a rejected save are unchanged.

Clear answers in the answer panel now also forgets which parts were correct, so a part is correct again only after a new check and the Solved note goes. `tests/practice-progress.browser.mjs` has the check, and it failed before the fix. The native archive browser test now waits for finite animations to end before axe (an endless spinner would never finish), because the Solved note fade from U6b made it read a half blended colour once in CI. Nothing else changed. The guest contrast sweep was not run here.

## Colour on the solve page, U6b (23 November 2026)

The solve page now uses the part tokens from U6a. Part a is teal, b violet, c amber and d blue, then they repeat. A part keeps its colour in its chip, its left stripe and its bar segment. `partStyle` in `solve-ui.tsx` reads the token variables, so both themes follow the CSS and no hex is left in components. The old six hue `partPalette`, `partColor` and their contrast test are removed from `lib/part-colors.ts`. Their only user was `solve-ui.tsx`. `assignPartColors` now repeats after four parents. `tailwind.config.js` scans `lib/part-colors.ts` so the token class names are generated.

New in `components/physics/part-progress.tsx`: a segmented bar at the top of the answer area (one segment per graded part, filled when correct, accessible text such as "2 of 3 parts correct", left out for a single part) and a calm "Solved" note shown only on the change to solved during the session. It fades in only under `motion-safe`. A part counts as correct while its answer is the one a check marked correct. The cards, the bar and the note all read that, so a correct part keeps its green tint, check icon and "Correct" while other parts are edited. The first empty part gets its own colour as a tint, with no scroll and no focus change. `FeedbackBox` and `ResultLine` now use the success and danger tokens. The progress page summary is grey with a dashed icon at zero and green once something is solved. Grading, retry, the maths pad, messages and wording are unchanged. The guest contrast sweep was not run here and is an owner check.

## Colour tokens and the Progress page, U6a (23 November 2026)

New colour tokens in `app/globals.css`, light and dark, mapped in `tailwind.config.js`. Success green (#1F7A4D), progress peach (#F2A47A), danger red (#B3261E) and idle grey (#5E584F) each have a strong, tint, ink and foreground value. Four part colours (teal #0F766E, violet #6D4BD0, amber #8A4B00, blue #1D5FB8) follow the same model. `partToken(index)` in `lib/part-colors.ts` picks a part colour by position, a to d and then repeating. It holds no grading logic.

Only the peach text colour was darkened to reach 4.5:1 on its tint, to hsl(21 70% 39.5%). The strong peach stays as drawn and carries dark text. Dark theme values are lighter versions of the same hues. `lib/colour-tokens.test.ts` reads the CSS and checks every text and background pair at 4.5:1 or more.

The Progress page now opens with the solved count, then three cards with a tinted header, an icon, the title in text and a coloured count badge. Green is solved, peach is in progress and grey is not graded. Status is always an icon and words. `components/physics/progress-summary.tsx` holds the pieces. Data, queries and links are unchanged. The solve page, Studio, sign-up and grading are untouched (U6b and U7). The guest contrast sweep was not run here and is an owner check.

# Execution roadmap

## Sleds problem character renamed, U5b (23 November 2026)

In `arena-two-sleds-one-rope` the character Ayu is now Jeff, with He and his in place of She and her. This is the statement (3 places), the solution (1) and one part b hint (1). The text is edited in `lib/arena/source-07.ts` and the three generated files come from `pnpm run build:arena`: the problem JSON, `lib/arena/index.json` (the hint) and the grading JSON. Nothing else changed.

This problem's version changed from `dd2c20fc32e8` to `ec6287202d3e` (first 12 characters), because the version is a hash of the whole problem seed, text included. For signed-in users, saved checks for this one problem stop counting toward its progress, since progress matches on problem id and version with no old-version merge. Their attempts stay stored. A check pending from before the change is refused once with the existing "problem or answer key has changed" message, and the answer fields refresh. Solved markers kept in the browser are keyed by problem id and are not affected. The owner approved this change. No migration, schema, auth, grading, flag, Vercel, Neon or environment change.

## Checkbox corners, U4b (22 November 2026)

The shared checkbox in `components/ui/checkbox.tsx` has a fixed 4px corner (`rounded-[4px]`). It used `rounded-sm`, which is `calc(var(--radius) - 4px)`, so 8px in this theme, and half of the 16px box is 8px, which drew a circle that looked like a radio button. Nothing else in the file changed, so the focus ring, the checked tick, the disabled look and every tap target and label are as before. The checkbox is used in four places: the sign-up Terms row, the solution submission confirm box, and the contest draft form (launch on publish and the problem picker). `tests/checkbox-radius.test.ts` resolves the class against the real stylesheet and asserts 4px, less than half of the box. `tests/checkbox-radius.browser.mjs` measures the computed radius in Chromium in light and dark and is not wired into CI. The component never styled the indeterminate or invalid states, and no caller uses them. Draft PR only. No schema, auth, grading, flag, Vercel, Neon or environment change.

## One message for an unanswered part, U9 (22 November 2026)

A part left empty showed "Not answered." in bold and then the grader's "Unanswered. You can check this part later." right after it. `resultMessage` in `lib/solve-feedback.ts` now also drops the grader's "Unanswered." word when it follows the "Not answered" label, so the line reads "Not answered. You can check this part later." The label is kept because it is the plain status wording used by the rest of the page, including the "1 part not answered" line in the feedback box. The sentence after it stays because it says the part can wait. The grader messages, results and decisions are unchanged, and the status stays in words next to its icon. Tests: `lib/solve-feedback.test.ts` and `tests/solve-polish.test.ts`. Draft PR only. No schema, auth, grading, flag, Vercel, Neon or environment change.

## Drafts ordered by last edited, U8 (22 November 2026)

My drafts in Problem Studio is now ordered by last edited, newest first, with the draft id as the tiebreak, instead of by id. The list query in `lib/problem-authoring-api.ts` sorts on the existing `authored_draft.updated_at`, which every save, publish and unpublish already sets, so the draft just saved is on top at the next load. No migration and no new index: the owner index already narrows the sort to one person's drafts. The page cursor now carries the time (with microseconds) and the id (`lib/problem-authoring-list.ts`), so a page never repeats or skips a draft, even for drafts saved at the same moment. An old id-only cursor from a page opened before the deploy gets a 400 and "Reload the list and try again." The Continue your last draft link on a new problem now names the most recently edited draft. Layout and copy are unchanged. Tests: the disposable PostgreSQL API test covers an empty list, three drafts with two at the same time, a save moving a draft to the top, and two pages across 52 drafts. `tests/studio-landing.browser.mjs` checks the list order and the Continue link. Draft PR only. No schema, auth, grading, flag, Vercel, Neon or environment change.

## Sign-up and sign-in spacing, U4 (22 November 2026)

The account forms in `components/auth-form.tsx` now use only the 4, 8, 16, 24, 32 scale, with className overrides and no change to `components/ui/*`. Label to input is 8px, input to its hint 4px, field to field 24px. In the Terms row the checkbox centre is on the first line of text, the label to description gap is 4px, the visible row is 24px from the field above and 24px from the Create account button, and the label is a 44px target through 12px of vertical padding instead of `min-h-11` centring. The auth card is 480px wide (`max-w-[30rem]`) so the username hint fits on one line from about 520px wide. At 390px it still wraps to two lines. Inputs are 16px at every width, because the shared `Input` drops to 14px from the `md` breakpoint. The Terms checkbox looks round because `rounded-sm` is `calc(var(--radius) - 4px)`, which is 8px, and half of the 16px box is 8px. It was not changed. `tests/auth-spacing.browser.mjs` measures every gap with `getBoundingClientRect` and runs in the authored student browser workflow. Draft PR only. No schema, auth, grading, flag, Vercel, Neon or environment change.

## Copy polish, U3a (21 November 2026)

Sign-up with public profiles asks for a Username and no private account name. The account name sent to sign-up is the username, trimmed (`signUpName` in `components/auth-form.tsx`). Nothing reads a separate private name: the profile display name has its own field and falls back to the handle. The Name field is unchanged when public profiles are off. The username hint reads "Choose a permanent username with 3 to 24 letters, numbers or underscores." and the password hint reads "Use at least 8 characters.", both in `text-xs`. The Terms row links the Terms of Service and the Privacy Notice, both opening in a new tab with "(opens in a new tab)" for screen readers only. The two "Type it like you say it" tour steps show `\theta` as one key chip and θ as a chip. The account Email paragraph reads "You are signed in with" followed by the address, with no second sentence. The password hint change applies to every sign-up, because it is one shared hint. Tests: `tests/auth-form.test.ts`, `tests/tour-layer.test.ts`, `tests/account-pages.test.ts`. Draft PR only. No schema, auth, grading, flag, Vercel, Neon or environment change.

## Solve page polish, U1 (21 November 2026)

Symbol chips in the answer field and the "Conditions:" line are typeset through the same KaTeX renderer as the answer preview (`renderLatexInline` in `latex-answer-preview.tsx`), and fall back to plain text when the LaTeX does not parse. A wrong answer shows "Not correct" once: `resultMessage` in `lib/solve-feedback.ts` drops the grader's repeated first word at display time, and no grading message, decision or tolerance changed. The "Retry pending save" button is gone. `lib/pending-save-retry.ts` sends the journal's pending check again on the next Check press, when the browser comes back online, when the tab becomes visible, and on a capped backoff timer (2, 5, 15, 30 and 60 seconds, then it stops until a new signal). One save is in flight at a time, the request is the journal's own snapshot with its existing idempotency key, and answers typed during a retry are never replaced. A status line (`aria-live="polite"`) says the answer is saved on this device and will sync. A save the server rejects for good (`saveState: "rejected"`) is not retried on a timer. `tests/practice-progress.browser.mjs` now expects the automatic retry, and its OFF gate check asserts the retries are capped and stop, not that none are sent. Part labels such as (a) and (b) show as a and b with the accessible name "Part a" (`bareLabel` in `lib/part-colors.ts`, Arena part headings, authored student pages, answer panel). Tests: `lib/pending-save-retry.test.ts`, `tests/solve-polish.test.ts`, additions to `lib/solve-feedback.test.ts` and `lib/part-colors.test.ts`. Draft PR only. No schema, auth, grading, flag, Vercel, Neon or environment change.

## Problem Studio opens on My drafts, U2 (21 November 2026)

`/dashboard/author` now opens on My drafts (`view` starts as "list" in `components/authoring/workspace.tsx`). New problem opens the blank editor, Back returns to the list and reloads it, and `?draft=<id>` still opens that draft directly. The list shows "Loading your drafts" while it loads, and an empty state with one sentence that points at New problem. A draft that cannot be opened now leaves the drafts under the message, and Back from a new problem clears the stale `?draft=` in the address. `app/dashboard/author/page.tsx` is unchanged (sign in, then verify, then the workspace). The Studio tour lives in the editor, so it starts after New problem. The Learn guide says Studio opens on your drafts. Tests: `tests/studio-landing.test.ts` (first paint, page gates), `tests/studio-landing.browser.mjs` (loading, empty state, list, New problem, back, `?draft=`, 375px, run from `problem-authoring.browser.mjs`). Existing suites now press New problem first: `problem-authoring`, `pdf-studio`, `studio-simple`, `tours`, `drunk-user`, `solve-contrast`. The last three need a signed-in real app and were not run here. The Continue your last draft link names the draft with the lowest id, because the list is ordered by id, which is existing behaviour. Draft PR only. No schema, auth, grading, flag, Vercel, Neon or environment change.

## Terms banner no longer asks for a privacy notice (21 November 2026)

The "Starter terms, pending legal review" banner on `/terms` no longer says the operator must still publish a separate privacy notice, because `/privacy` is live (#226). It still says the terms are provisional and need legal review and the operator's legal identity and contact details. Only the banner text in `app/terms/page.tsx` changed. The Terms version, effective date and acceptance behaviour are untouched. Production needs a manual deploy to show it, so batch it with the next release.

## Corrected B1 public profiles (21 November 2026)

PR 2 implements publication, disclosure, legacy acknowledgement and deactivation on top of the merged username claim. [Owner release gates](PHASE_C_B1_RELEASE_CHECKLIST.md#corrected-b1-release-gate) remain pending. Keep profiles OFF.

## Community statement card and steps strip, C4d (21 November 2026)

The community problem page now renders its statement in `DocumentCard` ("Problem statement" plus one line of context) and shows `SolveSteps` above the frame. The strip lists only steps with a real target, numbered in order: Read (the document), Answer (the answer column), Check (the answer form, signed in with a part to answer) and Solution (only for a public-solutions-v1 revision, with the tab). `SolveSteps` takes an optional `show` list and renders all four as before when it is not given, and `ProblemDocumentTabs` hides the tab row when there is no solution tab, so a legacy-private-v1 revision has no one-tab row while the statement stays mounted. The signed out and unverified sign-in card sits in the answer column as a flat Card, and its link is 44px high. Layout only. API routes, gates, flags, migrations, hints, keys and grading are unchanged, and the Physcratic page renders the same HTML (compared for five Arena problems). Tests: `tests/problem-frame.test.ts` (four states, mutation checked), authored-student and authored-public-solutions browser suites, lib/authored-public-solutions.test.ts.

## Community problem page uses the shared problem frame, C4c (21 November 2026)

`components/physics/problem-frame.tsx` holds the frame both problem pages share: the Statement and Worked solution tabs, the answer grid (one column, then 1fr and 23rem from xl) and the document card. The Physcratic problem page uses it with its markup unchanged (hydrated DOM identical at 390 and 1280, server HTML identical apart from the dev build stamp). The community page uses it too. The statement tab always shows. The Worked solution tab shows only for a `public-solutions-v1` revision, exactly as before. A legacy revision keeps its per-part "View worked solution" button, sign-in and expiry rules. The community statement, sign-in card, private workspace, report control, stats panel and Recheck publication button are unchanged and sit inside the frame. The sign-in card for a signed-out visitor now sits in the answer column, after the statement on a narrow screen. Banners above the answer area stay visible on the Worked solution tab. No API route, gate, flag, hint, key or public selection changed. Tests: `tests/problem-frame.test.ts`, `lib/authored-public-solutions.test.ts` on PostgreSQL, and both authored browser suites.

## Community problem card matches the Arena card, C4a (20 November 2026)

A community card with an author rating (a whole number from 0 to 4000 in the difficulty field) now shows it in the left band exactly as an Arena card does, with the tier name under it. The card reads the rating from the `estimatedDifficulty` it already receives and uses `parseRating` and `ratingBand` from `lib/rating-bands.ts`, so there is no second tier function and no change to the API, the data or the sorting. A community card without a rating keeps the Unrated band. The card no longer shows the verified solves line, the Difficulty line or the Attribution and rights line. The rights text and the stored data are unchanged and stay on the problem page. Arena cards are unchanged. Tests are in `tests/problem-card.test.ts` and `tests/unified-arena.test.ts`.

## Problem Studio per-part More options, S3b (19 November 2026)

Each part in the Simple editor has a collapsed "More options" row (44px, with a chevron). It reuses `PartOptions` and `AnswerPanel` from S3a through optional props, so Advanced renders as before. It holds the answer type (including "Students explain, no automatic check"), tolerances, variables, angle, exclusions, hints, the part label and moving the part up or down. The answer box owns the answer text, the unit and the worked solution. The panel owns the answer type and everything else, and hides the fields the box owns. A part the author chose to hand-grade, or whose answer the box cannot read, shows one line and a "Show answer settings" button instead of the box. More options opens by itself for hints, changed settings, hand-grading or an error on the answer. `simpleIssues` now follows the server: one statement anywhere is enough, a worked solution is asked for only on a problem that was never published, an unknown unit is a heads up and not a block, and a hand-graded part publishes without a final answer. The rating is still required everywhere because the server requires it. Nothing moved between `content` and `privateParts` and nothing stored changed. The hand-graded choice is kept in this browser only (`physcratic.studio.explain.v1`), so a new part still asks for its answer. This branch is stacked on S3a (#219). Next: S3c moves sections, PDFs, method tags and the rights text into problem level More options.

20 November 2026, S3b fix after an independent review: a part is hand-graded only when the author marks it (the draft does not carry the published part ids), so a cleared box or a new part on a published problem keeps the box and asks for the final answer, with a "Students explain, no automatic check" button that marks it. Box ownership is decided when the answer type changes, never by the text, and an empty expression picked in More options stays with the box. Numeric picked in More options gets the box tolerances (1e-9 and 1%). Simple shows one worked solution editor, with "(required)" only before the first publish. The symbol name is locked while the box owns the answer. A key the box cannot read is checked with `authoredKeySchema`, and images in hints and solutions need a description. Everything inside Simple More options is 16px through a scoped class, and Advanced markup is byte-identical. Proof: tests/simple-model.test.ts (including a client and server parity check over 1,056 fixtures), tests/simple-part-options.test.ts and the new Chromium test tests/simple-options.browser.mjs (not in CI). `movePart` still keeps the part labels.

## Problem Studio Advanced pieces extracted, S3a (19 November 2026)

Refactor only, no behaviour change. Four Advanced pieces moved out of `components/authoring/problem-editor.tsx` (1,260 lines to 874) into `advanced-sections.tsx` (the sections editor and the outline sidebar), `advanced-part-options.tsx` (the answer key, hints and worked solution disclosure for one part), `advanced-provenance.tsx` (source, permission and rights fields) and `advanced-unpublish.tsx` (the danger zone). Each takes plain props and `edit`. State, session, saving, recovery, conflicts, `RecoverySection` and the locked fieldset stay in `problem-editor.tsx`. No label, id, aria name, `studio-*` tour anchor, storage key or API call changed, and `simple-editor.tsx`, `simple-model.ts`, `answer-panel.tsx`, `media-controls.tsx`, `solution-permissions.tsx` and `lib/problem-authoring.ts` are untouched. Proof: the Advanced DOM, the dialog texts and every request body were identical before and after for two drafts (published with hints and sections, and unpublished with a part that has no key), at the start and after 18 edit steps. CI runs `tests/problem-authoring.browser.mjs` with `PDF_STUDIO_ONLY=1`, so its Advanced section does not run there. Next: S3b moves the per-part options into Simple.

## Community card images C3c (19 November 2026)

Community problem cards in the Arena collection now show the first image, UI only. `UnifiedProblemCard` passes the collection entry's `image` (from #216, served by the #217 route) to `ProblemCard`, in the same slot as the Arena figures: a 120px frame on a phone and 160px from 640px, white for both themes, lazy, async, object-contain, with the entry's width and height. Arena entries still take their figure from `lib/arena/card-image.ts`, whatever else an entry carries. A picture with no alt text is not shown, and a picture that fails to load (removed after publication, or offline) removes its frame, so there is no broken icon and no gap. Entries without an image render exactly as before. The loading card has the matching picture slot: at 1440 the skeleton and a loaded card with a picture are both 287px, and a card without one is 10px shorter. No schema, API, route, `lib/authored-*`, `next.config.ts` or pinned file change.

## Community card image route C3b (19 November 2026)

`GET /card-images/<problemId>/<revisionId>` serves the thumbnail of the first image of a published community problem. It is outside `/api` on purpose: `next.config.ts` sets `Cache-Control: private, no-store` for every `/api` route, and a production probe showed that rule overrides a route's own header, while on `/card-images` the handler's `public, max-age=60, s-maxage=300, stale-while-revalidate=60` reaches the response. `src` in the collection changed to this path (`lib/authored-card-image.ts`). On every call the route checks that the problem is published and the revision is its current one, that the first image block (the same reading order as the library SQL, in the shared `lib/authored-first-image.ts`, with a test that runs both on the same documents) has alt text, and that its media is a ready statement image bound to that revision, a raster type, within 3 MiB, for an author and problem that are not restricted (an unreadable restriction table fails closed). Anything else is an empty 404 with no detail. The image is decoded with a 40 megapixel limit and an 8 second timeout, turned upright, resized to at most 480 pixels wide without enlarging, and written as webp quality 72 with all metadata dropped (EXIF, GPS, ICC). Nothing is stored or written. Headers are set in the route: `Content-Type: image/webp`, `X-Content-Type-Options: nosniff`, `X-Robots-Tag: noindex, nofollow`, no cookie. The existing media read has no rate limit and none was added. The route is registered in `scripts/csp/non-document-routes.json`, which the CSP route test requires. Not merged: new public media route. No migration, schema, auth, `next.config.ts` or `lib/security` change.

## Community card image data C3a (19 November 2026)

The community collection now returns an optional `image` ({src, alt, width, height}) for a published authored problem. Data and API only: no UI, no migration and no new route. It comes from the first image block of the published revision's public content, in reading order (context, then each section's blocks, then each part's blocks), and only when that media is a ready statement image linked in `author_revision_media` for that exact revision. Drafts, archived problems, private parts, hints and solution images are never read. `src` is the future thumbnail address `/api/authored-problems/<problem>/card-image/<revision>` (C3b builds the route, so it answers 404 until then). Alt is the block's alt text trimmed and cut to 140 characters, and a problem with no alt gets no image. Dimensions are not stored for community images, so width and height are a fixed 4:3 box (640 by 480), a ratio and not the file size. A restricted problem or a restricted author gets no image: staff removal already archives a problem and blocks re-publishing, but a banned author's published problems stay listed, so the image check reads `community_restriction` for both. If that table is missing or unreadable, no image is shown and the list still works. The image adds about 200 bytes to a card, 300 at the longest alt text. Not merged on purpose, because this widens public data. No schema, auth, grading, flag or deployment change.

## Problem Studio cleanup S2 (19 November 2026)

Layout and wording only. The recovery tools now sit in one collapsed "Recovery" section, a button at least 44px tall that opens by itself when a saved tab copy, an unreadable copy or a version conflict is present. Inside it are the same tools as before, with the same text and the same behaviour, plus one "Download private copy" that saves the current work. The conflict panel's own "Download private local copy" is gone because it did the same thing. The unreadable-copy and saved-copy downloads stay, because they save different files. The upload cleanup on My drafts is in its own Recovery section. The Advanced "Open student problem room" link is gone, so the Student preview tab is the one preview. "Back to drafts" is the one way out of the editor. The expiry of student solution access is a date input labelled "Student access ends on (optional)" with a visible message for a day that cannot be used. The stored value is unchanged: a UTC ISO date and time, the end of the chosen day, and an existing value is kept as is when its day is not changed. Studio inputs are 16px, which also makes the four inputs on the student answer page 16px. No change to draft saving, versions, recovery behaviour, media privacy, answer keys, publish rules or schema, and no pinned file touched.

## Problem page header H2 (19 November 2026)

Problem pages have one way back and one clean header. The link reads "All problems" and is first after the skip link, 44px high. It goes to the dashboard problem list when signed in and to `/problems` for a guest. An archive problem goes to the archive list at its year, for both, for example `/problems/archive#ipho-2025`. The problem pages are built once with no session, so the server HTML links to `/problems` and a client component swaps the target when the session is known. The "Problem room" label and the `showLabel` option are gone. The Arena reader's own "Back to Physcratic Arena" link is gone (the code had one at the top and none at the bottom). The archive reader's "Back to all problems" button is hidden on a problem's own page and kept where the reader is embedded in the dashboard list. The wordmark stays on the right as "Physcratic home", linking to `/`, with no arrow. The breadcrumb is in the server HTML for crawlers and guests, and a signed-in person does not see it once the session is known, so there can be a brief flash of it on first load. The BreadcrumbList JSON-LD is untouched, and `tests/problem-header.test.ts` pins the hash of all 145 problem pages. The authored problem page uses the same header. No auth, routing, middleware, schema or deployment change, and no pinned file touched.

## Serving LOGIN attestation cleanup (19 November 2026)

The owner accepted the sampled restricted LOGIN on deployment
`dpl_4UWwiYwhWZs28XPuKo5mpSv3Jgbq` at `cd1e2c7` and confirmed expiry and
removal of the temporary Production variable. This code-only cleanup removes
the observer and restores the ordinary Arena collection handler. Preserve the
restricted Production binding. [Accepted evidence and archived runbook](RUNTIME_LOGIN_ATTESTATION.md).

## Arena card image C2 (19 November 2026)

An Arena card can now show the first image of its problem statement. 22 of the 33 Arena problems have one, and the other 11 render as before. The figure, its width and height come from the first image in the statement, read by `scripts/build-arena.ts` into `lib/arena/index.json`, with a short alt text for each in `lib/arena/card-images.ts`. The generator refuses a figure with no alt text, an alt text with no figure, and any path that is not a statement figure. `ProblemCard` takes an optional `image`. The frame is 120px high on a phone and 160px from 640px, light in both themes because the figures are drawn on white, with object-fit contain, lazy loading, async decoding and explicit width and height. From 640px the picture sits to the right of the text, below that it sits between the text and the footer. The card keeps one control, the stretched link. Only the Arena collections pass an image, so corpus, olympiad and archive cards are unchanged. The index grew by 4.8 KB and a page of 24 cards loads about 235 KB of figures lazily. Community problem cards stay text only, because their images are private-cache and full size. Pull request, not merged. No schema, auth, grading, flag or deployment change.

## Arena favourite key pattern F2 (18 November 2026)

Migration 0021 replaces the fixed list of 18 Arena keys in the favourites constraint with a shape pattern. Before it, favouriting any of the 15 Arena problems added after 0012 passed the API catalogue check and then failed the database check, so the API answered 503. The API still accepts only catalogue keys. Down refuses while a favourite uses a newer key. `lib/community-favourite-arena-keys.test.ts` covers accepted, rejected and authored keys and runs up, down, up on a disposable database. [PR #209](https://github.com/Physcratic/physcratic/pull/209) merged into source at `5e929d7ff8c4cc93b0755fcf3c968396caed54b8`. The last accepted Phase B Production ledger covers 0001 through 0018. Confirm any later migration through the owner’s read-only ledger review. Applying 0021 requires its own reviewed migration procedure and owner approval.

## Link preview template L1 (18 November 2026)

Every link preview image now comes from one template, `lib/og/link-preview.tsx`, instead of eight copied layouts. A page preview takes a label and a title. A brand preview serves the home page and coaching. Long titles are clamped to 120 characters and set in a smaller size so they stay inside the image. The terms page keeps inheriting the home preview, because a new route needs a CSP review first. Only public strings go in, as in #190, and the template reads only `public/logo-mark-transparent.png`. `lib/og-link-preview.test.ts` fails if an opengraph-image route builds its own image, reads a file or leaves out the standard size, and it lists the eight routes that have one. `scripts/check-opengraph-build.mjs` passes unchanged. No change to `next.config.ts`, metadata text, schema, auth, grading, flags or deployment.

## Design rules D2 (18 November 2026)

The D1 baseline is nearly empty. 75 separator glyphs, 12 of 13 `font-mono` uses outside code and kbd, and 6 of 7 wide-tracked uppercase labels in app and components are gone, so `lib/copy-rules.test.ts` holds every file to the two design rules except one. `components/community/account-settings.tsx` is pinned in `scripts/activation/PACKAGE_SHA256SUMS`, so it keeps one mono username input and one tracked uppercase label in a documented baseline entry. The owner removes those after re-pinning the activation package. Glyphs became commas, colons, full stops or separate spans with a gap. Mono became Plex Sans, with `code` for identifiers. Uppercase labels are sentence case at text-sm. Visible wording changed in the Studio editor, authored student page, community and moderation screens, IPhO reader navigation, submission forms and history. The dot product key in the answer palette is now labelled "dot". Browser tests that matched the old strings were updated and run by CI. Page titles for Problem Studio and authored problems no longer repeat the site name, which the title template adds. No schema, auth, grading, flag or deployment change.

## Design rules D1 (18 November 2026)

Two design rules are now written in CLAUDE.md, AGENTS.md and CONTRIBUTING.md with the same wording. No glyph between words, and one typeface (IBM Plex Sans) with sentence case labels. `lib/copy-rules.test.ts` fails on a middle dot or bullet in app and components text, on `font-mono` outside code and kbd, and on uppercase with wide tracking. Older offenders are in a counted baseline in that test, which D2 empties (75 glyphs in 32 files, 13 mono in 11 files, 7 uppercase in 7 files). Applied now to the problem card source line (source, year and task as three spans, 8px gap), the problem heading badges (rating number and band name as two spans, accessible name "Rating 1,850, Advanced"), the Problem room label, the library tabs and the collection count line. `describeEstimate` now returns "1,850 Advanced" and `estimateParts` gives the two parts. No schema, auth, grading, flag or deployment change.

## Phase B checkpoint (19 November 2026)

Main4f840e67f359e558d49f44a4b81966012638fc9a includes cleanup PR204.
The owner has accepted sampled serving-LOGIN evidence and confirmed cleanup
Production dpl_A4rYge5pwgYzVMhD6JYgabQ8NexB, Ready on physcratic.com,
with the temporary variable removed, profiles OFF and statistics ON. These
private provider facts are owner-confirmed; source removal and exact-main CI
were independently rechecked. Do not repeat attestation or its cleanup based on
older pending/UNPROVEN prose below. They are historical checkpoints.
Current authority: [Phase B report](PHASE_B_OWNER_REPORT.md) and
[owner-only permission/activation checklist](PHASE_C_B1_RELEASE_CHECKLIST.md).
Permission reconciliation still requires separate exact-artifact approvals.
No Production operation is authorized or performed by this engineering task.


## Historical PR #204 instrumentation removal (19 November 2026)

PR #204 was gated on accepted Production evidence and owner removal approval.

Prepared from main 8d350c5a239d91b4009d1069e50d149ecd7bf744. This cleanup removes
only the temporary assertion helper, pool observer and temporary unit/PG CI tests.
Permanent privilege audits, restricted binding, Batch A and B1 gates are preserved.
The merged serving code must remain available until correlated Production evidence
is accepted. The owner separately removes the temporary Production variable and
approves the cleanup release. This branch performs no provider operation.
See [owner release checklist](PHASE_C_B1_RELEASE_CHECKLIST.md). Historical sections
below describe the instrumentation source before removal, not an active mechanism
after this cleanup is released. Local test results are recorded in the delivery.


## Arena card redesign (19 November 2026)

From main 998ae77, the Arena card redesign landed in PRs #193, #196, #197 and #198, and the follow-ups from the independent review are in claude/arena-card-p4b. PR #195 is superseded by owner decision. The band colours are teal, blue, violet and amber, with no red or green. The favourite control reuses the existing save, with no new API. Two reviewed manifest digests changed in #197, see [BETA_READINESS.md](BETA_READINESS.md). The favourites allowlist in migration 0012 rejects newer Arena problems, so favourites on them need a migration with owner approval. The light focus ring is darker so it reaches 3:1, and that applies site-wide. No Production, schema or flag change.

## Historical serving-LOGIN assertion proposal (18 November 2026)

Separate codex/phasec-login-attestation change stacked on the runtime audit fix.
[Design, approval and removal](RUNTIME_LOGIN_ATTESTATION.md) define an OFF-by-default
server-only observer on the actual application pool. A matching source SHA,
provider deployment ID, active request context and at most15-minute owner window
are required. Only bounded private assertion/deployment metadata is emitted,
with no diagnostic endpoint or raw role/SQL/credential/person data. Synthetic
unit and PG18.7 tests exercise the connection and failure boundaries. Exact-head
validation and PR/CI evidence belong to the delivery report. No Production
configuration, grant, credential, deployment or feature activation is authorized.
Independent review and owner deployment/configuration approval remain gates.

Review follow-up for PR200: real saturated-pool acquisition is bounded and leaves
the request client usable. Fixed only the disposable harness's57P01 teardown
race, retaining failure checks for unexpected idle errors. The owner plan now
requires a future observation window, existing Function time budget, scoped
sampling and independently usable restricted-binding rollback/removal. Runtime
assertion code is unchanged by this review. PR199 integration/CI and provider
metadata remain separate gates; GitHub API access is Forbidden here.


## Phase C runtime audit correction (18 November 2026)

From main df96dd7, codex/phasec-runtime-audit replaces the id-specific row-lock
proxy with any-column capability plus an independent exact UPDATE allowlist.
Baseline/batch-a/b1 grant contracts accept only approved feature deltas, classify
OFF profile absence and reject id/PUBLIC/table overgrants. Disposable PG18.7
regressions cover all three requested grant states and missing legitimate writes.
[Owner sequence and serving-LOGIN gate](PHASE_C_B1_OWNER_HANDOFF.md). Exact commit,
actual validation and PR/CI evidence belong to the delivery report. No approved
grant file, migration, Production/provider/credential/flag or deployment change.
Independent review and actual serving LOGIN remain release gates.

## Public worked solutions source qualification (17 November 2026)

From main `806b85d`, PR B adds immutable revision consent, current-only guest
solution/media reads, archive-style navigation and conservative independence
classification. Legacy private publications and immutable attempts/reveals remain
unchanged. Personal correctness stays separate from verified-solve eligibility.
[Architecture and actual local QA](AUTHORED_PUBLIC_SOLUTIONS.md) and the separate
[owner migration package](../../scripts/public-solutions-release/README.md).
No Production migration/SQL/grant/flag or provider operation is authorized or run.
Next: exact-head CI/review and scoped source release, then owner evidence/approval
before any0020 installation or public exposure. Practice/deletion stay OFF.

## CSP collector privacy and bounded reads (17 November 2026)

From merged OG main `c12ec3c`, `codex/csp-report-route-privacy` replaces raw logged document paths with fixed route labels and reuses the existing capped reader with a five-second deadline. Report-only policy, origins, auth/grading and 204 behavior remain unchanged. Focused49, guarded production build, typegen/tsc and zero-warning lint pass, with the existing Chromium report/enforce harness exercised locally. [Attribution, provider unknowns and remaining enforcement gates](CSP_X3_READINESS.md#collector-privacy-correction-17-november-2026-candidate). Candidate still needs independent review and exact-head three-engine CI. No Production access/mutation or feature exposure. Existing draft #189 covers homepage ratings and #191 covers authored/PDF UX, so neither is rebuilt here. Next: review the collector-only PR, retain report-only, and obtain owner serving-role/binding evidence before any Batch B activation.

## Phase C post-cutover records (17 November 2026)

PR188 is reconciled with OG main `c12ec3c`, preserving both document updates. The owner reports completed restricted-role cutover and existing-feature acceptance. [Current read-only evidence procedure and remaining gaps](PRODUCTION_RUNTIME_ROLE.md#phase-c-post-cutover-evidence-17-november-2026) keep actual serving-role/alias evidence UNKNOWN here because provider tools/network access are unavailable. Batch A stays active, future gates OFF, and only the exact approved favourites delta supplements the baseline verifier. Historical deployment/owner-role statements are explicitly archived. No repeated credential setup, Production query, grant, deployment or activation. Package checksum changes only for reconciled CI/activation dependencies and this document. Next: retain owner-correlated serving identity and rollback evidence before Batch B.

## Open Graph packaging fix (16 November 2026)

From current main `4df6e5e`, `codex/fix-opengraph-tracing` removes whole-catalogue statement reads from problem images and explicitly traces only the public logo for image functions. Shared title formatters preserve SEO text, and the four requested PNGs match baseline pixels. Focused35, zero-warning lint, production build, trace-only runtime PNG/404 regressions and 16 Chromium image decodes pass. [Root cause, artifact sizes, verification and owner deployment/rollback gates](SEARCH_AND_AI_VISIBILITY.md#open-graph-function-packaging-16-november-2026). CI gains one post-build trace regression. Activation/runtime-role manifests refresh only for that workflow dependency, with no SQL/operator change. Exact-head CI, independent review and provider-preview validation remain release gates. No merge, deployment, migration, runtime-role, CSP, flag or Production change. Next: owner reviews the focused PR and provider images before authorizing release.

## Reader and Simple Studio UX revision (16 November 2026)

PR A simplifies the authored reader and unifies Simple/PDF part editing without changing grading, solution permissions, immutable attempts or publication contracts. PDFs open immediately with single-page navigation, author previews use existing private proxies, and rating presets/history/cleanup chrome are removed. Owner explicitly approved retaining unreferenced uploads and deferring physical cleanup because browser-local recoveries are invisible to server reference checks. [Architecture and retention limit](PROBLEM_AUTHORING_MAP.md#reader-and-simple-studio-ux-revision-16-november-2026). Actual QA, independent review, exact head and CI evidence belong to the focused PR. No Production SQL/settings/flags, migration, dependency or storage configuration change. Report PR A before public-solution or progress phases. Practice and deletion stay OFF.

## PDF-first Problem Studio (16 November 2026)

Upload-first authoring stays inside Simple mode with the existing draft/version/recovery and media contracts. Tutors attach statement PDFs or ordered part images, define numeric/expression/manual keys and optional private solution PDFs, and use the shared student preview. Publication accepts actual statement media without fabricated native text. Ownership/readiness, media sealing and per-part solution approval stay unchanged. Shared Save now supports deliberate recovery, and preview keeps incomplete input mounted. Workflow view preferences contain only per-user/per-problem files/text choices. [Architecture, validation implications and limits](PROBLEM_AUTHORING_MAP.md#pdf-first-studio-contract-16-november-2026). Synthetic PG/model/component/browser checks and independent review are recorded in the focused PR, including final exact-head CI and production-mode PDF checks. Reconciled concurrent main `01ee8ad` without conflicts. No migration, dependency, Production SQL/grant/storage/flag change, OCR or card unification. Existing 3 MiB limits and uploaded-document accessibility limitations remain. Scoped code-only merge is owner-authorized only after review and all material checks pass. Do not activate deletion or practice persistence.

## Account deletion release qualification (15 November 2026)

Actual auth/0018/disposable-PG qualification retains the existing erasure design. A reproduced known-account-switch bug left password/confirmation in the deletion form. The minimal keyed workspace clears old consent while preserving original receipt recovery. Tests add real restricted login roles and the component/API/PG lifecycle in mobile/desktop light/dark, including lost acknowledgement, late responses and provider retry. [Implemented capabilities, owner evidence, acceptance, delivery choice and restore/rollback gates](ACCOUNT_DELETION_READINESS.md#release-qualification-15-november-2026). Live metadata confirms six-hour Neon history plus a separate manual snapshot and retained branches. It does not establish complete backup expiry. Deletion and practice activation remain **NO-GO**, source defaults OFF. No Production SQL, grant, provider, flag or deployment change. Exact SHA, independent review and CI evidence belong to the draft PR. Security-sensitive merge requires explicit owner approval.

## Archive note account isolation (15 November 2026)

Actual handler/Drizzle/disposable-PG reproduction confirms a stale displayed account could read or write under a different cookie identity. The separate stacked fix rejects missing/mismatched account headers before archive-note SQL, masks unresolved private cache and scopes delayed save feedback by session generation. Real hook/route browser coverage includes A-to-B-to-A and committed-but-unconfirmed retry. No grading, permission, content, schema or Production change. Final review/CI evidence belongs to the focused PR, with independent final review still unavailable.

## Practice progress readiness (15 November 2026)

Current saved-practice catalogue excludes retired readers while preserving exact historical replay. Legacy test fixtures remain explicit and grading/migration bytes are unchanged. [Audit, live metadata, owner choices and bounded activation/rollback gates](POST_B6_PROFILES_PRACTICE.md#practice-readiness-evidence-and-owner-gates-15-november-2026). Practice/deletion stay OFF by default. No Production SQL, grant, binding, provider, deployment or flag operation. Final SHA/CI and review limitations belong to the focused PR.

## Authored solution response visibility (15 November 2026)

A follow-up to the initial investigation reproduces approved solutions and denial messages below the viewport after confirmation. Explicit response focus/scroll now exposes the result in mobile flow and the desktop answer rail, preserving confirmation, permission, assistance and privacy clearing. [Evidence and policy](AUTHORED_STUDENT_UI.md#worked-solution-policy-and-evidence). Separate draft stacked on math-input fix #176. No merge/deployment or API, grading, migration, Production, official-reader or SEO change.

## Authored solving reliability (15 November 2026)

A reproduced stalled MathLive import now has an authored-only 10-second fallback deadline, preserving draft/focus/composition and submission behavior. [Investigation and solution-policy matrix](AUTHORED_STUDENT_UI.md#solving-reliability-investigation-15-november-2026). Authorized before-submit solutions pass the existing real-PG/API/browser tests; the reported intermittent solution failure is not reproduced, so no access/privacy policy is changed. Scoped draft PR holds exact-head QA and independent review. No merge, deployment, migration, Production or official-reader change.

## Additional ten native archive problems (15 November 2026)

Stacked locally on batch four `234ed8a`, this user-requested batch adds EuPhO 2023 T2-T3, all 2024/2025 T1-T3, IPhO 2010 T2 and APhO 2014 T2. **35 native, 77 PDFs remain** out of 112. Every EuPhO archive problem is now native. Adds 41 original crops, 36 automatic fields and 11 self-review fields. The previous ten conversions and all other 102 collection records are preserved. [Source conventions, corrections, QA and publication boundary](NATIVE_ARCHIVE_BATCH_5.md). Focused91, server986 pass/31 skip/one TODO and components204 pass, typecheck/lint/offline guards/final build pass. Browser/DB/Actions results remain unverified. Public push remains blocked by automatic approval review pending explicit user publication approval. Local implementation `9c717a6` on `codex/archive-next-10`. No PR, merge, deployment or live-data operation.


## Native archive ten-problem conversion (15 November 2026)

Following merged #179 at `81d9cc5`, this batch converts exactly EuPhO 2017 T1-T3, 2021 T1-T3, 2022 T1-T3 and 2023 T1. The archive has 112 records: **25 native, 87 PDFs remaining**. Adds complete native statements and worked alternatives, 25 original crops, 28 automatic fields and seven self-review fields. The other 102 records, identities, ratings, original PDFs and account-persistence catalogue are preserved. [Source conventions, corrections and QA](NATIVE_ARCHIVE_BATCH_4.md) and batch-four ledgers bind the sources. Local server954 pass/31 skip/one TODO, components204 pass, focused59 pass, typecheck/lint/offline guards/build pass. Chromium is blocked before page load by the environment's Unix-socket policy. Exact-head build/browser/database CI evidence belongs to the delivery PR. Local implementation `3918b5e` on `codex/archive-next-10`. Automatic approval review blocked public push pending explicit user approval, so no PR or GitHub CI result yet. No merge or deployment.


## Native archive EuPhO 2020 conversion (15 November 2026)

Continuation of #178 at `6884fb3` adds EuPhO 2020 T1/T2/T3 with native LaTeX, nine original crops, worked alternatives and six automatic fields plus one graph self-review field. Archive: 112 records, 15 native, **97 PDFs remaining**. Earlier nine conversions, identities, ratings, original PDFs and account persistence are preserved. [Source conventions, checks and environment limits](NATIVE_ARCHIVE_BATCH_3.md) and third-batch ledgers record the evidence. Six local production-reader/sampled-checker physics and source tests pass. Full schema/type/build/integration CI and browser results must be taken from the follow-up PR, not inferred from local execution. No merge or deployment.


## Native olympiad archive, batch 2 (15 November 2026)

Continues draft PR #178 from reviewed head 3ed4b1857efb77a6ccda4d6591aa4a2211c1a34e. Adds EuPhO 2019 T1-T3 and APhO 2012 T3 using the existing native reader and stateless answer controls. Total archive remains 112 records, now 12 native and 100 PDF-based. The first five conversions and other 103 records are unchanged. [Sources, answer conventions, validation and remaining work](NATIVE_ARCHIVE_BATCH_2.md). Exact-head full CI is recorded in the PR. No saved progress, ELO, database, flag, provider, merge or manual deployment action.

## Native olympiad archive, batch 1 (15 November 2026)

Five existing PDF records now have complete native statements, solutions, original cropped figures and Arena answer controls. Scope: EuPhO 2018 T1-T3, IPhO 2012 T2 and APhO 2012 T1. The archive remains 112 records, with eight native and 104 still PDF-based. Checks are stateless, with no account progress, marks or ELO writes. Source inconsistencies are explicitly annotated. [Conversion sources, validation and remaining work](NATIVE_ARCHIVE_BATCH_1.md). Exact-head remote CI belongs to the PR. No merge or deployment performed.

## PDF reader structure accessibility (14 November 2026)

Fresh main d95b861 reproduces four invalid ARIA nodes in the tagged 2010 PDF. A version-bound React-PDF patch preserves every content owner/order and existing cells while repairing trailing inline tags and redundant bare lists. [Root cause, limits and regression design](PDF_READER_ACCESSIBILITY.md). The draft PR records actual production-build/browser QA, independent review and exact-head CI. No merge/deployment, original document, publication, SEO policy, provider or database change.

## Production runtime role proposal (14 November 2026)

Owner inspection confirms the Production application is owner-bound after successful B6. [Restricted-role provisioning, read-only acceptance, cutover and independent rollback](PRODUCTION_RUNTIME_ROLE.md) now define the next owner gate. Exact current-feature grants exclude disabled community/practice/deletion features and the retired coaching writer. New focused synthetic PG18.7 LOGIN coverage passes 6/6; existing main CI remains the baseline. No ownership transfer, Production access/change, provider change, migration replay or activation. Provisioning requires exact-hash approval and live read-only preconditions; Vercel binding/deployment and acceptance writes require separate authorization.

## Approved two-insight pilot publication (14 November 2026)

Owner authorizes only publishing existing IPhO2009T1/2010T1 insights, with null reviewers and unchanged approved content. Application diff is two publication flags. See [read-only baseline and P7 monitoring plan](SEO_P5B_P7_PILOT.md). Publication PR holds actual QA, independent review, merge and deployment evidence. Search Console/indexing/performance data are UNKNOWN. No new content, tracking, provider configuration, SQL or manual deployment.

## SEO P5B insight drafts (14 November 2026)

Exactly two unpublished, unreviewed supplements target IPhO2009T1 and2010T1. A server-only publication gate and native spoiler disclosure reuse Learn math/citations without changing official readers, solutions, metadata, auth or grading. See [selection, sources and physics audit](SEO_P5B_INSIGHTS.md). Draft [#165](https://github.com/Physcratic/physcratic/pull/165) carries full text, isolated preview evidence and exact-head QA. Owner editorial approval remains required. No merge, publication, deployment, database changes.

Editorial revision: disclosure now names derivations/final results, introductory heading and attribution are simplified, and the model energy-loss rate/exterior induced-field domain are explicit. Both insights remain unpublished with null reviewer attribution.

## Post-B6 final integration (14 November 2026)

Rebased `codex/b6-activation-engineering` through PR #162 and onto latest PR #158 main `1189ab02878bf607cdf653d3ebdf33b250d1911e`, preserving both account guards, Learn accessibility and Mechanics publication evidence below. The LOGIN rehearsal now has a separate process/step in existing PG18.7 CI, with activation-manifest verification. Existing statistics browser coverage is unchanged; the shared community browser job adds the existing profile harness's focused account-header mode. Focused local results: PG18.7 5/5 and profile browser 21 assertions pass. No broad verification repeated. The [review package](POST_B6_RELEASE_REVIEW.md) records remaining exact-head CI/API and owner-merge gates. No Production, migration, credential, grant, flag or deployment action.

## Post-B6 Batch B profile and practice readiness (14 November 2026)

[Profile/practice package](POST_B6_PROFILES_PRACTICE.md) and [release review](POST_B6_RELEASE_REVIEW.md) complete the second bounded batch, stacked on Batch A commit `792425deaa61c65f309706d7273ee9f26a77959b`. A real cookie switch reproduced first-profile publication for the wrong displayed account. Own GET/PATCH now rejects the mismatch before reads/quota/writes, with focused Settings/setup transport and error handling. Combined LOGIN PG18.7 rehearsal passes 5/5, including actual consent/collection/reader withdrawal and signup failure rollback without user DELETE. Three focused guard/client regressions pass. Practice code/erasure exists, but the OFF deletion routes provide no qualified erasure delivery channel; policy/provider/backup and owner process remain explicit gates. No live mutation, migration edit, activation, merge, deploy or broad CI sweep. Independent code/owner approval and actual served-role/flags evidence remain required.

## Post-B6 Batch A activation engineering (14 November 2026)

[Owner release package](POST_B6_ACTIVATION.md) and [runtime permission proposal](B6_RUNTIME_PERMISSIONS.md) replace the temporary first-batch notes. Real LOGIN/actual-route rehearsal found and fixes stale-account favourites/statistics retargeting with a rejection-only account header. Focused PG18.7 checks pass 3/3 and the no-DB guard regression passes 1/1. Narrow delta SQL and metadata inspection are proposals only. No live target/role/grants/deployment/flags changed, no migration bytes changed, no broad CI repeated. Actual deployed identity, role separation, owner approvals and GitHub API/CI evidence remain external gates. Profiles/practice follow separately.

## Mechanics publication reconciliation (14 November 2026)

PR #158 incorporates fresh main `fa8d4931dacc3aa9d4a1b1411197b349a2246dd9`, including merged equation keyboard accessibility fix #162. Only the approved Mechanics publication flag and directly related tests/docs differ from main. All approved content/assets and `reviewedBy: null` remain unchanged. Seven published guides and139 sitemap URLs derive from the current registry. Exact-head QA, independent review and release/deployment evidence belong to #158. No B6 SQL, provider configuration, manual deployment or P5B.

## Learn equation keyboard accessibility (14 November 2026)

Scoped release work starts at `31941d0ea1feca6bac93834d1b8fa75ce051ca5c`. Equation scroll wrappers gain server-rendered keyboard focus, a visible theme-token outline and named group semantics, not landmarks. Native arrow scrolling and MathML remain. All equations are focusable because SSR cannot safely determine overflow across fonts, viewport and zoom. No client measurement or hydration dependency is added. Accessibility PR records baseline/after browser, independent review and exact-head CI. Mechanics publication remains separate in #158. No B6 operator, SQL, CSP, flag, provider or deployment changes.

## B6 PostgreSQL 18.7 compatibility (13 November 2026)

Branch `codex/b6-pg187` updates B6's exact version binding/template to 180007 after owner-reported read-only inspection. The legacy operator and all 18 canonical SQL hashes remain unchanged. Scope stays 0007–0015, 0017, 0018; never replay 0016 or install 0019. Node22 focused integrity/identity/approval and disposable PG18.7 operator tests pass 4/4. CI isolates B6 on 18.7 while preserving the legacy 18.6 suite. [Windows corrections](../../scripts/production-upgrade/WINDOWS_RUNBOOK.md) require new candidate/package bindings and separate explicit final approval-file SHA-256 authorization. Package SHA-256 `c410533f44d68d4f708faebc20655b026e19080c296dc5acaf42992aa2b2bb08`. GitHub API access is blocked (Forbidden); remote PR/CI status must be established separately. No Production access/change, firewall action or deployment.

## Moderator actions (12 November 2026)

Code-only staff actions extend the existing dashboard with community-question removal/restoration and regular-account bans/unbans. Individual existing staff roles remain operator-assigned. Additive 0019 serializes versioned decisions, archives removed questions while preserving revisions/attempts, blocks republication, revokes banned users' sessions and rejects new sessions. Restoration requires an independent administrator and leaves questions archived for explicit author republication. Default-OFF COMMUNITY_ACTIONS_ENABLED also requires existing staff/moderation flags. No production discussion lock is removed.

See [behaviour, tests, migration hash, grants and limitations](STAFF_ACTIONS.md). Focused PGlite SQL/API tests and changed-entrypoint TypeScript pass. Complete PostgreSQL/auth/reader integration and exact-head CI remain review gates. No merge, real account/role, SQL/grant, activation or deployment action. Owner approved the code-only merge. Production activation remains separate.

## SEO P5A Mechanics draft (12 November 2026)

Final editorial correction: #154 adds two accessible Mechanics diagrams and explains both tempting energy errors, preserving all equations, assumptions, citations and practice links. Final exact-head evidence remains on the draft PR. Unpublished, no reviewer attribution, no merge or deployment.

One original Mechanics guide is registered with `published: false` and `reviewedBy: null`. The existing Learn renderer and published-only discovery machinery are reused. The six published guides and sitemap138 remain unchanged. Independent automated physics critique and exact symbolic checks agree on both derivations, with the initial-rest assumption clarified. See [editorial/source audit and publication boundary](SEO_P5A_MECHANICS.md). Draft [#154](https://github.com/Physcratic/physcratic/pull/154) contains complete article text, verification and exact-head CI. Focused136, components170, TypeScript, zero-warning lint and production build pass. Local production HTTP confirms draft404, six published guides, reader counts121/103 and sitemap138. Owner editorial approval remains required. No publication, merge, deployment or P5B.

## Studio public removal (12 November 2026)

The author management list now offers confirmed "Remove from public" for published problems through the existing versioned unpublish API. Success displays the archived state and retained-history notice. Failed or uncertain responses require a fresh list before another removal, including lost acknowledgements after commit. Actions wrap at mobile widths. No backend, schema, flags or pinned B6 package changes.

Base `bc7ee7a7c5c55face89cdf4526667bf350fd20a1`. Focused PostgreSQL 32/32 passes owner/session/origin/version, discovery, submission races and retained-history contracts. The real Studio/API/browser regression passes cancellation, 503, stale409, keyboard/mobile axe/overflow, exact revision/attempt preservation and committed-response recovery. Server853/component166 pass, with30 database skips and one inherited TODO in the server-only run. Exact-head CI and guarded build results belong to the PR. No merge, deployment or Production action.

## SEO P4B topics (12 November 2026)

Six public topics reuse the Dashboard shell and existing Arena/Olympiad cards, with registry counts22/23/18/19/19/20 and all native server-rendered reader links. Metadata/OG/404 and sitemap138 are preserved. See [architecture, evidence and limitations](SEO_P4B_TOPICS.md). Exact-head checks/screenshots are on the focused draft PR. No homepage/library/archive/backend changes, merge, manual deployment or P5.

## SEO P4A archive (12 November 2026)

Archive-only Dashboard shell and existing Olympiad cards, with server-rendered 103 reader entries and preserved grouping/year fragments, metadata and sitemap. Six topic pages and public library implementation are unchanged. See [architecture, verification and limitations](SEO_P4A_ARCHIVE.md). Exact-head results/screenshots are recorded on the focused draft PR. No merge, manual deployment, database/auth/grading/publication change or P4B.

## SEO P3 interactive public library (12 November 2026)

Separately authorized P3 reuses the Dashboard shell and existing collections at `/problems`, with the registry-derived server directory and all 121 retained reader anchors. Shared URL filters/Guided selection support reload/history; archive/topic route-group moves preserve URLs and content, and the sitemap remains 138 URLs. Mounted account changes discard unsaved Guided drafts. See [architecture, verification and limits](SEO_P3_LIBRARY.md). Local focused56/browser233/session774/retained2782, TypeScript/lint/build and eight contrast combinations pass. Exact-head CI and screenshots are recorded on draft [#149](https://github.com/Physcratic/physcratic/pull/149). No homepage/auth/grading/publication/schema/operator changes, merge, deployment or P4.

## B6B-1 operator release preparation (12 November 2026)

The owner reports Production ledger 0001–0006 plus 0016, with 0007–0015/0017/0018 absent. The companion [reviewed upgrade package](../../scripts/production-upgrade/README.md) preserves that noncontiguous baseline, validates canonical hashes and owner-approved schema/ACL/recovery fingerprints, uses the common advisory lock and one transaction for all eleven missing migrations and ledger records, and independently verifies postcommit on a new connection. The historical six-migration package and all migration bytes remain unchanged.

Focused disposable PG18.6 rehearsal passes upgrade, preserved authoring/contest/auth data, drift/unledgered-object rejection, mid-DDL rollback, lock competition and replay refusal. The reviewed grant template supports synthetic real sign-in, authoring publication, contest registration and server practice save/replay with denied immutable DELETE/deletion-service access/CREATE. Existing owner runtime is unchanged by this tool. Exact-head CI is the full-suite authority after push. No Production inspection, SQL, roles/grants, credentials, settings, flags, deployment or README trigger was performed. The missing actual Production row hashes, recovery/restore-erasure evidence, complete baseline fingerprint and explicit window authority remain execution gates.

## Legacy practice retirement (12 November 2026)

Final review correction (12 November 2026): #146 incorporates exact P2 `db2430ea` and main `8bb5941` through normal merges. The marking guide's changed revision is pending owner editorial approval, with no visible or structured-data reviewer attribution. Its explanation and sources are unchanged. Other reviewed guides retain their bylines. See LEGACY_PRACTICE_RETIREMENT.md and the exact-head CI on #146. Keep both drafts unmerged, no deployment/P3.

Separate draft stacked on revised P2 #143 (`0d929b3`), main `01757c0` incorporated. All 12 legacy reader URLs permanently redirect to the existing Arena library. Registry yields 121 retained readers and 138 sitemap URLs. Arena/imported/authored identities, grading hashes, historical records, five Guided exercises, auth and schema remain intact. See [implementation, SEO consequences and verification](LEGACY_PRACTICE_RETIREMENT.md). Exact final head and CI are recorded on the draft PR. No operator installation. Keep both drafts unmerged, no deployment/settings/P3. The existing native IPhO 2026 source-label audit mismatch remains a separately recorded concern.


## P2 Lobby design reversal (12 November 2026)

Final review correction (12 November 2026): #143 now keeps four primary links and places all six crawlable topic anchors below the unchanged Lobby. Original Dashboard captures are preserved, homepage captures updated. Focused95/render24/browser205/session661 and eight contrast combinations pass, as do TypeScript/lint/build. Exact head and CI are on #143. #146 must incorporate this head and separately mark its changed marking guide pending owner editorial approval. Keep both draft and unmerged, no deployment/P3.

Draft PR #143 replaces the rejected standalone homepage cards with the existing Dashboard/Overview and minimum public discovery header. Real Arena recommendation is present before hydration and existing unsolved selection remains. Auth/cache/metadata/database contracts are unchanged. See [checkpoint and tests](SEO_P2_HOMEPAGE.md). Exact final head and full CI are on the PR. Keep draft, do not merge or deploy. Next authorized batch is a separate draft PR retiring only the 12 legacy practice URLs, preserving their historical records and grading contracts. No P3.


## SEO P2 public homepage (11 November 2026)

Branch `codex/seo-p2-public-home` implements the server-rendered public product lobby from `b3912ce` and incorporates frozen main `01757c0` without changing upstream account-deletion, reader/progress code or activation prerequisites. The member session branch, root metadata/private-no-store, old dashboard queries, reader URLs and publication policy remain unchanged. See [checkpoint, verification and screenshots](SEO_P2_HOMEPAGE.md). The draft PR records the exact final head and GitHub checks. No merge or manual deployment. The owner cancelled P3. Stop after the P2 draft PR and report. Further library work needs separate authorization.

## B5 account deletion readiness

The owner now approves account-wide erasure/de-identification while preserving appropriately licensed published content and other students’ work. B5 still stops before runtime implementation because mixed-subject immutable case/evidence text needs a verified redaction/adjudication mechanism or a defined limited-retention exception. See [the precise remaining privacy gate](ACCOUNT_DELETION_READINESS.md) and [the inactive prospective licence/consent design](PUBLICATION_LICENSE_PROPOSAL.md). PR #140 remains draft and unmerged. No deletion endpoint, migration, privilege, active Terms, flag or Production change.
## SEO P1 technical corrections (10 November 2026)

Branch `codex/seo-p1-technical` starts from `18ed7a48`. Corrects the authoring robots boundary and Modern physics title only, with dated SEO counts in SEARCH_AND_AI_VISIBILITY.md. Parser-based tests cover exact/query/nested authoring paths, authored-reader access, Googlebot and generic crawlers, and non-production denial. Authored noindex/nofollow, canonicals, sitemap policy and public anchors are preserved. `robots-parser` is a pinned test-only dependency. Local Node 22.23.1 verification: 84 focused SEO/render checks pass, Next typegen/TypeScript and zero-warning lint pass. Exact-head GitHub CI and merge remain pending publication of the P1 PR. No manual deployment or production operation. Stop after P1, no P2.

## Four rating bands (10 November 2026)

Implementation `e36f20e5dcd0b52ef1f17d429afd529a6d97845f` starts from main `78abf9fbbb5ee603a465acade520dca2a8b9afb7` on `codex/four-rating-bands`. Beginner is 0 to 800, Intermediate 801 to 1,800, Advanced 1,801 to 2,600 and Mastery 2,601+. The 0 to 4000 scale, stable retained IDs, 1200 starting player rating and Studio presets 500/1200/2100/2800 remain unchanged. Retired fundamentals and numeric filter URLs retain their historical ranges without appearing as choices. No rating value, calculation, grading, schema or source content changes.

Node 22 focused checks pass: 51 server and 59 component/model tests, with one database case deferred to GitHub CI. All 4001 valid integer ratings and every requested boundary are covered. Next type generation, TypeScript, zero-warning lint and changed browser-script syntax checks pass. Full CI is authoritative on GitHub after push and is not duplicated locally. The PR records the final head, checks and merge outcome. No operator installation or manual deployment. Existing activation prerequisites remain intact. Stop after this PR or merge verification, with no APhO work.

## IPhO 2026 final local CI replacement (10 November 2026)

The owner authorizes local CI replacement and a normal guarded merge of [PR #139](https://github.com/Physcratic/physcratic/pull/139), starting at `1778fd3d4db6a0d3522bcef0c3563292b65467ea`. Main advanced through #134, #136 and #137 to `b1db1777db683d87ea121b9fbd16686f7750a2f5`. The conflict-free combined tree is `e379042dcdfbbb1db652b7744df340d6ef260cec`. All upstream application and contract files are preserved. [Commands, job-isolation correction, environment, completed CI and remaining browser/merge gates](IPHO_2026_FINAL_QA.md). Full server 830 pass, 27 database skips and one inherited TODO. Separate PostgreSQL 18.6 run 193 pass, components 156, release guards 58 and operator guards 5 pass. Frozen install, offline guards, typegen/typecheck, zero-warning lint, guarded normal-local-.next build and focused 42 pass.

The final guest/synthetic signed-in sweeps, exact final head/tree and merge outcome are recorded on the PR before the merge decision. Actions remains unavailable, not passing. No code fix, new physics review or source correction. T1 1950, T2 2050 and T3 1850 remain unchanged, with 103 imports and 121 estimates. Preserve every source flag and default-OFF/operator prerequisite. No manual deployment, Production SQL, settings/billing, flag or README operation. Stop after merge verification or a blocked report. Earlier draft-only entries describe their historical batches.

IPhO 2026 rating recalibration (10 November 2026): draft PR #139, reviewed from `41515fa1fd89aba81431d0d513ace3432c522468` with main `5a82bb0e5dfb0f3496c89e1763b71ea3cc744658` already included. T1 1950, T2 2050 and T3 1850 supersede the earlier import estimates. [Full-source reasoning, global comparisons and T1 at 1800](IPHO_2026_DIFFICULTY_REVIEW.md). Focused 65, TypeScript and zero-warning lint pass. Source content, historical estimates/ledger and contracts are unchanged. No full sweep, merge, deployment or next implementation batch. Final combined IPhO release QA remains pending.

IPhO 2026 native import, Batch 3 (10 November 2026): draft [PR #139](https://github.com/Physcratic/physcratic/pull/139), T3 implementation `29720ac0d14ec7c1e7ab136673c43db92c53f966`, reconciled implementation `a0e98860e1ee9c99a8e231d8bf7698d1fb272523`, tested tree `f4b6fbd099c72bfba364c582f636b6a0bbc5404c`. Incorporates main `5a82bb0e5dfb0f3496c89e1763b71ea3cc744658` and preserves #133's default-OFF backend unchanged. T1/T2 remain intact. T3 includes ten subquestions, six source pages, the full table, three source diagrams and both PDFs. Counts are 103 imports and 121 estimates. [2200 assessment, source flags and focused QA](IPHO_2026_T3_NATIVE.md). Focused 91, type/lint/build and eight T3 browser combinations pass on the reconciled tree. Actions remains unavailable. Next is separately authorised final combined IPhO QA and review, not APhO or a merge in this batch. No deployment, SQL or activation.

IPhO 2026 native import, Batch 2 (10 November 2026): draft [PR #139](https://github.com/Physcratic/physcratic/pull/139), implementation `df31d1f02f5b940ba15f99e6d55b0e2afcfe782b`, tested tree `5ea4dfa6cafd4e51cc8ed7c926e2570e89a12cda`, reconciles merged #132 main `942be99148870b834767fbc212e649127abb3b93`. T1 remains intact. T2 adds all eight subquestions, nine source pages and thirteen diagrams using the same renderer. Counts are 102 imports and 120 estimates. [Traceability, three source flags, 2300 estimate and verification](IPHO_2026_T2_NATIVE.md). Full server/components, type/lint/build and focused native/expression browsers pass locally. Remote Actions remains unavailable. Next is a separately authorised T3 import and final combined IPhO QA on this draft. Do not merge or deploy. No operator installation.

IPhO 2026 native import, Batch 1 (10 November 2026): `codex/ipho-2026-native`, implementation `8b5fb23490346283156f2b0df1e795d2cd89eda8`, reconciles main `035be5793e30888dec22216247c9f28916a221cb`, including #128. Only T1, Three problems, is added. The existing native renderer includes complete statement/solution text, four precise source figures and original PDF references. Counts are 101 imports and 119 editorial estimates. [Page comparison, source hashes, six source issues and verification](IPHO_2026_NATIVE.md). No historical estimate or source is rewritten. Draft only. Next action is T1 review, then a separately approved T2 batch on the same draft PR. No merge, deployment or operator installation.

Olympiad host flags (10 November 2026): branch `claude/olympiad-host-flags`, implementation `cd049d2903b17df844e16b682be40749d74c5cee`, follows merged #135 main `40ced00d20c4ef01f34b6cedf80caa8c06bc2a47`. Verified metadata covers all 44 imported editions and 100 cards, including joint and online hosts. See [mapping, sources and local checks](OLYMPIAD_HOST_FLAGS.md). Draft PR only, no merge or deployment. Next action is review of this small card change. No operator installation is required. Concurrent #133/#134/#136/#137 have no card/lookup collision, shared engineering-document additions need normal reconciliation.

Editorial difficulty review (10 November 2026): [PR #135](https://github.com/Physcratic/physcratic/pull/135) reviews all 118 static estimates and changes 62. Implementation `73e26b6c7954258cf63b7f3bbd70f61a46d9ac0f` follows fetched main `ab8881007fa6fe040b87a1b0fdb6a85e2d12b295`. See [review table, source limits and verification](PROBLEM_DIFFICULTY_REVIEW.md). Current task ends with this open PR. Next action is human review of estimates and the 11 source issues, including the provisional infinite-V value. No merge or deployment is authorised by this task.

Temporary manual QA (9 November 2026): see [evidence and outstanding gates](MANUAL_QA_2026-11-09.md). A separate reproduced contest account-isolation fix is awaiting independent review. PR #122 stays unmerged, Firefox/WebKit qualification remains blocked, and no launch/enforcement follows local testing.

## Friday B3 reader metadata checkpoint (10 November 2026)

Branch `codex/friday-b3-reader-metadata` explicitly depends on B1 PR #132 at `6dba304ff65f701ae1b03d382ea6de6fb71cb80e`. The separate draft PR records its final head. B2A/B2B are independent. [Reader metadata contract](READER_METADATA.md) covers shared title/tag/estimate presentation and a separate current-public-consent author projection. Existing profile/authorship gates remain OFF by default, with zero disabled client polling or database/session loader calls. No mutable profile field enters a revision, and no private identity fallback exists.

Privacy qualification is a fresh server snapshot and a client lifetime of 15 seconds from request start. Names clear during revalidation, blur/hidden, failures and revision changes. Withdrawal cannot instantly erase already delivered data across devices without a push channel. Keep the existing flags OFF if zero-delay remote revocation is required. This does not authorize profile launch or any flag operation. Local PASS: Node 22 frozen install, typegen/TypeScript, zero-warning lint, offline guards, guarded build, 795 server tests plus 25 DB skips and one inherited TODO, 147 components, 9 disposable PG attribution checks, 28 metadata browser checks, 50 preserved B1 expression checks, 40 built guest reader functional/contrast combinations and the built default-off/unreachable-schema HTTP smoke. Actions usage, missing Firefox/WebKit, real providers/Preview and physical devices remain unqualified. Exact head and results are in the PR. No schema, grant, grading, rating, deployment or CSP change. Next is scoped B4 practice/Arena layout.

## Friday B4 solving layout checkpoint (10 November 2026)

Branch `codex/friday-b4-solving-layout`, explicitly based on B3 PR #136 at `7d508f27c4b9a6df2fdfe71c7a83d98141aa8cb3`. See [layout and reconciliation contract](SOLVING_LAYOUT.md). Practice/Arena now have a flexible reading column and desktop sticky, viewport-bounded keyboard scroll rail. Mobile stays in normal single-column flow. Arena inputs remain mounted across public document tabs, identity changes reset to statement, and practice solutions stay left without rail overlap. No input/grading/recovery/source/SSR contract changes. Imported/corpus/guided/contest scope is deferred.

Local PASS: Node 22 frozen install, typegen/TypeScript, zero-warning lint, offline guards, 795 server tests plus 25 DB skips and one inherited TODO, 147 components, guarded production build, 68 real built-page layout/keyboard/recovery/axe checks and 40 existing guest reader functional/contrast combinations. Minimum text/border contrast is 4.64:1/3.70:1, with zero failures. No backend/schema change requires a new database test. Exact final head and provider/device/CI limits are recorded in the separate draft PR. Preserve B2B's resetToken property when combining branches and requalify the combined tree. No schema, provider, settings, flags, deployment or CSP operation. All implementation PRs remain drafts for independent review.

Baseline: main `a4a75c292fc0a9d6392e25f92818e454d6ffb4eb`, verified 4 November 2026. Source: [community guidebook](COMMUNITY_GUIDEBOOK.md); current code and [status](COMMUNITY_STATUS.md) take precedence over stale planning claims.

| Priority | Workstream | State / acceptance |
| --- | --- | --- |
| Ready for independent review | Friday B1 expression input/recovery | [Draft PR #132](https://github.com/Physcratic/physcratic/pull/132), branch `codex/friday-b1-expression-recovery` from `ab88810`. Implementation `9a9d400`. Review only. Preserve 180-character server limit and retry/identity contracts. See BETA_READINESS.md and current handoff. No merge or deployment |
| Complete | Authoring/revisions, student reading/submissions/grading, taxonomy, Learn, P1 | Preserve contracts and regressions |
| Complete | Community 2A/2B1/2B2/3A/3B | PRs #90/#95/#98/#101; code merged, operator deployment/enablement remains unverified |
| Complete, production locked | Threaded discussion (Batch 4) | [PR #106](https://github.com/Physcratic/physcratic/pull/106), merge `a01836e71521ffbb4686f9b360e355c47fdd2a50`. Threads, reactions, owned edits, soft deletion and abuse controls. Default OFF and production-locked until Batch 5 |
| Complete | Persistent agent memory and browser/CSP regression infrastructure | [PR #105](https://github.com/Physcratic/physcratic/pull/105), reconciled with Batch 4 without runtime/schema changes. CI triggers include shared source/fixtures, migrations, dependency manifests and build configuration. Merge authorised after exact-head workflows pass, then stop |
| Complete, production locked | Moderation backend (Batch 5A) | [PR #109](https://github.com/Physcratic/physcratic/pull/109), merge `a9bff60a1ad7ab408875d3e06b432d5a1cf21925`, exact-head CI #190 and browser #3 green. Reports, staff decisions, evidence/audit, create/edit policy, locks and appeals. See [status](COMMUNITY_STATUS.md). Production lock intact; no SQL or feature enablement |
| Complete, production locked | Moderation dashboard/integration (Batch 5B) | [PR #112](https://github.com/Physcratic/physcratic/pull/112), merge `cded70fa4174acd0f79512ced7ae4d5fa73da9f8`, exact-head CI #193 and browser #4 green. Dashboard, reports/history/appeals, bounded operator maintenance and launch runbook. Default-off UI, original production lock intact. See COMMUNITY_STATUS.md |
| Complete, production locked | Batch 5B completion | [PR #115](https://github.com/Physcratic/physcratic/pull/115), merge `4b4e0d7bd4f63f59b6078334456e7523ac6b4403`, approved head `5946de97823c139b934ffba96b1eedcf0d2f6d5b`, exact-head CI #197/browser #6 green. Fixed-intent confirmation, numeric audit pagination and expanded integration tests. Explicit user merge approval received. See current handoff |
| Complete, operator installation pending | Security S1 | [PR #119](https://github.com/Physcratic/physcratic/pull/119), merge `a988056a157171db5f77e8470683fedc1cceb1e2`, exact-head CI #207/browser #7 green. Additive 0015 privileged medal routine hardening, policy v3 confusable/domain holds, exploit and compatibility regressions. No launch or production operation |
| Separate explicit user decision required | Operational launch review | Approved retention/privacy policy, private providers, staffing, load/staged verification and a reviewed production activation design. Current launch NO-GO |
| Blocked | Community installation/grants/flags/deployment | User/operator only. Merged migrations 0001–0014 immutable; follow existing reviewed status procedures |
| Blocked | CSP provider/adapter/cloud qualification | [X3C](CSP_X3C.md), [provider setup](CSP_PROVIDER_VERIFICATION.md); no real-provider/atomic-header/cloud proof. Report-only NO-GO, no active enforcement work |
| Deferred | coaching_inquiry removal, marketplace, rated contests, follows/graphs | No approved implementation scope; retain existing table/data |

Freshly fetch main and check open PRs before a batch, before assigning migration IDs, and before delivery. Batch 3B PR #101 superseded alternative PR #102; the latter is closed and must not be cherry-picked. Preserve the merged API, tables, flags and count semantics. Do not rebuild completed Batches 3B or 4, edit migration 0013 or remove the discussion production lock.

Successful CI/merge does not establish deployment or authorise SQL/grants/flags. The current session authorises only Batch 5B implementation/PR/merge after green checks, followed by a stop. No deployment or production activation is authorized. PR #105 integration is complete.

Batch 5B completion follows independently merged PR #112 without duplicating its UI and is now integrated through [PR #115](https://github.com/Physcratic/physcratic/pull/115). Stop after merge verification and this documentation-only handoff. Exact next milestone: a separately authorised operator readiness review. Production launch remains NO-GO with the original lock, operator prerequisites and separate approval unchanged.

Current authorization: Security S1 remediation/PR/merge after exact-head green checks, then stop. Existing production discussion lock remains intact; installation/activation is separate user/operator work.

Phase 6A: documentation-only release audit complete. See COMMUNITY_RELEASE_READINESS.md for evidence states and approvals. Exact next phase: operator-authorised read-only inventory and isolated preproduction rehearsal (Phase 6B). Launch remains NO-GO; no Production action is authorised by this checklist.

Friday release, 10 November 2026: B1 expression recovery is merged in main `942be99148870b834767fbc212e649127abb3b93`. B2A PR #133 adds private practice/Arena persistence with an exact server-only `PRACTICE_CHECKS_ENABLED=true` opt-in and default-OFF endpoints that do not import DB/session bindings. The owner now authorizes a code-only squash merge after exact-head QA. Migration 0017 is unchanged and no installation, grants, deployment or activation is authorized. The approved policy preserves active-account history and erases it on controlled verified account deletion. That deletion workflow and actual provider backup-retention/expiry facts remain prerequisites before activation. See [contract and prerequisites](PRACTICE_PROGRESS.md) and current handoff. Next is B2B PR #134, which must reconcile the final B2A merge and preserve this gate and guest fallback, followed by B3/B4 where safe.


Friday B2B, 10 November 2026: `codex/friday-b2b-progress-ui` explicitly depends on B2A PR #133 at `6c4da5862a205719a7749a4f0a2337568c020ca3`. Private saving/recovery, current-version dashboard/history and practice/Arena links are implemented with local browser/PG evidence. See the current handoff and [progress contract](PRACTICE_PROGRESS.md). No additional schema, deployment or activation. Next is B3 metadata/privacy, then B4 practice/Arena layout where safe.

B5 implementation continuation (11 November 2026): custom default-OFF account-wide erasure/de-identification and retryable private cleanup are implemented in PR140 with additive0018. Owner-approved mixed-evidence policy is implemented through necessary-field plans and independent staff approval rather than indefinite originals. Unknown publication rights restrict display independently of personal deletion. B6 remains operator qualification and separately authorized activation, including actual ledger/grants, approved retention/legal-hold process, provider backup/restore behavior and reliable staffed cleanup. See `ACCOUNT_DELETION_READINESS.md`. Native Better Auth deletion and practice persistence remain OFF.


## 11 November 2026: unified solving and dashboard history

Branch `codex/unified-solving-and-progress` starts from main `77ac5de582cabbb5118c12ec605db94229fc4bad`. Practice, Arena, imported and authored problem pages share the community-style ProblemRoom frame and AnswerWorkspace rail. Imported readers use the shared title, tags and estimated-difficulty badges and keep the submission panel mounted beside document tabs. Public opted-in author names display as Published by followed by the display name. Disabled, withdrawn or unavailable attribution produces no invented identity or generic publisher claim. Existing attribution/profile flags and consent boundaries remain unchanged.

Authored expression fields wait for MathLive rather than exposing a transient plain input. Failed loading offers an explicitly labelled plain-expression/LaTeX fallback and a full-page reload that preserves the existing recovery journal. Submission limits, grading, immutable retries and account/revision boundaries are unchanged.

New private GET /api/problem-progress aggregates the existing gated Practice/Arena reader and current-published authored progress. Community progress uses the authenticated student's saved attempts, all required automatically checkable parts and sticky correctness. Manual/inconclusive work is not incorrect. Old revisions and unpublished titles never enter current lists. Source failures are explicitly partial or unavailable, never fabricated zero totals. Account-boundary rejection suppresses all combined output. Successful saves invalidate the combined dashboard/history cache. No migration, dependency, production setting, feature activation or deployment change.

Verification on local Node24.17.0: frozen pnpm10.34.9 installation, Next type generation/TypeScript and zero-warning lint passed. Focused server tests36 pass with3 PostgreSQL-dependent skips, plus21 component/input checks. Chromium expression recovery47 and shared-room layout/keyboard/axe64 checks pass across desktop/mobile and light/dark. The new SQL integration scenario also passes on disposable PGlite0.5.16 using real PostgreSQL query semantics. This is not a full PostgreSQL18.6 migration/grant qualification. The tracked PostgreSQL test is available to normal CI.

Full local suites were attempted: server721 pass,48 fail,29 skip,1 TODO; component151 pass,7 fail. They are NOT green: this partial source checkout lacks generated corpus/media/migration assets and Windows shell/path assumptions break existing tests, including the existing copy-test offender allowlist. Production build is blocked by the absent coaching cutout asset. No test was weakened to hide these limits. Final exact-head remote CI belongs to the draft PR. Full installed-schema progress browser, real providers/Preview, physical devices and independent review remain unverified. No merge or deployment is authorized by this work.
