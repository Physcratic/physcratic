# Course-learning journey: review one step at a time

Open `index.html` directly. No server, installation or environment variables are needed.
The downloadable learner edition opens signed in. Use **View as** to compare guest, enrolled and no-enrolment accounts.

## Start here: course details

1. Choose **Explore courses** and open **Mechanics Foundations**.
2. Review only the title, who it is for, prerequisites and main action.
3. Stop there if you want. The first decision is whether this gives enough information to decide to try the course.

Later, review the other two decisions separately:

| Decision | Short path | What to assess |
| --- | --- | --- |
| Does the study screen help you focus? | Enrolled homepage → Resume at 08:24 | Video space, readable working, practice and outline placement |
| Is returning to study straightforward? | Mark complete → My learning → Resume lesson | Matching next lesson, progress and completed-course review |

## What works

- Course details and curriculum for all nine sample offerings.
- Guest first-lesson samples, enrolled lesson selection, previous/next and explanation reveal.
- Completion and reversal update this tab's lesson, library and homepage together.
- My learning filters, completed-course review and course-detail links.
- Browser Back, catalogue search/filter retention, missing-page recovery, mobile outline/navigation and theme switching.

The written mechanics lessons and modular-arithmetic explanation are illustrative teaching content. Other lesson readings are explicitly placeholder. Portraits, videos, captions, transcripts and final course materials still need assets/content. There are no fake playback controls.

## What a correction affects

| Change | Shared source | Other places that follow |
| --- | --- | --- |
| Course/module/lesson names or order | `coursePlans` and course records | Course detail, outline, lesson title and library |
| Completion/resume rule | Shared lesson-ID sets and enrolment records | Lesson, My learning and learner homepage |
| Navigation or theme | Existing shared header/tokens | Every journey view |
| One lesson's explanation | `lessonContent` | That lesson only |

Reasons are in `docs/engineering/PROTOTYPE_DESIGN_DECISIONS.md`, J01–J06. Both experimental maps distinguish implemented hash views from intended application routes.

## Verification and limits

JavaScript syntax and the standalone model checks pass. Managed Chromium exercised guest/sample, enrolled resume, completion/reversal, completed filter/review, no-enrolment discovery, browser Back with retained search, keyboard outline and unavailable-page recovery. Desktop and 375/390/768px responsive frames were reviewed. Checked journey views had one visible h1 and no horizontal overflow. Focused computed text contrast checks passed in light/dark after transitions, with observed minima 5.44:1 and 6.01:1 respectively. These do not replace a complete accessibility audit.

Everything is sample data. Study changes reset on reload or switching accounts. No real auth, purchase, enrolment, video playback, server progress, private service or browser storage is connected. Real Next routing, provider/device testing and application CI remain integration work. This branch is not merged or deployed.
