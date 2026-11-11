# Prototype design decision report

Branch: `codex/ui-overhaul`. Started 11 November 2026.
This report is for reviewing **why** interface elements are added, removed or changed.
It is separate from page maps (what exists/where it connects), sales brief (general principles) and handoff (current work).

## Required process for every prototype change

Before implementing a deliberate UI addition, removal or material change, add a decision entry here. Include:
- **Change and location:** what the visitor will actually see or lose, including audience/state.
- **Trigger:** owner request, observed problem, existing requirement or my inference.
- **Reason:** the specific user task/decision it helps and how.
- **Cost/tradeoff:** attention, complexity, duplication, maintenance or lost functionality.
- **Simpler alternative:** reuse, contextual presentation, keep existing behaviour or omit.
- **Expected behaviour/check:** how to tell whether it fulfils its stated purpose.
- **Status and correction:** proposed, implemented, accepted, rejected, replaced or unverified, with owner's feedback preserved.

Apply this to navigation, sections, fields, controls, labels, visual emphasis, decorative elements and interaction changes. Repeated cards governed by one rule can share an entry. Implementation details that do not affect users need no separate design essay.
Do not add UI merely because other products have it, the data exists, it looks balanced or it showcases another feature.
If the reason is weak, omit it before coding. Record that decision too when it changes an agreed plan.
Update this report, affected page maps and the prototype in the same checkpoint. Mention the affected IDs in the handoff.
Keep entries concise. This is an auditable rationale, not a persuasive defence of every decision.
Do not claim the owner requested or research proved an inference. User corrections supersede my rationale.
The rejected reasoning stays visible; never silently rewrite it as if it was correct all along.

## Initial current-state audit

These entries are **retrospective summaries**, not records written before the original work. Reasons below describe the design intent reconstructed from this conversation, not observed user results.
Unless explicitly accepted by the owner, implementation does not equal validation.
Guest concept was accepted as good enough for now. Member revision remains under review.

### Guest homepage

| ID | Element/change | Trigger and reason | Cost and simpler alternative | Status/check |
| --- | --- | --- | --- | --- |
| G01 | Hero motto and one supporting offer sentence | Owner chose exact motto. Supporting sentence explains what is offered and why the learner should care | Extra copy must not repeat surrounding claims; keep only distinct offer information | Implemented. Preserve exact motto; owner removed redundant supporting lines |
| G02 | Large portrait and competition-mark slots | Owner requested editorial imagery and recognisable expertise without biographies | Media can crowd the offer; use limited portrait count and move details to profiles | Guest concept accepted. Final assets pending |
| G03 | Repeated medallist caption, stage tagline and approach eyebrow removed | Owner said these repeat context visitors already understand | Removing all context could obscure the offer; retain the single useful offer sentence | Removed and correction accepted |
| G04 | Main Explore courses action at top and close | Help interested visitors reach offerings without first creating an account | Repetition can be noisy; repeat only at meaningful decision points | Implemented; buttons must open the catalogue |
| G05 | Competition coverage and logo loop | Owner requested broad coverage in a familiar sponsor-strip format | Motion consumes attention and cannot reliably locate an individual entry | Implemented with pause/reduced-motion. Do not rely on rail alone |
| G06 | Searchable competition lookup | Let a visitor confirm whether their competition has relevant offerings without waiting for a passing logo | Adds a dialog and fixture mapping; simpler list is viable for a small catalogue | Implemented. Matching/no-match and empty course states need runtime verification |
| G07 | Illustrative scale figures | Owner authorized an established-company future-state concept | Could mislead if presented as actual current facts; omit numbers or label the concept | Implemented and labelled illustrative, not business evidence |
| G08 | Large teaching video, notes and sample explanation | Owner requested showing how teaching works; answer whether expertise translates into understandable instruction | Large assets cost space/loading; one strong excerpt may replace multiple previews | Placeholder interactions implemented. Real teaching evidence pending |
| G09 | Three course-benefit explanations | Connect sequence, worked reasoning and practice to learner value | Risks restating media copy; omit a tile if it supplies no distinct benefit | Implemented by assistant inference, not specifically owner-approved |
| G10 | Dedicated Coaching and Arena heroes | Owner explicitly requested distinct sections introducing these extensions | Can dilute course discovery; keep specific benefit/action and avoid duplicate promotional blocks | Implemented. Product identities promoted to real headings after owner correction |
| G11 | Guest subject gallery and extra course-promotion block removed | Owner said they were unnecessary in the landing sequence | Less subject browsing on entry; competition lookup and catalogue already provide it | Removed by owner request |
| G12 | Grouped footer | Give visitors supporting destinations and help without loading the main navigation | Can become a sitemap dumping ground; include only justified groups | Implemented. Help and Contact welcomed by owner; destination pages remain previews |
| G13 | Courses removed from header/mobile menu | Owner clarified Physcratic itself is the marketplace, Coaching/Arena are extensions | Discovery still needs an entry; keep brand home and Explore courses actions | Implemented by owner request |
| G14 | Prototype state/theme controls and placeholder labels | Let the owner compare states and understand which assets/actions are simulated | These are review tools, not customer product UI; remove before real integration | Implemented. Not proposed as production controls |

