# UX baseline

Phase 0 audit, 5 November 2026. This page changes no product code. It records what the solving screens and Problem Studio do today, so later phases can be measured against it.

Base commit: `ed8c860` on `main`. Everything below was measured on a production build of that commit made in a clean worktree, with no `.env` file. The Arena and practice screens ran with no database. Problem Studio and the authored student page ran against a throwaway PostgreSQL (postgres user, loopback only), which has been removed.

## Summary

| Question | Answer |
| --- | --- |
| Elements on the practice screen (1440 / 375) | 44 / 29. Needed 12, optional 29, clutter 3 at 1440 |
| Elements on the Arena screen (1440 / 375) | 61 / 46. Needed 34, optional 24, clutter 3 at 1440 |
| Elements on the Guided reader (1440 / 375) | 77 / 62. Needed 13, optional 37, clutter 27 at 1440 |
| Elements on the authored screen (1440 / 375) | 28 / 28. Needed 10, optional 10, clutter 8 |
| Clicks and keys to solve a practice problem | 2 clicks and 3 keys to answer and check, 0 or 1 more click for the solution |
| Clicks and keys to publish a one-part expression problem | 8 clicks, 1 select, 6 typed fields, 146 characters |
| Semicolons in Arena text | 2 in statements and solutions, 114 in the help line under answer boxes |
| Where the dashboard problem comes from | The day number, modulo the 12 practice problems. Not the user |
| Baseline sweep | 0 distinct failures. Lowest text 4.64:1, lowest border 3.41:1 |

## 1. The four solving screens

### Method

`tests/phase0-solve-audit.browser.mjs` opens each screen signed out and lists every visible element in document order. Runs of text and equations are merged into one line, and controls inside closed disclosures are left out. It then types a wrong answer, checks it and opens the solution. `tests/phase0-authoring.browser.mjs` does the same for the authored screen, using the real student component and API on the throwaway database. The needed, optional and clutter marks are my judgement:

- **Needed:** the reader cannot read, answer, check or see the solution without it.
- **Optional:** helps some readers, or is site navigation.
- **Clutter:** repeats something, explains a disabled control, shows internal detail, or belongs to another screen.

Every control on all four screens is at least 44px tall at both widths, apart from the 1px skip link, which shows on focus.

### Clicks and keystrokes

All counts are for a signed-out reader. A click is a pointer click or a tap. Keys are typed characters. "Tabs" is Tab presses from the top of the page to the answer box.

| Screen | Read | Answer | Check | Solution | Tabs to answer box (1440 / 375) |
| --- | --- | --- | --- | --- | --- |
| Practice (`incline`) | 0 clicks, text is on screen | 1 click, 3 keys (`4.9`) | 1 click, or 1 Enter key | Opens by itself after a right answer. Otherwise 1 click on Show solution | 26 / 10 |
| Arena (`arena-a-grin-and-a-wiggle`), part (a) | 0 clicks, statement is on screen | 1 click, 38 keys | 1 click | 1 click on the Worked solution tab | 24 / 8 |
| Arena, all 7 boxes | 0 | 7 clicks, 202 keys (part b description is self-review) | 1 click | 1 click | |
| Guided reader | 0 clicks, text is on screen | Signed out the working box is disabled, so 0. Signed in: 1 click and any text | None. The part has no automatic check | 1 click on Reveal official solution, then 1 on Mark as reviewed | Not reachable signed out |
| Authored (`m*a` answer) | 0 clicks | 1 click, 3 keys | 1 click on Submit answer | 1 click on View worked solution | |

Page height at 1440 / 375: practice 1467 / 1955px, Arena 4042 / 5460px, Guided reader 3593 / 4219px. Controls in the first screenful at 1440 / 375: practice 29 / 10, Arena 24 / 8, Guided reader 42 / 25.

Needed / optional / clutter counts:

| Screen | 1440 | 375 |
| --- | --- | --- |
| Practice | 12 / 29 / 3 | 12 / 15 / 2 |
| Arena | 34 / 24 / 3 | 34 / 10 / 2 |
| Guided reader | 13 / 37 / 27 | 13 / 23 / 26 |
| Authored | 10 / 10 / 8 | 10 / 10 / 8 |

At 375 the list is the 1440 list without the 16 side-bar entries (14 links and 2 group headings) and with one extra control, Open navigation.

### Practice problem at 1440 (`/dashboard/problems/incline`)

