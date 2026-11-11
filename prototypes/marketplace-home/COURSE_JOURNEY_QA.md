# Course journey verification

11 November 2026. Candidate: the commit adding this file, based on `7e551e20170381d3134c777b9846c5eb94855551`.

## Passing

- Extracted script: `node --check`.
- Model check: `node prototypes/marketplace-home/checks/course-journey.mjs`. Nine curricula have unique stable lesson IDs; 8/10/6 enrolled totals match; saved lessons resolve; completion/reversal and full completion do not corrupt counts; reset restores positions; guest/unowned accounts resolve first-lesson samples only.
- Managed Chromium: course detail → sample → return; enrolled homepage → correct saved lesson; completion/reversal → My learning → next lesson; completed filter → course → review; completing all active courses → healthy all-complete homepage; no-enrolment library → catalogue; search → course → sample → browser Back preserves search; unavailable ID recovery and full-course lesson boundary.
- Keyboard: course outline opened and closed with Enter. Native controls and focus targets retained.
- Responsive: 375/390/768px frames (360/375/753px content widths because of scrollbars) and desktop; no horizontal overflow and one visible h1 in checked journey views.
- Focused computed-text contrast: inspected light/dark course/library/lesson states pass, after theme transitions settle. Observed minima 5.44:1 light and 6.01:1 dark. Closed disclosures, disabled controls and SVG illustration content were excluded. This does not measure every composited image, border, focus state or assistive-technology interaction.

## Review boundaries

The full production application, original reader/grading/auth flows, database tests, provider sessions, real devices, Firefox/WebKit and comprehensive accessibility sweep were not run. No application integration or production contract changed. Earlier inability to launch an executor browser was resolved for this batch by the supported managed preview and cloud browser.

Original baseline comparison remains `b3912ce60f80929c360ccb7956d6b394eef1aff5`. The cumulative branch adds prototypes/docs and the isolated development page, plus the already-approved band-label changes. This batch touches only the marketplace prototype, its checks and documentation. Production route/feature removal is not part of it.

Main observed at `77ac5de582cabbb5118c12ec605db94229fc4bad`; open public-homepage PR #143 touches the real homepage, while this batch stays in the isolated fixture. No migration reservations, merge, deployment, secrets or service settings are involved.
