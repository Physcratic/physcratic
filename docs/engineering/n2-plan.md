# Overnight run N2: plans and judgement calls

Each phase gets its plan here before the work, then the judgement calls under "Judgement calls".

## Phase 4b plan: Simple mode (Problem Studio)

1. Easy becomes Simple. Files, test names and the saved mode value follow ("easy" in an old browser still opens Simple).
2. One column, about 720px wide and centred. No side preview. Big labels, 2px field borders, a ring on the field you are in. Top bar: My drafts, Simple | Advanced, save status.
3. Per part, in order: "What's the question?" (Word-like box), "Add a picture (optional)", "Final answer. We check students against this.", "Try an answer", "Worked solution (optional)". Then "+ Add another part".
4. The question box is a contenteditable. `$`, Alt+= or the Equation button drops an equation chip at the cursor. A chip shows KaTeX, a click opens a MathLive panel under the box. It saves as the existing text and math spans of the part's first text block.
5. Picture: drag, paste or pick. It reuses the Advanced upload (one shared hook), saves an image block plus the statement-image attachment and asks "Describe the picture" (required by the existing publish rule).
6. Answer key: the Phase 2 maths field or a number with a Unit, symbols detected, "Try an answer" right under it. Same checker as students.
7. Title comes from the first words of the first question until the author edits it. Placeholder follows the CONTRIBUTING rule.
8. Rights tick and Publish (the one primary button). Topics: one optional row of six chips.
9. Hints, tags, tolerance, conditions, sections and PDFs stay in Advanced and are kept untouched. Advanced text fields get an Equation button that splits the text at the cursor.
10. No new saved field. Image on a draft that is not saved yet waits for the first save.
11. Ideas built now: title from question, paste a screenshot into the question, question symbols offered on the answer palette, `$` and Alt+= shortcuts.
12. Ideas for later: unit suggestion from the question words, photo of handwriting to text, warn when the key uses a symbol the question never names, starter templates, a one-tap student view, import from LaTeX, duplicate a problem.
13. Verify: unit tests, the Simple browser script (equation, picture, expression key, at most 3 clicks besides typing), Studio and authored suites, sweep, CI.

## Phase 4c plan: guided tours

1. No new dependency. A small engine in `components/tour/` (about 300 lines) beats driver.js here: it needs no overlay, so it can never block the page.
2. A non-modal card (`role=dialog`, `aria-modal=false`) with Back, Next and Skip, all 44px. Esc closes, arrow keys move, focus goes to the card heading on each step, a polite status line announces "Step 2 of 6". A ring marks the target and never takes clicks.
3. Targets are `data-tour` attributes only. A step lists one or more names and uses the first that is visible, so a hidden desktop sidebar falls back to the phone button. A step with no visible target is skipped.
4. At 375 the card sits at the bottom of the screen. Each step scrolls its target into view above the card. At 1440 the card sits beside or under the target and never over it.
5. Welcome tour: library, topics, a problem card, then (on the problem page) answer box and palette, Check, hint, solution, then Coaching and Settings. State lives in sessionStorage while it runs, so it carries across the page change. "Open one for me" is the only step that navigates, and only when pressed.
6. Studio tour: question, Equation, picture, final answer, Try an answer, Publish. Only in Simple mode.
7. Seen flags in localStorage (`physcratic.tour.<id>.v1`), always in try/catch. First visit starts it after a short pause. Not under browser automation (`navigator.webdriver`), so existing suites keep working. A "?" Help button in the dashboard bar and the Studio bar replays it. Settings gets "Replay tours" through a small card added to `app/settings/page.tsx`.
8. Tests: a unit test that reads every `data-tour` name in `components/**` and `app/**` and checks each tour step's names exist, and a browser script that runs both tours at 375 and 1440 in light and dark and runs the contrast and axe checks with a tour open.

## Judgement calls

- (4b) The side preview from Easy is gone. The question box already shows rendered maths, and "Try an answer" sits under the key.
- (4b) Topics sit above the rights tick, not below Publish, so they are set before the problem is public.
- (4b) A picture needs a saved draft, so "Choose a picture" waits for the first save (about half a second after typing starts) and says so.
- (4b) The title field always shows. It is filled from the first question and follows it until the author edits it.
- (4b) Pictures in the Simple page are limited to one per part. More pictures stay in Advanced.
- (4b) Intro text that Easy or Advanced saved in the shared context shows above Part a in Simple, only when it exists.
- (4b) Chips for equations are 44px tall, so they pass the tap-size rule without an exemption.
- (4c) The tour engine adds `data-tour` attributes to `components/kokonutui/**` and `components/physics/**`, which CLAUDE.md lists as owned by the UI branch. The attributes change no behaviour.
- (4c) The tour does not auto-start under browser automation, so existing browser suites are not covered by a card.
