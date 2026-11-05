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

## Judgement calls

- (4b) The side preview from Easy is gone. The question box already shows rendered maths, and "Try an answer" sits under the key.
- (4b) Topics sit above the rights tick, not below Publish, so they are set before the problem is public.