### Enrolled learner homepage

| ID | Element/change | Trigger and reason | Cost and simpler alternative | Status/check |
| --- | --- | --- | --- | --- |
| L01 | Featured latest studied enrolled course | Owner agreed learner should resume work. One dominant action reduces choice before studying | Overemphasis could hide other study; retain compact other-course access | Implemented. Resume must target the matching course |
| L02 | Lesson thumbnail and saved-position context | Help recognition and tell learners precisely what resumes | False precision if not backed by recovery data; currently explicitly sample | Implemented as fixture, no real media seek |
| L03 | Other active enrolled-course cards | Make switching ongoing study possible without returning to catalogue | Too many cards can crowd resume; show a compact subset, offer My learning | Implemented, under review |
| L04 | Full My learning view with status filters | Previous modal could not organise multiple enrolments or completed courses | Filters cost complexity for small counts; default to all and keep simple | Implemented in-page view, not new route |
| L05 | Completed courses moved out of active home list | Keep homepage focused on ongoing study while retaining review access | Completed work becomes one step further away | Implemented. Accessible through My learning |
| L06 | Related course suggestions | Help discover a useful next purchase after ongoing learning | May distract from paid study or recommend irrelevant work; limit to two and explain relevance | Implemented from selected subjects; owner has not separately validated placement |
| L07 | Interest controls behind Edit interests | Keep discovery adjustable without permanently showing settings | Adds one interaction to edit; clearer home outweighs constant controls | Implemented, under review |
| L08 | Full catalogue moved to separate browsing view | Earlier homepage repeated a large catalogue below personal learning | Broader discovery requires a click; keep explicit Explore all courses | Implemented, under review |
| L09 | Redundant greeting eyebrow/subtitle removed | Same owner principle as guest: do not re-explain an obvious task | Keep a meaningful page heading for orientation/accessibility | Implemented |
| L10 | Generic Other ways to prepare block | **Original assistant reasoning:** exposing Coaching/Arena was assumed helpful because the features exist. **Owner correction:** this interrupts enrolled learning and repeats navigation. Existence alone is not a user need | Contextual coaching or practice could help at a specific learning obstacle. Omit the generic block | **Rejected. Hidden from member homepage in this checkpoint.** Guest dedicated product heroes remain |

### Interaction and preservation controls

| ID | Element/change | Reason | Tradeoff/check |
| --- | --- | --- | --- |
| X01 | Clear-filter, no-match and back actions | Let visitors recover and return without being stranded | Preserve selection/return context. Static checks do not prove browser behaviour |
| X02 | Sample account switching and fixture-only lessons | Compare experiences without production accounts or data | Must never be interpreted as real auth, course access, saved progress or purchases |
| X03 | Logo pause and reduced-motion fallback | Motion is optional; people need time to inspect content comfortably | Keep both explicit control and static fallback; browser accessibility checks pending |

