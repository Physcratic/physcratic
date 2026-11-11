# Physcratic course-learning prototype

Canonical source: [index.html](index.html). Open directly, without installation, environment variables or network. The development-only `/test/` page embeds this same file; its gate is unchanged.

Default: guest homepage. When served, `?view=member` starts the enrolled fixture. **View as** switches among guest, enrolled and no-enrolment accounts.

Start with [REVIEW_GUIDE.md](REVIEW_GUIDE.md). It keeps owner review to one decision at a time.

## Implemented views

| View | Hash location |
| --- | --- |
| Homepage | `#/` |
| Catalogue | `#/catalogue` |
| Course details | `#/course/mechanics` |
| Enrolled lesson example | `#/lesson/mechanics/lesson-4` |
| My learning | `#/learn` |

These are standalone views, not public or newly integrated Next routes. Course IDs, curricula and sample lesson completion are shared across views. Browser Back and course-origin return retain catalogue search/filter state in this tab.

The accepted guest homepage remains course discovery with editorial portrait/logo slots, competition coverage, teaching preview, Coaching and Arena heroes, final CTA and grouped footer. Member navigation keeps My learning and Explore courses primary, with Coaching/Arena under More. The learner homepage prioritizes enrolled study.

## Boundaries

Nine illustrative course offerings span Mathematics, Physics, Chemistry, Biology, AI and Informatics. Three sample enrolments initially show Mechanics 3/8, Number theory 2/10 and Vectors 6/6. Guests and unowned accounts can open the first lesson only. This is a client-side UI demonstration, not access control.

Media is placeholder. Mechanics and one mathematics explanation have illustrative reading content; other readings say they are layout samples. No fake playback, credentials, network APIs, browser storage, payments or real records. Manual completion applies to this tab and resets on reload/account switching. Instructor, support, policy, Coaching and Arena destinations remain explanatory dialogs.

## Checks

```sh
node prototypes/marketplace-home/checks/course-journey.mjs
```

The check uses Node built-ins and reads the canonical HTML. It checks all curriculum IDs/counts, initial resumes, completion/reversal, full completion, state reset and guest/unowned account boundaries. Extracted JavaScript syntax passes.

Managed Chromium exercised the linked journey, recovery, catalogue return and keyboard outline. Responsive 375/390/768px frames and desktop were checked in light/dark. Focused computed text checks pass in inspected views; no claim of full accessibility certification, physical-device qualification or Next application CI.

Read the decision report J01–J06 and the two experimental page maps. Preserve the original baseline and existing server security, grading and feature gates during any later integration. No merge or deployment is included.