| # | Element | Class |
| --- | --- | --- |
| 1 | a Skip to content | needed |
| 2 | a Physcratic home | optional |
| 3 | a Problem Studio | optional |
| 4 | h2 Workspace | optional |
| 5 | a Lobby | optional |
| 6 | a Problems 130 | optional |
| 7 | a Contests | optional |
| 8 | a Rankings | optional |
| 9 | a Coaching Medallist coaches | optional |
| 10 | h2 Explore | optional |
| 11 | a Mechanics | optional |
| 12 | a Electromagnetism | optional |
| 13 | a Waves | optional |
| 14 | a Thermodynamics | optional |
| 15 | a Optics | optional |
| 16 | a Modern | optional |
| 17 | a Settings | optional |
| 18 | a Workspace | clutter (duplicate of a side-bar link) |
| 19 | a Coaching | clutter (duplicate of a side-bar link) |
| 20 | a Back to collection | needed |
| 21 | text (1 blocks, 38 chars) "Difficulty 900 · Illustrative estimate" | optional |
| 22 | h1 A block on an incline | needed |
| 23 | a 1 Step 1: Read | optional |
| 24 | a 2 Step 2: Answer | optional |
| 25 | a 3 Step 3: Check | optional |
| 26 | a 4 Step 4: Solution | optional |
| 27 | h2 1 Step 1: Read the problem | needed |
| 28 | text (3 blocks, 182 chars) "A 2 kg block rests on a smooth, friction" | needed |
| 29 | h2 2 Step 2: Answer | needed |
| 30 | text (2 blocks, 107 chars) "Type your answer in each box. Checks are" | optional |
| 31 | input:text Answer Final answer (m/s²) | needed |
| 32 | text (1 blocks, 121 chars) "Use the displayed unit, without a unit s" | needed |
| 33 | summary How to type an answer | optional |
| 34 | summary Optional working · not graded or saved | optional |
| 35 | h3 3 Step 3: Check | needed |
| 36 | button Check answer (disabled) | needed |
| 37 | button Clear answers | optional |
| 38 | text (1 blocks, 56 chars) "Type an answer above to turn on the Chec" | clutter (explains a disabled button) |
| 39 | button Need a hint? | optional |
| 40 | h2 4 Step 4: Solution | needed |
| 41 | text (1 blocks, 53 chars) "Try the problem first. The solution show" | optional |
| 42 | button Show solution | needed |
| 43 | button Start over | optional |
| 44 | a Next problem | optional |

### Arena problem at 1440 (`/dashboard/problems/arena-a-grin-and-a-wiggle`)

Rows 1 to 19 are the same side bar and top bar as the practice screen.

| # | Element | Class |
| --- | --- | --- |
| 1 | a Skip to content | needed |
| 2 | a Physcratic home | optional |
| 3 | a Problem Studio | optional |
| 4 | h2 Workspace | optional |
| 5 | a Lobby | optional |
| 6 | a Problems 130 | optional |
| 7 | a Contests | optional |
| 8 | a Rankings | optional |
| 9 | a Coaching Medallist coaches | optional |
| 10 | h2 Explore | optional |
| 11 | a Mechanics | optional |
| 12 | a Electromagnetism | optional |
| 13 | a Waves | optional |
| 14 | a Thermodynamics | optional |
| 15 | a Optics | optional |
| 16 | a Modern | optional |
| 17 | a Settings | optional |
| 18 | a Workspace | clutter (duplicate of a side-bar link) |
| 19 | a Coaching | clutter (duplicate of a side-bar link) |
| 20 | a Back to Physcratic Arena | needed |
| 21 | h1 A GRIN and a Wiggle | needed |
| 22 | text (5 blocks, 166 chars) "Follow rays through a graded-index cylin" | optional |
| 23 | tab 1 Problem statement | needed |
| 24 | tab 4 Worked solution | needed |
| 25 | h2 Problem statement | optional |
| 26 | text (3 blocks, 537 chars) "A cylinder is made of a material whose r" | needed |
| 27 | image Left: off-axis source and sinusoidal rays in a GRIN cylinder. Right: parallel in | needed |
| 28 | h3 (a) | needed |
| 29 | text (1 blocks, 84 chars) "Find the ray trajectory 𝑟 ( 𝑧 ) r(z) t" | needed |
| 30 | h3 (b) | needed |
| 31 | text (1 blocks, 138 chars) "The rays emitted by the point source fir" | needed |
| 32 | h3 (c) | needed |
| 33 | text (1 blocks, 286 chars) "When terms up to third order in 𝜃 0 θ 0" | needed |
| 34 | h3 (d) | needed |
| 35 | text (1 blocks, 501 chars) "For the remaining parts, refer to the ri" | needed |
| 36 | h3 (e) | needed |
| 37 | text (1 blocks, 172 chars) "In the arrangement of part (d), includin" | needed |
| 38 | h2 2 Step 2: Answer | needed |
| 39 | text (2 blocks, 116 chars) "Type your answer in each box. Checks are" | optional |
| 40 | input:text a First-order signed ray trajectory | needed |
| 41 | text (2 blocks, 152 chars) "Signed transverse r; k > 0, /kr₀/ and /θ" | needed |
| 42 | input:text b First positive image z coordinate | needed |
| 43 | text (2 blocks, 71 chars) "Paraxial approximation; k > 0. Symbols: " | needed |
| 44 | input:text b Image transverse coordinate | needed |
| 45 | text (1 blocks, 69 chars) "Signed transverse coordinate; same-size " | needed |
| 46 | h5 b Describe the image | optional |
| 47 | text (1 blocks, 54 chars) "c Third-order image radius at the first " | optional |
| 48 | input:text c Third-order image radius at the first paraxial image | needed |
| 49 | text (2 blocks, 220 chars) "Define θ_m as the nonnegative symmetric " | needed |
| 50 | input:text d Effective focal length | needed |
| 51 | text (2 blocks, 110 chars) "Outside index one; short-cylinder branch" | needed |
| 52 | input:text d Back focal length | needed |
| 53 | text (2 blocks, 126 chars) "Same short-cylinder branch and outside i" | needed |
| 54 | input:text e Third-order image radius at the external focus | needed |
| 55 | text (1 blocks, 213 chars) "a is the positive symmetric aperture rad" | needed |
| 56 | summary How to type an answer | optional |
| 57 | summary Optional working · not graded or saved | optional |
| 58 | h3 3 Step 3: Check | needed |
| 59 | button Check answer (disabled) | needed |
| 60 | button Clear answers | optional |
| 61 | text (1 blocks, 56 chars) "Type an answer above to turn on the Chec" | clutter (explains a disabled button) |