## New-decision template

### ID: [next identifier] · [short change name]

- **Location/audience:**
- **Change:**
- **Trigger:**
- **User need and causal reason:**
- **Cost/tradeoff:**
- **Simpler alternative:**
- **Expected behaviour/check:**
- **Status/evidence:**
- **Owner correction/outcome:**

## This checkpoint

L10 is implemented as hidden for all member states. The guest has separate, owner-requested Coaching/Arena heroes, so the old compact generic section is now hidden in all fixture states.
No new recommendation, promotion, account or backend feature was added.
JavaScript syntax and static check of the hidden block pass. Browser/a11y/build checks remain unverified.


## L11 · Learning-first navigation and More

- **Location/audience:** signed-in member header, enrolled and no-enrolment states, desktop and mobile.
- **Change:** My learning and Explore courses are primary. Coaching and Arena move into a separate **More** disclosure near account controls. Mobile menu uses the same learning-first grouping.
- **Trigger:** owner accepted this navigation plan and explicitly chose the label More.
- **User need/reason:** keep frequent learning actions visible while retaining quick access to the product extensions without signing out or visiting a guest page.
- **Cost/tradeoff:** an extra click and a less descriptive label reduce extension visibility.
- **Simpler alternative:** leave both links visible. Rejected here because it competes with the learner's main task. Do not put product destinations inside account settings.
- **Expected check:** either member state can reach each extension and return with account state unchanged; primary course actions remain available; mobile keeps the same hierarchy. Guest header stays unchanged.
- **Status:** implemented after recording this decision. Native disclosure, Escape/outside-click dismissal and mobile grouping added. Extension destinations retain modal previews; no new live routes or account integration. JavaScript syntax and static structure checks pass; browser interaction remains unverified.
- **Owner correction:** use More, not More from Physcratic.


## L12 · Update interests label

- **Audience/location:** member recommendation action.
- **Trigger/change:** owner requested Update interests in place of Edit interests.
- **Reason:** use the owner's preferred action wording for revising subject preferences.
- **Tradeoff/alternative:** small wording change only; keeping Edit would ignore the request.
- **Expected check:** both member states show Update interests and still open/save the existing picker.
- **Status:** implemented after recording. The visible label changed in both member states; the existing picker/save handlers are unchanged.

## X04 · Complete the dark appearance

- **Audience/location:** guest, enrolled and empty-account views, catalogue, menus and dialogs.
- **Trigger:** owner reports broken dark mode.
- **Change/reason:** give surfaces, media placeholders, selected controls, brand mark and focus indicators explicit paired colors. Remove fixed light preview backgrounds so dark appearance remains readable and visually consistent after navigation.
- **Tradeoff:** placeholder art uses a quieter unified dark palette; real image assets will retain their own colors.
- **Simpler alternative:** patch only the current homepage. Rejected because the same defects occur in shared catalogue, preferences and guest media.
- **Expected check:** readable foreground/background pairs, selected states, visible focus and theme retained across state changes. Light theme and all existing actions preserved.
- **Status:** implemented after recording. Shared paired tokens and theme-aware SVG/thumbnail colors cover the affected surfaces. JavaScript syntax and static replacement checks pass. Twelve foreground/background checks pass, including small text at 5.72:1 or higher and control borders at 4.25:1. These are token-pair checks, not a full rendered contrast audit. Chromium launch fails because process sockets are blocked in this environment, so visual/mobile/interaction verification and full application CI remain unverified.

## J01 · Full-page course details
- **Audience/trigger:** guests and members assessing a course. Owner authorized the course-learning journey.
- **Change/reason:** replace the course dialog with a page containing intended learner, prerequisites, outcomes, curriculum, teaching preview, instructor and availability. Group these around the suitability decision rather than adding marketing sections.
- **Tradeoff/alternative:** longer than a dialog, but gives curriculum and sample teaching room. Keep instructor details in the existing supporting dialog.
- **Check:** course ID and catalogue filters survive a round trip. Enrolled members resume; others can try a sample. No checkout or fake enrolment.
- **Status:** implemented after recording; owner review pending. See COURSE_JOURNEY_QA.md for actual checks and limits.

