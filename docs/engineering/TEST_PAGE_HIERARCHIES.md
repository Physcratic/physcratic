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

### 1. Homepage and course catalogue

Route: `/test/`. Visitor decision: **Find a course that fits my goal and level.**
Owner decision: course discovery is the homepage's primary purpose. There is no separate catalogue page. Course detail routes remain `/test/courses/[slug]`.
Keep the brand explanation brief. Do not make visitors pass through a marketing landing page to reach the catalogue. Course availability remains explicit, including samples or planned offerings.

```mermaid
flowchart TD
  page["Homepage and course catalogue"]
  first["1 · Orient and discover"]
  second["2 · Course results and main action"]
  support["3 · Compare suitability"]
  extra["4 · Supporting destinations"]
  firstContent["Brief Physcratic explanation; search; useful subject, goal and level filters"]
  secondContent["Curated course results; clear availability; view course"]
  supportContent["Instructor; learner fit; format; language; established price"]
  extraContent["Coaching; free practice; guides"]
  page --> first
  page --> second
  page --> support
  page --> extra
  first --> firstContent
  second --> secondContent
  support --> supportContent
  extra --> extraContent
```

Search and filters update results on `/test/`. Returning from a course restores search, filters and scroll position.
Show useful no-match or no-available-course states without inventing inventory. Additional filters appear only when useful.

### Homepage variations by account state

```mermaid
flowchart TD
  home["/test/ · Same course catalogue"]
  identity{"Sample account state"}
  guest["Guest · Brief introduction and sign-in controls"]
  enrolled["Member with course · Continue learning panel"]
  empty["Member without course · Browse-first guidance"]
  home --> identity
  identity --> guest
  identity --> enrolled
  identity --> empty
  enrolled --> resume["Course title, next lesson, progress, continue action"]
  enrolled --> discover["Catalogue remains available"]
  guest --> discover
  empty --> discover
```

One account is the proposed identity across Academy, Coaching and Arena. Course access is separate from account existence.
The current fixture provides three states, sample dialogs and a light/dark toggle. It does not authenticate or persist anything.
Keep the Continue learning area compact so the homepage remains the catalogue.
Account controls change with state, not the site's primary purpose.
The separate sample toolbar is a research control, not a planned customer-facing account switcher.

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

Homepage course discovery is confirmed. Its exact content order and how to represent limited current course inventory still need testing. Coaching remains a secondary destination.
Additional catalogue filters should only appear when the inventory makes them useful.
Course purchase, student lesson delivery and creator workflows remain deferred.
Problem reader integration must obey existing answer and recovery contracts. These diagrams are not permission to rebuild grading or bypass feature gates.
Instructor sample data must be labelled consistently across profiles and offerings. Do not invent social proof.

## Update process

Before implementing a page, use its hierarchy to make a rough layout and compare it against the page specification and link contracts.
After trying the layout, update the hierarchy and record why the priority changed.
Keep this document focused on information priority. Put cross-page links in TEST_SITE_MAP.md and detailed behavioural contracts in their relevant engineering documents.
Preserve the original baseline checklist. Moving a feature into a disclosure is still a reachability and accessibility decision to verify.
