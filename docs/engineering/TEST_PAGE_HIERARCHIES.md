# Experimental page information hierarchies

Living companion to [TEST_SITE_MAP.md](TEST_SITE_MAP.md). Branch: `codex/ui-overhaul`. Updated 11 November 2026.

## How to read these diagrams

The site map shows **where pages connect**. This document shows **what each page contains and what deserves attention first**.
Hierarchies remain proposed. The homepage now has an isolated sample-data prototype, with browser verification pending. Other pages remain unbuilt and untested. They are editable initial decisions, not fixed requirements or claims of available features.
Numbers represent intended reading/attention priority, not an exact viewport position or mandatory vertical stack. Use them to make rough wireframes, then test.
Each group owns its detail nodes. These are content relationships, not clickable navigation arrows.
On desktop, the main action may sit beside supporting content. On mobile, use a coherent reading and keyboard order. Do not hide essential suitability, price/access conditions, errors or safety information merely to shorten the page.
Exact section names here are planning labels, not final website copy.

## Shared shell

Keep brand and predictable navigation consistent. Offer Academy, Coaching and Arena destinations in a way that reflects actual availability.
Keep experimental/sample status visible without letting it dominate the page. Account controls depend on the approved local fixture/auth setup.
Retain accessible headings, skip navigation, focus and meaningful empty/error states. Prototype action labels must not imply a real payment, booking or message was completed.
Shared navigation is not redrawn on every page below. Footer/support links remain lower priority than the task.

## Shared footer information hierarchy

The homepage fixture now includes this footer in all three sample account states. It is secondary navigation, not another primary conversion area.

```mermaid
flowchart TD
  footer["Footer"]
  brand["Brand and brief description"]
  learning["Learn"]
  support["Support"]
  company["Physcratic"]
  policy["Policy and status row"]
  footer --> brand
  footer --> learning
  footer --> support
  footer --> company
  footer --> policy
  learning --> sections["Courses; Coaching; Arena"]
  support --> assistance["Learning/access help; Contact"]
  company --> organisation["About; Teach with us"]
  policy --> status["Privacy; Terms; Refunds/cancellations; sample-data notice"]
```

Courses returns to the existing prototype catalogue. Coaching and Arena open navigation previews.
Remaining links are explicitly proposed-destination or policy-status dialogs, not implemented pages. No fabricated contact details or policies.
On mobile the groups wrap into a compact grid with visible headings. This CSS exists but has not been browser-verified.
Keep purchase/access/refund conditions visible on the relevant offering or transaction too. The footer does not replace those disclosures.

### 1. Homepage: guest and member compositions

Route: `/test/`. Owner decision: guests need an introduction, while signed-in learners need recently studied enrolled courses and relevant discovery.
“Recently studied” excludes courses merely viewed while browsing.
There is no separate course-list route. Course detail URLs remain planned as `/test/courses/[slug]`.

#### Guest homepage

```mermaid
flowchart TD
  page["Guest introduction"]
  hero["1 · Learner value and credible people"]
  teaching["2 · Teaching preview"]
  subjects["3 · Subject relevance"]
  action["4 · Explore courses and footer"]
  page --> hero
  page --> teaching
  page --> subjects
  page --> action
  hero --> message["Olympiad preparation with accomplished competitors"]
  hero --> people["Existing physics coaches; exact recorded awards"]
  teaching --> example["Worked reasoning example and sample lesson"]
  subjects --> fields["Mathematics, Physics, Chemistry, Biology, AI, Informatics"]
  action --> catalogue["Separate catalogue view with back action"]
```

The landing view contains no course-card grid, search or filter controls. Explore courses opens those in a separate view within the same prototype, without introducing a new URL.
Hero coaching profiles use existing repository records and are labelled as coaching profiles. They do not imply those people authored the fictional course catalogue.
The teaching preview is illustrative and not attributed to those coaches.
Keep the main action focused on course discovery, with a secondary sample-lesson action. Do not use fabricated reviews, success rates or guarantees.

#### Member homepage

