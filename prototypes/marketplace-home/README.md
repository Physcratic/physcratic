# Marketplace homepage account-state prototype

Open index.html directly in a browser. No installation, environment variables, network connection or accounts are required.
The same file is embedded by the development-only Next route at /test/ after pnpm dev in an initialized local checkout.
The route returns notFound outside NODE_ENV=development and also refuses VERCEL=1. No asset is copied into public/. It is not added to navigation or the sitemap.
The iframe is sandboxed with allow-scripts only. Real auth, cookies, storage, APIs, purchases, form sends and production data are not used.

## Compare three states

Use the View as selector:
- Signed out: short explanation, sign-in/create-account actions and the course catalogue.
- Signed in, enrolled learner: same catalogue, account controls and compact Continue learning.
- Signed in, no enrolments: same catalogue, account controls and honest no-enrolment guidance.
An Arena-origin account does not imply a course enrolment.

Sign in and Create account open an explicitly simulated account chooser. Sign out affects only the preview state. There are no credential fields.
Coaching and Arena navigation opens explanatory preview panels. It does not establish real cross-platform account integration.
My learning opens sample progress or an empty state. Continue opens a short sample lesson, without saving completion.
Course and instructor details use dialogs for the first experiment. They are not yet the planned /test/courses/[slug] or /test/instructors/[slug] routes.
Search, level and format filters operate on six fictional physics courses. No courses are for sale. All profiles are fictional, with no asserted awards or reviews.
Filters stay in place while switching account states or opening/closing previews. Reload resets the experiment. There is no persistent data.
Light/dark toggle and responsive CSS are provided. Mobile layout, contrast, keyboard and screen-reader behaviour still need browser verification.

## First review

1. Try signed out. Can you tell what to browse and open a relevant course?
2. Sign in through the sample chooser. Is the enrolled state useful without hiding discovery?
3. Choose the no-enrolment state. Does an Arena-only user feel welcome without being assigned a course?
4. Search for a missing topic. Check the no-results and clear-filter recovery.
5. Open a course, instructor and sample lesson, then return to the catalogue.
6. Compare narrow/wide layouts and light/dark. Check keyboard dialog open/close, focus and labels.

Open decisions: wording, amount of introduction, position/size of Continue learning and whether My learning deserves primary navigation.
No design was validated with users yet.

## Verification

Extracted JavaScript passes node --check.
Static source checks cover fixture count, three account states, lack of network/storage/credential fields and the development gate appearing before file IO.
The cloud browser could not reach the local preview server (ERR_CONNECTION_REFUSED). No successful browser execution, screenshots, real Next build, app CI or security qualification is claimed.

## Integration and security review

Read docs/engineering/UI_OVERHAUL_BASELINE.md before integration.
A future shared-account implementation must verify server-enforced roles and course entitlements, session/cookie behaviour, CSRF/origin checks, private-data/cache boundaries, validation/XSS, media access and submission idempotency/recovery. Browser tests must cover account switching, guest/member states and error paths.
An unchanged backend is not proof that redesigned front-end code preserves those boundaries. No security bypass or activation is authorized by this fixture.

## Footer iteration

Grouped footer added: Learn, Support and Physcratic, with brand context and a separate policy/status row. Shared across guest and member states.
Courses uses the catalogue action; Coaching/Arena reuse navigation previews. Seven support/company/policy entries have explicit preview dialogs. These are not newly implemented pages or published policies.
Try each group, close with Escape or Close, and confirm keyboard focus returns appropriately. Check narrow layout and both appearances locally.
Checks: all seven footer destinations have handlers, no network/storage introduced, extracted JavaScript syntax passes. Browser, accessibility and app build/CI remain unverified.
