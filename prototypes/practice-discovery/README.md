# Practice discovery prototype

Open index.html directly in a browser. No installation, environment variables, database or server is needed. This is a disposable standalone experiment, not an application route.

## Compare

A provides topic and band selectors alongside an immediate sample.
B asks for a topic, then difficulty, then shows the sample.
Both support opening a reading screen, returning to selection and public section links.
Synthetic prompts are deliberately brief and uncalibrated. They are not additions to the real problem library.
Easier and Harder currently change the selected band explicitly. This is a prototype shortcut, not the planned within-band recommendation algorithm. No randomisation, history, answer checking, account state or persistence exists.

## Research task

Ask likely physics students, without a tutorial: "Find and start a mechanics problem at a level you would feel comfortable attempting."
Alternate which design people try first. Observe task completion, hesitation, mistaken clicks, ability to change level and whether the next action is clear.
Then ask them to change topic and return from the reading screen.
Record concrete observations before selecting a direction. Neither layout is approved merely because it looks better.
Do not claim research happened until actual participants have tried it.

## Preservation and testing

This experiment does not replace any existing page or remove features.
Before integration, map the chosen flow to docs/engineering/UI_OVERHAUL_BASELINE.md.
Keep the fixed original commit as the functional reference. Expected visual differences are reviewed, not automatically rejected.
Protect user-visible behaviours with existing focused tests. Add meaningful missing coverage when integrating.
Keep screenshot environments stable. Retain manually reviewed baseline images and accept new expectations only for intentional design changes.
Check keyboard, focus, mobile/desktop, light/dark and accessibility manually as well as with tools. This standalone sketch currently has only a light appearance.
For fast experiments run focused checks. Run the repository-required gates before calling application integration review-ready.
Use one owner for implementation. Independent review is a useful bounded subagent task when requested. Give reviewers the baseline SHA, affected flow and explicit question. Avoid multiple agents editing shared UI files concurrently.

Verification: JavaScript syntax checked with node --check. No browser execution, user testing or application CI performed in this environment.

## Sources behind this process

- https://www.nngroup.com/articles/parallel-and-iterative-design/
- https://www.gov.uk/service-manual/design/making-prototypes
- https://playwright.dev/docs/best-practices
- https://playwright.dev/docs/test-snapshots
- https://www.w3.org/WAI/test-evaluate/

Next: open both versions locally, collect task-based feedback, choose a direction, then integrate one complete flow while preserving the feature checklist.