### Guided reader at 1440 (`/dashboard?view=problems&collection=pilot`, first problem)

The reader opens in place, under the whole library. Rows 20 to 43 are library controls.

| # | Element | Class |
| --- | --- | --- |
| 1 | a Skip to content | needed |
| 2 | a Physcratic home | optional |
| 3 | a Problem Studio | optional |
| 4 | h2 Workspace | optional |
| 5 | a Lobby | optional |
| 6 | a Problems 130 | optional |
| 7 | a Contests | optional |
| 8 | a Rankings | optional |
| 9 | a Coaching Medallist coaches | optional |
| 10 | h2 Explore | optional |
| 11 | a Mechanics | optional |
| 12 | a Electromagnetism | optional |
| 13 | a Waves | optional |
| 14 | a Thermodynamics | optional |
| 15 | a Optics | optional |
| 16 | a Modern | optional |
| 17 | a Settings | optional |
| 18 | a Workspace | clutter (duplicate of a side-bar link) |
| 19 | a Coaching | clutter (duplicate of a side-bar link) |
| 20 | h1 Problems | clutter (library title is the only h1, the problem title is an h3) |
| 21 | text (1 blocks, 45 chars) "Browse practice problems and filter by t" | clutter (library controls shown above the reader) |
| 22 | button Random quick practice | clutter (library controls shown above the reader) |
| 23 | tab Physcratic Arena | clutter (library controls shown above the reader) |
| 24 | tab Olympiad archive · 100 | clutter (library controls shown above the reader) |
| 25 | tab Guided exercises · 5 | clutter (library controls shown above the reader) |
| 26 | h2 Search & filters | clutter (library controls shown above the reader) |
| 27 | text (1 blocks, 51 chars) "Pick a topic or type a search, then open" | clutter (library controls shown above the reader) |
| 28 | button All topics | clutter (library controls shown above the reader) |
| 29 | button Mechanics | clutter (library controls shown above the reader) |
| 30 | button Electromagnetism | clutter (library controls shown above the reader) |
| 31 | button Waves | clutter (library controls shown above the reader) |
| 32 | button Thermodynamics | clutter (library controls shown above the reader) |
| 33 | button Optics | clutter (library controls shown above the reader) |
| 34 | button Modern physics | clutter (library controls shown above the reader) |
| 35 | text (1 blocks, 14 chars) "Find a problem" | clutter (library controls shown above the reader) |
| 36 | input:text Find a problem | clutter (library controls shown above the reader) |
| 37 | text (1 blocks, 3 chars) "Tag" | clutter (library controls shown above the reader) |
| 38 | input:text Tag | clutter (library controls shown above the reader) |
| 39 | text (1 blocks, 20 chars) "Estimated difficulty" | clutter (library controls shown above the reader) |
| 40 | button Estimated difficulty | clutter (library controls shown above the reader) |
| 41 | text (1 blocks, 52 chars) "Could not load saved progress. Retry bef" | clutter (library controls shown above the reader) |
| 42 | button Retry progress | clutter (library controls shown above the reader) |
| 43 | button Back to collection | needed |
| 44 | text (1 blocks, 26 chars) "IPhO 2011 · T1 · 10 points" | optional |
| 45 | h2 A Three-body Problem and LISA | optional |
| 46 | text (1 blocks, 28 chars) "0 of 4 reviewed this session" | optional |
| 47 | h3 1 · A three-body problem and LISA | optional |
| 48 | button 1.1: Angular velocity of two gravitating bodies | needed |
| 49 | button 1.2: A stationary third body | needed |
| 50 | button 1.3: Radial oscillations for equal masses | needed |
| 51 | button 1.4: Relative speed in the LISA constellation | needed |
| 52 | h3 Angular velocity of two gravitating bodies | needed |
| 53 | text (4 blocks, 63 chars) "1 Step 1: Read" | optional |
| 54 | h2 1 Step 1: Read the problem | needed |
| 55 | text (2 blocks, 206 chars) "Determine the angular velocity of the li" | needed |
| 56 | summary 1.1 Reading notes & shared constants | optional |
| 57 | button Previous original statement page (disabled) | optional |
| 58 | button Original statement page | optional |
| 59 | button Next original statement page | optional |
| 60 | a Open PDF | optional |
| 61 | a Enlarge 2011 T1 original statement, page 1 | optional |
| 62 | text (1 blocks, 112 chars) "IPhO 2011 · T1 · Page 1 of 3. Original l" | optional |
| 63 | h2 2 Step 2: Answer | needed |
| 64 | text (3 blocks, 96 chars) "Your working" | optional |
| 65 | textarea Your working | optional |
| 66 | text (2 blocks, 61 chars) "Live preview" | optional |
| 67 | summary Equation calculator Try an equation with your own values. | optional |
| 68 | text (1 blocks, 171 chars) "Use Save subpart progress below to keep " | optional |
| 69 | h2 3 Step 3: Check | needed |
| 70 | text (1 blocks, 118 chars) "This part has no automatic check. Compar" | optional |
| 71 | h2 4 Step 4: Solution | needed |
| 72 | summary 1.1 Reveal official solution · 1.1 | needed |
| 73 | button Mark as reviewed | optional |
| 74 | a Sign in to save progress | optional |
| 75 | a Official solution PDF | optional |
| 76 | summary Source, attribution & import review | clutter (provenance and disclaimer) |
| 77 | h5 Learning, not a rating event | clutter (provenance and disclaimer) |