```mermaid
flowchart TD
  page["Member homepage"]
  recent["1 · Continue learning"]
  interest["2 · For your interests"]
  browse["3 · Explore all courses"]
  support["4 · Supporting destinations and footer"]
  page --> recent
  page --> interest
  page --> browse
  page --> support
  recent --> enrolled["Recently studied enrolled courses; next lesson; progress"]
  interest --> choices["Explicitly selected subjects; explain suggestions"]
  interest --> suggestions["Matching sample courses"]
  browse --> catalogue["Same subject/search/filter catalogue"]
```

Two sample enrolled courses appear in recent-study order, each with a Continue lesson action.
Suggestions match chosen subjects and exclude sample enrolled courses. No inferred behaviour model or numerical recommendation score is used.
A member without enrolments sees no recent-course section. They can select subjects and explore suggestions/catalogue.
My learning and account controls replace guest account actions. One identity is proposed across Academy, Coaching and Arena, with separate access and records.

#### Prototype status

The standalone fixture implements these presentations and can open directly as guest or with `?view=member`. The View as toolbar still allows all three states.
App /test/ embeds the same file in local development only. Account state is simulated. There is no real auth, enrolment, progress write or course recommendation service.
Course, instructor and lesson details remain dialogs. Light/dark and responsive CSS exist, but browser validation is pending.
Search/filter state is kept when closing previews. Reload resets all fixture state.

### 2. Course details

Route: `/test/courses/[slug]`. Visitor decision: **Decide whether this course fits.**

```mermaid
flowchart TD
  page["Course details"]
  first["1 · Decision summary"]
  second["2 · Next action"]
  support["3 · Supporting evidence"]
  extra["4 · Terms and disclosures"]
  firstContent["Title; intended learner; outcomes; prerequisites"]
  secondContent["Try sample; explicit interest action if unavailable"]
  supportContent["Syllabus; instructor; sample teaching"]
  extraContent["Format; workload; established price and access; cohort conditions"]
  page --> first
  page --> second
  page --> support
  page --> extra
  first --> firstContent
  second --> secondContent
  support --> supportContent
  extra --> extraContent
```

### 3. Instructor profile

Route: `/test/instructors/[slug]`. Visitor decision: **Assess teaching suitability and find an offering.**

```mermaid
flowchart TD
  page["Instructor profile"]
  first["1 · Identity and credibility"]
  second["2 · Available learning"]
  support["3 · Teaching evidence"]
  extra["4 · Secondary detail"]
  firstContent["Name; subject; exact sourced award and year"]
  secondContent["Relevant courses and coaching; availability"]
  supportContent["Experience; approach; sample explanation"]
  extraContent["Longer biography; return to originating offering"]
  page --> first
  page --> second
  page --> support
  page --> extra
  first --> firstContent
  second --> secondContent
  support --> supportContent
  extra --> extraContent
```

### 4. Coaching options

Route: `/test/coaching`. Visitor decision: **Choose a suitable live learning option.**

```mermaid
flowchart TD
  page["Coaching options"]
  first["1 · Fit and format"]
  second["2 · Options and action"]
  support["3 · Decision support"]
  extra["4 · Secondary detail"]
  firstContent["Who coaching serves; subjects; available formats"]
  secondContent["Relevant option; instructor; enquire"]
  supportContent["Confirmed schedule and price; what sessions involve"]
  extraContent["How enquiry works; specific practical questions"]
  page --> first
  page --> second
  page --> support
  page --> extra
  first --> firstContent
  second --> secondContent
  support --> supportContent
  extra --> extraContent
```

### 5. Coaching enquiry

Route: `/test/coaching/enquire`. Visitor decision: **Prepare an enquiry for the chosen option.**

```mermaid
flowchart TD
  page["Coaching enquiry"]
  first["1 · Selection summary"]
  second["2 · Minimal form"]
  support["3 · Preview action and feedback"]
  extra["4 · Secondary support"]
  firstContent["Option; subject; instructor if selected; change selection"]
  secondContent["Contact and learning goal; required fields labelled"]
  supportContent["Preview enquiry; field errors; explicit not-sent confirmation"]
  extraContent["Next-step expectations; return with draft retained"]
  page --> first
  page --> second
  page --> support
  page --> extra
  first --> firstContent
  second --> secondContent
  support --> supportContent
  extra --> extraContent
```

### 6. Practice discovery

Route: `/test/practice`. Visitor decision: **Find and open a suitable problem.**