## J02 · Focused lesson workspace
- **Audience/trigger:** enrolled learner continuing study, guest evaluating a sample.
- **Change/reason:** full lesson page with a large media slot, explanation, worked example, short practice prompt and course outline. Guest sample is visibly scoped to one unlocked lesson.
- **Tradeoff/alternative:** more structure than a lesson modal. No fake media playback controls, distraction panels, notes system or unrelated recommendations.
- **Check:** correct course/lesson, sample boundary, outline selection, previous/next and return context. Media remains explicitly placeholder.
- **Status:** implemented after recording; owner review pending. See COURSE_JOURNEY_QA.md for actual checks and limits.

## J03 · Consistent sample curriculum
- **Audience/trigger:** all three linked pages need matching names, counts and progress.
- **Change/reason:** central course plans and stable lesson IDs supply detail syllabus, lesson outline and My learning. Preserve existing 8/10/6 lesson totals and saved positions.
- **Tradeoff/alternative:** illustrative curriculum is not final teaching content. A repeated generic lesson list would not support a useful review.
- **Check:** counts match, saved lesson titles resolve, each course/lesson ID has an understandable unavailable state.
- **Status:** implemented after recording; owner review pending. See COURSE_JOURNEY_QA.md for actual checks and limits.

## J04 · Session-only study progress
- **Audience/trigger:** enrolled learner reviewing resume and completion flow.
- **Change/reason:** explicit Mark complete action updates the sample progress across lesson, My learning and homepage in this tab. Completion is a set of lesson IDs, not arbitrary increments.
- **Tradeoff/alternative:** state resets on reload. A short visible prototype note explains this. Guest samples and unowned courses cannot mark completion.
- **Check:** repeated completion does not double-count, completed-course review works, switching sample accounts clears study edits.
- **Status:** implemented after recording; owner review pending. See COURSE_JOURNEY_QA.md for actual checks and limits.

## J05 · My learning and return paths
- **Audience/trigger:** member finding their active or completed course.
- **Change/reason:** retain status filters, add matching course-detail access, accurate progress, an empty-account action and page hashes for course/lesson/learning navigation and browser Back.
- **Tradeoff/alternative:** hash locations inside the standalone file, not real Next routes. Search/filter and origin scroll retained in session.
- **Check:** browser Back, header/logo, sample-to-course and learner-to-library paths work. Missing/deleted IDs recover without a blank page.
- **Status:** implemented after recording; owner review pending. See COURSE_JOURNEY_QA.md for actual checks and limits.

## J06 · Reviewable boundaries and presentation
- **Audience/trigger:** owner reviewing while leaving routine decisions to the agent.
- **Change/reason:** reuse existing header, More, theme, cards and type; media gets generous placeholder space. Lesson footer is omitted to keep study focused, with course and learning return controls retained. Guest homepage composition stays accepted.
- **Tradeoff/alternative:** no new independent visual system, real purchase, credentials, private service or media fetching. Full footer stays on commercial/library views.
- **Check:** desktop/mobile, both themes, keyboard focus, one visible h1, no horizontal overflow, existing discovery/interest actions preserved. Record actual QA evidence and blockers.
- **Status:** implemented after recording; owner review pending. See COURSE_JOURNEY_QA.md for actual checks and limits.

### J06 outcome details
Mobile review controls were compacted so the prototype strip does not crowd study. Repeated module/title text is suppressed when identical. New control boundaries use paired border colors. Superseded modal function definitions were removed rather than left as duplicate behavior. Guest composition and More navigation are preserved. The supported managed preview now works; the earlier browser limitation is superseded for this bounded batch.

J04/J05 final outcome: all active lessons were completed through the UI; the homepage correctly replaced its resume panel with a review/discovery state. Completion reversal and sample-account reset were exercised. The initial-lesson counts remain 8/10/6, verified from source rather than the earlier assumed counts.