### Authored problem at 1440 and 375

This is the real student component rendered by the test harness, so the app side bar is not part of it. The list is the same at both widths.

| # | Element | Class |
| --- | --- | --- |
| 1 | a Skip to problem content | needed |
| 2 | a Physcratic | optional |
| 3 | text "AUTHORED PHYSICS · PRACTICE" | optional |
| 4 | h1 Phase 0 baseline problem | needed |
| 5 | text "Published revision 1 · hash" | clutter (internal revision label) |
| 6 | button Recheck publication | clutter (maintenance action) |
| 7 | button Problem | optional (view switch) |
| 8 | button My submissions | optional (view switch) |
| 9 | button Download my local work | optional |
| 10 | h2 Section 1 | optional |
| 11 | h3 Part 1 | needed |
| 12 | button Answer part 1 | optional (jump to the form) |
| 13 | text "Find the net force on a 2 kg cart..." (statement) | needed |
| 14 | h2 Submit an answer | needed |
| 15 | text "Part 1 Section" | optional |
| 16 | select Choose part (one option) | clutter (only one part) |
| 17 | text "Pinned revision 1 · hash" | clutter (internal revision label) |
| 18 | textarea Expression answer | needed |
| 19 | text Field help, 183 chars | needed |
| 20 | summary Expression syntax and checker limits | optional |
| 21 | text "Unfinished input is retained locally..." | clutter (storage notice) |
| 22 | button Submit answer | needed |
| 23 | text "0 saved attempts on this part/revision. No permanent per-part cap. Up to 100 new attempts in a rolling 24 hours, 20 submission requests and 60 total requests per minute." | clutter (limits notice) |
| 24 | h2 Worked solution Part 1 | needed |
| 25 | text "Optional, before or after any attempt. Viewing any part assists future attempts..." | optional |
| 26 | button View worked solution | needed |
| 27 | h2 Practice, then reflect | clutter (heading with no task) |
| 28 | text "A grade never reveals private answers..." | clutter (policy notice) |

### What stands out