```mermaid
flowchart TD
  page["Practice discovery"]
  first["1 · Discovery controls"]
  second["2 · Results and action"]
  support["3 · Optional assistance"]
  extra["4 · Secondary controls"]
  firstContent["Search; topic; four named difficulty bands"]
  secondContent["Title; topic; band; source; open problem"]
  supportContent["Relevant sample recommendation with explanation"]
  extraContent["Additional filters; empty-state recovery; return context"]
  page --> first
  page --> second
  page --> support
  page --> extra
  first --> firstContent
  second --> secondContent
  support --> supportContent
  extra --> extraContent
```

### 7. Problem reader

Route: `/test/practice/[id]`. Visitor decision: **Work on the problem and interpret feedback.**

```mermaid
flowchart TD
  page["Problem reader"]
  first["1 · Reading area"]
  second["2 · Working area"]
  support["3 · Feedback and recovery"]
  extra["4 · Secondary actions"]
  firstContent["Title and source; full statement; equations and figures"]
  secondContent["Appropriate input; units; validation; submit if integrated"]
  supportContent["Pending or result state; retry; revision and draft context"]
  extraContent["Hint or solution disclosure; next problem; optional related learning"]
  page --> first
  page --> second
  page --> support
  page --> extra
  first --> firstContent
  second --> secondContent
  support --> supportContent
  extra --> extraContent
```

### 8. Guide catalogue

Route: `/test/learn`. Visitor decision: **Choose an explanation relevant to a need.**

```mermaid
flowchart TD
  page["Guide catalogue"]
  first["1 · Orientation"]
  second["2 · Guide results"]
  support["3 · Supporting context"]
  extra["4 · Secondary paths"]
  firstContent["What guides cover; subject entry points"]
  secondContent["Specific title; useful summary; open guide"]
  supportContent["Concept and level where known; related topics"]
  extraContent["Practice library; relevant learning options"]
  page --> first
  page --> second
  page --> support
  page --> extra
  first --> firstContent
  second --> secondContent
  support --> supportContent
  extra --> extraContent
```

### 9. Guide reader

Route: `/test/learn/[slug]`. Visitor decision: **Understand a concept and apply it.**

```mermaid
flowchart TD
  page["Guide reader"]
  first["1 · Orientation"]
  second["2 · Learning content"]
  support["3 · Apply learning"]
  extra["4 · Secondary paths"]
  firstContent["Title; concept; what the explanation covers"]
  secondContent["Explanation; equations; worked examples"]
  supportContent["Related problem with clear context"]
  extraContent["Related guides; relevant course or coaching; back to catalogue"]
  page --> first
  page --> second
  page --> support
  page --> extra
  first --> firstContent
  second --> secondContent
  support --> supportContent
  extra --> extraContent
```

## States alongside the happy path

| Page type | States to design before considering it complete |
| --- | --- |
| Lists | Loading, no content yet, no filter matches, failure/retry, retained filters |
| Detail/profile | Missing ID, unavailable offering, missing optional evidence, direct entry and return |
| Enquiry | Incomplete fields, correction, preview confirmation, edit/back without draft loss; no real send |
| Problem | Sample vs integrated interaction, validation, pending, feedback, uncertainty/retry, stale revision, recovery |
| Guide | Missing content, long equations/media, related content unavailable |

## What stays unresolved

Guest introduction and member recent-learning priorities are confirmed. Hero copy, subject choices, course card density and how to represent limited actual inventory still need testing. Coaching remains secondary.
Additional catalogue filters should only appear when the inventory makes them useful.
Course purchase, student lesson delivery and creator workflows remain deferred.
Problem reader integration must obey existing answer and recovery contracts. These diagrams are not permission to rebuild grading or bypass feature gates.
Instructor sample data must be labelled consistently across profiles and offerings. Do not invent social proof.

## Update process

Before implementing a page, use its hierarchy to make a rough layout and compare it against the page specification and link contracts.
After trying the layout, update the hierarchy and record why the priority changed.
Keep this document focused on information priority. Put cross-page links in TEST_SITE_MAP.md and detailed behavioural contracts in their relevant engineering documents.
Preserve the original baseline checklist. Moving a feature into a disclosure is still a reachability and accessibility decision to verify.
