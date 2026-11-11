# Guest and member homepage prototypes

Canonical source: index.html. Open directly, no installation, environment variables or network needed.
Guest default: index.html. Member default: index.html?view=member when served, or choose enrolled learner in View as.
The development-only /test/ route embeds this source. Its local-only gate is unchanged.

## Guest

Introductory hero explains the multi-subject olympiad course platform. Explore courses scrolls to the catalogue. Hero subject choices also filter it.
Sample fields: Mathematics, Physics, Chemistry, Biology, AI and Informatics. Broader course scope includes fields with international olympiads.
Course search, subject chips, level and format filtering, no-match/reset, sample course/instructor/lesson dialogs and grouped footer work as fixture interactions.

## Signed-in learner

Recent courses are enrolled courses that were recently studied, never simply viewed courses.
Two sample enrolments appear in recent-study order with next lessons and illustrative progress. Continue opens a sample lesson, without recording completion.
For your interests uses explicitly selected subjects to filter fixture suggestions and excludes sample enrolled courses. No behavioural inference or real recommendation backend exists.
The no-enrolment member variant hides recent courses and provides interest choices and browsing.
The course catalogue remains accessible below personal learning, without redirecting to Arena.

## Shared behaviour and boundaries

Simulated account switching across three states, My learning, sample course/instructor/lesson dialogs and appearance toggle remain available.
Footer Support/Company/Policy actions are explicitly proposed previews. No real contact, policy publication or transactions.
Coaching and Arena remain navigation previews. Arena is physics-focused initially, unlike the multi-subject course catalogue.
All courses, instructors, progress and enrolments are fictional and labelled. No verified award, review, price, real availability or course access is asserted.
No credential fields, APIs, network calls, browser storage, purchases or messages. Reload resets state.
There is only one canonical HTML fixture in the repository. Separately supplied guest/member downloads use different initial states for convenience.

## Verification and next review

Extracted JavaScript syntax and static checks for six subjects, two sample enrolments, member initialization, no network/storage and labelled states pass.
Browser/mobile/keyboard/contrast and full Next build/CI remain unverified. The prior browser session could not reach the local server.
Compare: does a guest understand what Physcratic is? Can a member resume an enrolled course immediately? Are suggestions understandable? Can either discover another subject?
Read TEST_SITE_MAP.md and TEST_PAGE_HIERARCHIES.md for current planning. Preserve the fixed original baseline and existing security contracts before real integration.

## Guest sales-page revision

Guest landing now contains a value-led hero, compact existing coaching profiles, a teaching preview, subject relevance and a final Explore courses action. The catalogue opens as a separate in-file view with a back button instead of showing filters and cards on entry. No new course-list route.
Hero records come from lib/coaching/medallists.ts: Rishit Garg (IPhO 2026 Gold), Ackhava (APhO 2026 Gold), Abhika (IPhO 2026 Silver). These are existing physics coaching profiles, not asserted authors of the sample marketplace courses. No portraits, invented awards or testimonials added.
Member layout remains recently studied enrolled courses, selected-interest suggestions and catalogue. Research sources are recorded in TEST_SITE_MAP.md. Syntax/static checks pass, browser verification remains pending.