1. The Guided reader puts 27 clutter elements around the problem. Its only `h1` is the library title "Problems". The problem title is an `h3`.
2. Signed out, the Guided reader's working box is disabled. The page says "Sign in to save progress" only further down. There is no way to try the problem before signing in.
3. The working box on all three reading screens shows a placeholder from the incline problem ("Resolve the forces along the slope. a = g*sin(theta) ..."). It appears on every problem.
4. On the practice screen at 1440 the answer box comes after the side bar's links, 26 Tab presses against 10 at 375.
5. The Arena answer step is 7 boxes below the whole statement. The help line under each box carries the domain and symbols, so it is needed text, but 114 of 165 such lines across Arena contain a semicolon (see section 3).
6. The authored screen shows 8 lines the reader does not need: revision hashes, a Recheck publication button, a one-option part chooser and three limit or policy notices.
7. Only the authored screen keeps a record of an answer. The practice and Arena checks say "Nothing is saved".

## 2. Publishing in Problem Studio

Measured with `tests/phase0-authoring.browser.mjs` against the real editor and API, as a verified author, publishing one section with one part and one expression answer (`m*a`).

### Screens, fields and clicks

| Item | Count |
| --- | --- |
| Screens | 2. The draft list (5 controls), then the editor. The editor is one long page with five numbered anchors (Statement, Parts and answers, Tags, Images and PDFs, Publish). Student preview is a third view and is optional. Publishing keeps you on the editor |
| Controls on the empty editor | 268, of which 242 are topic and method chips |
| Controls on the finished editor | 316, of which 242 are chips. 74 others |
| Form fields on the finished editor | 33: 7 file inputs, 2 search boxes, 3 selects, 12 text boxes, 6 variable checkboxes and 3 text areas |
| Clicks to publish | 8: New problem, Add section, Add part, Add text to part statement, open the answer key, Add variable twice, Publish |
| Selects | 1 (Answer type) |
| Typed fields | 6: title, rights declaration, statement text, expected expression, two variable symbols |
| Characters typed | 146 with the text used in the test |
| Total actions | 15 |

### Required fields

The Publish button stays disabled until the editor reports no blockers. The blockers it showed, in order:

1. "Title and rights provenance required". Needs the title and the rights declaration.
2. "Native statement and at least one part required". Needs a section, a part and some statement text in it.

That minimum is 5 clicks and 3 typed fields. The part's answer type then stays at its default, "Manual / ungraded", so the problem has no checkable answer. To publish a one-expression answer you also open the answer key, change Answer type and type the expected expression. That is 2 more clicks or selects and 1 more field.

Required in practice for an expression problem that can mark a student correct: title, rights declaration, one statement text, Answer type set to Expression, expected expression, and a symbol for every variable in it. The editor enforces the first five. It does not enforce the variables. A key with no declared variables publishes, and every student answer then returns "needs review". `tests/phase0-undeclared-variables.mts` shows `m*a` against `m*a` is `needs-review` with no variables and `correct` with `m` and `a` declared.

### Questions the editor asks that could have a default

| Question | Today | Possible default |
| --- | --- | --- |
| Section and its title | A part cannot exist without a section. The title is empty by default | Create "Section 1" with the first part and hide the title until needed |
| Part label | Defaults to "1", editable | Keep. Ask for a label only when there is more than one part |
| Answer type | Defaults to Manual / ungraded | Default to Expression or Numeric, since most authors want a checkable answer |
| Variables | Typed by hand, one by one, each with minimum, maximum and three checkboxes | Read the symbols from the expected expression and offer them as real numbers |
| Variable minimum, maximum, positive, nonnegative, nonzero | Optional, empty | Hide behind "Add limits" |
| Angle convention | Defaults to Radians, always shown | Show only when the expression uses sin, cos or tan |
| Domain exclusions | Optional text area, always shown | Hide behind "Add exclusions" |
| Rights declaration | Required free text | One tick box for "I wrote this" with the text filled in |
| Content provenance | Defaults to "My original work" | Keep. |
| Source or permission reference | Always shown | Show only for "Used with permission" |
| Estimated difficulty | Optional, always shown | Hide behind "Add details" |
| Topics and methods | 6 topics and 234 methods as chips. Not required to publish | Suggest from the statement text |
| Hints and worked solution | Optional, each with image, text and equation buttons | Collapsed until asked for |
| Numeric tolerance | Absolute 0.01 and relative 0 by default, both shown | Keep the default and show tolerance as an advanced setting |
| Numeric units | Free text, must match exactly | Offer common units |
| Two PDF uploads and file clean-up | Always on the page | Move to a separate "Files" step |

## 3. Arena text

Counted by `tests/phase0-arena-text.mts`, which reads the 18 Arena problems in `lib/arena/source-01.ts` to `source-06.ts` and their answer keys in `lib/archive-grading/source-01.ts` to `source-06.ts`. LaTeX is left out of the counts. Nothing was changed.

