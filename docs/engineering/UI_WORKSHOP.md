# UI workshop pilot

Sample scope: Walking Past Two Speakers at `/dashboard/problems/arena-walking-past-two-speakers`.
Directory: `/workshop`. Connected entries: `/workshop/[id]`. Isolated previews:
`/workshop/preview/[id]?theme=light` (or `dark`). These routes are noindex and
are intentionally not linked from student navigation. No access-control claim:
the content is public UI source and synthetic examples, not private data.

## Extraction rules

- Foundations include all visible styles: surfaces, typography, space, borders,
  radius, icons, colour and responsive layout.
- Keep a composition when its pieces cooperate: frame, heading, answer rail,
  related links. Also record meaningful children, including primitives.
- Shared components appear once, with links to compositions using them.
- Record states and conditions even when the first preview cannot simulate them.
- Reuse current source without editing student-facing components. The source
  links are pinned to the extraction commit. Live specimens are not immutable
  screenshots and will reflect future shared-code changes.
- Add proposed variants alongside current specimens, then review before moving
  a change into shared code. No replacement has been approved in this pilot.

## Coverage and limits

Eleven entries cover the frame, breadcrumbs, heading, solving steps, documents,
workspace, answer interaction, feedback, hints, related links and foundations.
The directory is not a completed all-page audit. Account/community controls,
math keyboard, image zoom, document failures, save conflicts, self-review and
all remaining website routes need later extraction after this sample review.

The answer example deliberately uses a synthetic numeric question and local
state. It reuses existing inputs, chips, buttons and feedback,
but is not an extraction of the complete ArchiveAnswerPanel behavior. It has
no account hooks, grading requests, saved progress or browser draft storage.
The frame and related links render their actual shared components. Document
and hint examples use real renderers with synthetic content. The existing
workspace scroll behavior is retained so it can be discussed explicitly.

## Validation

Local full checkout/install was unavailable in the authoring environment.
Typecheck, lint, production build and browser accessibility/contrast verification
must complete in CI or an isolated checkout before this draft is merged.
Phone/tablet preview widths are real iframe widths, capped to the host viewport.
The previews have independent document IDs and theme state. Theme changes do
not intentionally write local storage. Keyboard and actual light/dark rendering
still require browser verification. No deployment, flag or database operation.

## Next review

Review the decomposition first, particularly heading vs badges and whole rail
vs answer field. Then choose one proposed change and define its acceptance
states before expanding the catalogue across the remaining pages.