| Text | Items | Semicolons | Banned words from CONTRIBUTING.md | Other findings |
| --- | --- | --- | --- | --- |
| Titles | 18 | 0 | 0 | 13 of 18 describe a story and not the physics (my judgement). 3 use the words treaty, conspiracy or riddle |
| Subtitles (summaries) | 18 | 0 | 0 | No slogans and no filler. 3 open with a vague verb: Explore, Follow, Examine |
| Statements | 18 | 1 | 0 | 2 en dashes in compound names. 2 explicit "Hint." lines |
| Part headings | 162 | 0 | 0 | |
| Solutions | 18 | 1 | 0 | 3 en dashes in compound names. 1 "more than a" phrase |
| Answer part labels | 165 | 0 | 0 | |
| Help lines under answer boxes | 165 | 114 | 0 | 1 dash |
| Total | | 116 | 0 | 5 en dashes, all inside names such as the Maxwell-Boltzmann distribution (an en dash in the source) |

Words such as elegant, journey, unlock, craft, seamless, effortless, delve and game-changer do not appear in any Arena title, subtitle, statement, heading, hint or solution. Two-part poetic lines in the sense of the copy rules were not found in statements, hints or solutions. The story tone lives in the titles. The 13 story-led titles are Mind the Gap, The Bubble Treaty, The Cosmic Kitchen, The Phantom Charge, The String That Answered Back, The Dodecahedron Conspiracy, The Gas with Elbows, The Quantum Escape Room, Titan's Double Take, A GRIN and a Wiggle, An Atom with Stage Fright, The Invisible Brake and The Bending Beam Riddle. The other five are descriptive: The Five-Fold Collision, The Clock in the Racing Mirror, The Three-Way Wave Split, The Capacitor's Missing Energy and The Infinite V.

Where the semicolons live:

| File | Semicolons |
| --- | --- |
| `lib/arena/source-04.ts` (The Three-Way Wave Split statement) | 1 |
| `lib/arena/source-06.ts` (The Capacitor's Missing Energy solution) | 1 |
| `lib/archive-grading/source-01.ts` | 14 help lines |
| `lib/archive-grading/source-02.ts` | 18 help lines |
| `lib/archive-grading/source-03.ts` | 17 help lines |
| `lib/archive-grading/source-04.ts` | 13 help lines |
| `lib/archive-grading/source-05.ts` | 20 help lines |
| `lib/archive-grading/source-06.ts` | 32 help lines |

`lib/copy-rules.test.ts` scans `app/` and `components/` only, so none of this is caught by CI. The help lines are the text a student reads under each answer box on the Arena screen.

## 4. The dashboard problem card

The card headed "Recommended problem" (`DailyProblem` in `components/physics/dashboard-highlights.tsx`) gets its problem from `components/kokonutui/dashboard.tsx`:

```ts
const day = Math.floor(Date.now() / 86_400_000);
const dailyProblem = problems[day % problems.length];
```

`problems` is the list of 12 practice problems in `lib/physics.ts`. Everyone sees the same problem. It changes once per UTC day and ignores what the user has solved, their rating and their topic. The card title says "Recommended" while the code and the prop name say "daily", and the page subtitle says "Today's problem, your rating and recommended practice". So the card promises more than it does.

Does any existing API know which problems a signed-in user has solved? In part, and none of it is wired to today's screens:

| API | What it knows | Limit |
| --- | --- | --- |
| `GET /api/progress` | Per practice problem: id, whether any attempt was correct, last attempt time | Reads `practice_attempt`. Rows are written only by `POST /api/progress`, which is called only by `recordResult` in `hooks/use-problem-history.ts`. Nothing calls `recordResult`, so current practice checks create no rows |
| `GET /api/dashboard` | Counts only: `solvedProblems` (distinct correct practice problems), `practiceAttempts`, `savedAttempts`, `archiveReviewed` | No problem ids. Same `practice_attempt` source |
| `GET /api/archive-progress` | Archive tasks the user marked as reviewed | A self-marked flag, not a solved state |
| `GET /api/submissions` | The last 50 solution attempts for IPhO, APhO and EuPhO problems | Rubric-graded and provisional |
| `GET /api/authored-problems/attempts` | Attempts on authored problems | Authored problems only |

Arena and practice checks go through `/api/archive-grade`, which stores nothing. So no API can say which Arena or practice problems a signed-in user has solved from their use of the current screens. Choosing an unsolved problem needs a place to record correct checks first. I did not look at production data, so older practice rows may exist.

## 5. Baseline sweep

`SWEEP=1 node tests/solve-contrast.browser.mjs` on the same build: 0 distinct failures. Lowest text contrast 4.64:1 (light) and 5.16:1 (dark). Lowest border contrast 3.74:1 (light) and 3.41:1 (dark).

Not checked: the axe step of the sweep needs `@axe-core/playwright`, which is not installed in this environment, so axe did not run. The signed-in pages of the sweep did not run. The authored student screen was measured in the test harness and not on the live route.

## 6. Reproducing

```bash
# Arena text counts
pnpm exec tsx --conditions=react-server tests/phase0-arena-text.mts
```

```bash
# Answer input failure and the undeclared variables case
pnpm exec tsx --conditions=react-server --test tests/phase0-answer-input.mts tests/phase0-undeclared-variables.mts
```

```bash
# Solving screens, against a local production build on port 3100
BROWSER_TEST_ORIGIN=http://127.0.0.1:3100 OUT=/tmp/audit node tests/phase0-solve-audit.browser.mjs
```

```bash
# Problem Studio and the authored screen, against a throwaway PostgreSQL
AUTHORING_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:PORT/physcratic_authoring_test CHROMIUM_PATH=/path/to/chrome node --require ./tests/server-only-register.cjs --import tsx tests/phase0-authoring.browser.mjs
```

Start the server for the solving screens with `BETTER_AUTH_URL` set to the same origin the browser uses. Otherwise `/api/archive-grade` returns 403 on the origin check.

## 7. Phase 2: solving screens after the change (5 November 2026)

Measured with the same scripts as sections 1 and 2 (`tests/phase0-solve-audit.browser.mjs`, `tests/phase0-authoring.browser.mjs`) on a production build of each commit, signed out, with MathLive loaded. "Before" is the build of `f9b3c78`, "after" is the head of this phase. Marks use the same needed, optional and clutter rules. A symbol chip and the maths field count as needed.

| Screen (1440 / 375) | Items before | Items after | Controls before | Controls after | Needed / optional / clutter before | Needed / optional / clutter after (1440) | Page height before | Page height after |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Practice | 44 / 29 | 41 / 26 | 31 / 18 | 29 / 16 | 12 / 29 / 3 | 11 / 28 / 2 | 1467 / 1934px | 1183 / 1632px |
| Arena | 61 / 46 | 76 / 61 | 31 / 18 | 49 / 36 | 34 / 24 / 3 | 46 / 28 / 2 | 4042 / 5460px | 4215 / 5256px |
| Guided reader | 77 / 62 | 56 / 41 | 50 / 37 | 36 / 23 | 13 / 37 / 27 | 13 / 34 / 9 | 3593 / 4219px | 2902 / 2987px |
| Authored | 28 / 28 | 22 / 22 | | | 10 / 10 / 8 | 12 / 9 / 1 | | |

What changed on each screen, through the shared components:

- **Practice:** "Optional working", "How to type an answer", the long Step 2 intro and "Type an answer above to turn on the Check answer button" are gone. The number box keeps its unit beside it and one line: "Answers within 1% are accepted." Check answer is always on. With nothing typed it says "Type an answer first."
- **Arena:** each expression part is one maths field. Under it are the problem's own symbols as chips. One short line under the question gives the conditions ("Conditions: k > 0"), built from the public part metadata. The long help is in one closed "Notes for each part" list. The full palette (fraction, power, root, subscript, Greek letters, sin, cos, tan, pi, e, ln) opens under the field being typed in. This is why Arena has more elements than before: each of its 7 fields shows its symbol chips. A reader who only wants to type sees the same number of fields.
- **Guided reader:** the collection tabs and filters are not shown while a problem is open (21 elements fewer). Signed out, there is no disabled working box. One line says to sign in to keep notes, and the equation calculator stays.
- **Authored:** the revision hash line, the pinned revision line, the storage notice, the limits notice and the "Practice, then reflect" section are gone. The part chooser shows only with several parts. The expression answer is the same maths field with the problem's declared variable names as chips (for the test problem: m and a). The help line no longer says to write `3*x` or that trig can need review.

Clicks and keys, part (a) of `arena-a-grin-and-a-wiggle` (the same answer as the solution):

| Way of entering it | Actions |
| --- | --- |
| Before: typing LaTeX into a text box | 1 click and 38 characters |
| After: typing in the maths field | 1 click and 29 keys (`r_0`, right arrow, `cos(kz)`, `+`, `theta_0`, right arrow, `sin(kz)`, `/`, `k`) |
| After: the palette | 1 click to focus, 12 palette taps, 3 right arrows and `+`, no letters typed |

Both are marked correct on the real route (`tests/first-time-user.browser.mjs`), at 375 and 1440, in light and dark. The letter o (`r_o`) shows "r_o isn't used here. Did you mean r₀?" under the field a moment after typing, and the same message from the checker next to the answer after checking.

First-load JS (`pnpm build`):

| Route | Before | After |
| --- | --- | --- |
| `/dashboard` | 489 kB | 490 kB |
| `/dashboard/problems/[id]` | 375 kB | 384 kB |
| `/dashboard/authored/[id]` | 292 kB | 301 kB |
| `/dashboard/author`, `/dashboard/submissions` | 270 kB, 235 kB | 270 kB, 235 kB |

MathLive (0.111.1) is two chunks of 823 kB and 36 kB (224 kB and 13 kB gzipped). Neither is referenced from the HTML of any page, and the `math-field` element does not exist on the library or the lobby (checked in `first-time-user.browser.mjs`). It is requested only after a field mounts. The rise on the problem and authored pages is the field, the palette, the reader and the record of solved problems.

The dashboard card "Recommended problem" now shows a random Arena problem this browser has not solved, with an "Another problem" button. A problem counts as solved when every part with an answer box is correct. The record is `physcratic.solved.v1` in localStorage, read and written inside try/catch.

Not checked: a real phone (the emulation in `tests/phase2-phones.browser.mjs` uses Playwright's iPhone 13 and Pixel 7 profiles in Chromium, which does not open a phone's own keyboard), screen readers, WebKit and Firefox.

## 8. Phase 4: Problem Studio Easy mode (5 November 2026)

Measured by `tests/studio-easy.browser.mjs` on the real editor and API (throwaway PostgreSQL), publishing one part with one expression answer (`m*a`), as in section 2. The script fails if the count goes above the target.

| Item | Phase 0 | Easy mode | Target |
| --- | --- | --- | --- |
| Screens | 2 | 1 | 1 |
| Clicks | 8 | 3 (focus the answer, tick "I wrote this problem", Publish) | 4 or fewer |
| Selects | 1 | 0 | 0 |
| Typed fields | 6 | 4 (title, problem text, question, answer) | not set |
| Characters typed | 146 | 123 | not set |
| Questions the editor asked that could have defaults | 16 | 0 | 0 |

Phase 0 did not count a click to focus a field, because Playwright fills a text box directly. The answer is a MathLive field and cannot be filled, so Easy counts one click for it. Like for like, Easy is 2 clicks.

Easy page, top to bottom (the same column at 375 and 1440): Easy | Advanced switch, title, problem text, one block per part (question, answer, detected symbols or a unit, a collapsed hint, a collapsed solution), Add a part, topic chips, the rights tick, Publish. At 1440 the student preview sits beside it with a "Test an answer" box under each part. At 375 the preview is a tab.

## 9. Phase 4b: Simple mode (5 November 2026)

Owner feedback on Easy: the author could not tell where the answer goes, labels like "context" and "provide" meant nothing, some helper lines said nothing and the page was hard to see. Simple replaces Easy.

Measured by `tests/studio-simple.browser.mjs` on the real editor and API (throwaway PostgreSQL). One part, an equation in the question, a picture and an expression answer key (`m*a`).

| Item | Phase 0 | Easy | Simple |
| --- | --- | --- | --- |
| Screens | 2 | 1 | 1 |
| Clicks besides typing | 8 | 3 | 3 (choose the picture, tick the rights box, Publish) |
| Clicks that only put the cursor in a field | not counted | 1 | 3 (question, answer, Try an answer) |
| Selects | 1 | 0 | 0 |
| Typed fields | 6 | 4 | 3 (question with its equation, picture description, answer) |
| What the page asks | 16 questions with defaults | title, problem text, question, answer, hint and solution toggles, topic search | question, picture, final answer, Try an answer, worked solution, more parts, title (filled in), topics, rights, Publish |

Page, top to bottom (one column about 720px wide, the same at 375 and 1440): What's the question? (an Equation button, `$` and Alt+= drop in an equation), Add a picture (optional), Final answer (We check students against this), Try an answer, Worked solution (optional), Add another part, Title, topics, the rights tick, Publish. No side preview.

Screenshots (light, 2x): `before-1440-filled.png`, `before-375-filled.png` (Easy) and `after-1440-filled.png`, `after-375-filled.png` (Simple), with the empty pages beside them, in `/tmp/claude-0/-home-user-physcratic/e2f71d02-1835-5abd-a0a1-5a697b1c0cf0/scratchpad/shots/`.

## 10. Removed script (5 November 2026)

`tests/phase0-authoring.browser.mjs` was removed. It drove the editor as it was in Phase 0 (a New problem button, Add section, Add part, the Answer type select), which no longer exists, so it could not run on `main`. Its numbers stay in sections 2 and 8. The current editor is measured by `tests/studio-simple.browser.mjs`, which also fails if the click target is missed.

