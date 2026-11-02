# X1 remaining deliverables

Audit base: `a1c288b` on main, including Claude C2 and the shared practice descriptions from `77a0c9a`. Writable scope remains `lib/**`. The accepted `lib/physics-taxonomy.ts` API and data are unchanged.

## 1. Problem descriptions and metadata

The static public route has 130 distinct problems: 12 practice, 100 imported and 18 Arena. The five guided corpus entries overlap imported problem IDs and are not another five pages.

- Current main already fixes the five overlong practice HTML descriptions (`first-law`, `heat`, `incline`, `projectile`, `spring`) through `practiceProblemDescription` in `lib/problem-meta.ts`. All 12 current HTML descriptions are 70–160 characters and unique. This is upstream work, not a change made by this follow-up.
- The layout's Open Graph metadata and LearningResource JSON-LD still called `problemSummary` on the full prompt. This change makes that existing path reuse the same five written descriptions. The seven suitable shorter practice prompts are preserved, as is the existing prompt-only 300-character `problemSummary` API.
- All 18 Arena summaries are accurate, distinct and already 70–160 characters. They are preserved.
- All 100 imported HTML descriptions use the generic PDF/submission template. They are technically distinct because of competition/year/code, but do not describe the physics. Two imported titles are both `Question 3`: `apho-2014-t3` and `apho-2015-t3`. These are original document titles, so the catalog content should not be renamed.
- `problemDescription(problem)` now provides subject-specific imported descriptions from existing public titles and concept tags, preserving qualifiers in existing Arena summaries. `problemPageMetadata(problem)` adds competition/year/code to imported metadata titles and supplies canonical and matching Open Graph metadata. Tests cover all 130 problems, unique descriptions/titles and 70–160 character descriptions. Neither helper imports the corpus or database.
- Authored problem pages intentionally use generic metadata, `noindex,nofollow` and dynamic rendering. They are account/permission surfaces. They are left unchanged, and these helpers must only receive the static public collections.

### UI-owner integration still required

`app/dashboard/problems/[id]/page.tsx` is outside this workstream's ownership. Its existing HTML metadata assignment remains unchanged. The UI owner can retain its existing lookups and replace the return with:

```ts
import { problemPageMetadata } from "@/lib/seo/problem-descriptions";

const selected = arenaProblem ?? problem ?? imported;
return selected ? problemPageMetadata(selected) : { title: "Problem not found" };
```

This activates the prepared imported descriptions, disambiguated imported titles and per-problem canonicals without rewriting statements. The current problem layout and generated OG-image route only look up practice problems: imported/Arena canonicals are missing, and their OG images use the generic fallback. The helper supplies the canonicals, but resolving collection-specific images still requires the app/UI owner. No private authored lookup should be added to that public route.

## 2. Dashboard bundle measurement

Toolchain: Node 22.23.4, pnpm 10.34.9, Next 15.5.28, frozen committed dependencies including IBM Plex. Builds use only the synthetic Better Auth configuration in CI.

Measurement sums each unique JavaScript asset in `.next/app-build-manifest.json` for `/layout`, `/dashboard/layout` (if present) and `/dashboard/page`. Gzip is calculated independently per file at level 9 with a fixed timestamp. CSS, fonts, source maps, RSC payloads, images and later asynchronous downloads are excluded. This is a reproducible asset-size measure, not a browser latency claim or a measured CDN transfer.

| Measure | Current-main baseline | Final candidate |
| --- | ---: | ---: |
| Initial JS chunks | 18 | 18 |
| Raw JavaScript bytes | 2,388,709 | 2,388,709 |
| Sum of gzip-9 bytes | 662,670 | 662,670 |
| Next reported first-load JS | 661 kB | 661 kB |

Final change: 0 raw bytes and 0 gzip bytes saved. No browser optimization is being shipped. A measured library-only catalog/index rewrite on the earlier `831668f` baseline increased raw JavaScript by 8,874 bytes and gzip by 753 bytes. It was rejected and completely removed from the candidate. The catalog, corpus downloads, collection filters and source JSON remain unchanged.

The largest dependency is MathJS, imported statically by `lib/plain-math.ts`. The dashboard client statically imports every view, including the problem library and calculator/readers, so that code is part of the initial dashboard path even for the overview. Changing synchronous calculator APIs to asynchronous loading would break their current callers. A custom mathematical engine would require a separate compatibility investigation. Neither is a safe small library-only optimization.

The measurable next step belongs to the UI owner: introduce loading boundaries in `components/kokonutui/content.tsx` and/or the calculator/reader components, then measure the overview and first reader/calculator use separately. Preserve filtering, collection counts and calculator behaviour. This is not a prerequisite for Claude C2, and none of those files were edited here.

## 3. coaching_inquiry dependency review (read-only)

Repository searches for `coaching_inquiry`, `coachingInquiries` and historical spelling variants found no active request-path reads, writes, API handlers, webhook handlers or UI consumers. The old writer `lib/coaching-inquiries.ts` was removed in `ac86049`; current consultation/tutor flows link to Tally through `lib/coaching/consultation.ts`. Vercel Analytics conversion events do not write the table.

The remaining explicit references are:

| File | Dependency |
| --- | --- |
| `lib/db/schema.ts` | Retained `coachingInquiries` Drizzle registration. `lib/db/index.ts` registers the schema generically; this alone is not a query. Seven columns: UUID ID, pathway, audience, current level, goals, contact, creation time. |
| `docs/engineering/BETA_READINESS.md` | Historical note says the app writer is removed and suggests later removal. That note does not account for the operational dependencies below. |
| `scripts/authoring-release-production/package/test-fixture.mjs` | Inserts a synthetic legacy inquiry in the disposable release rehearsal. |
| `scripts/authoring-release-production/package/baselines/production-preauthoring.json` | Includes the table, seven columns and primary key in the exact reviewed 16-table legacy schema. No cross-table foreign key to it appears in this baseline. |
| `scripts/authoring-release-production/package/PRODUCTION_MIGRATION_DRAFT.sql` | Names the table in the legacy lock set and checks pre/post full-record fingerprints. Removing the table breaks these statements. |
| `scripts/authoring-release-production/package/legacy-fingerprint-readonly.sql` | Reads it when establishing the retained recovery-point fingerprint. |
| `scripts/authoring-release-production/package/PRODUCTION_POSTCOMMIT_READONLY.sql` | Reads it to verify that legacy records survived migration. |

`core.mjs` loads and enforces these schema/fingerprint/ledger expectations, including schema-drift rejection and `legacy_tables_preserved: 16`. `README.md` documents that exact contract. `PACKAGE_SHA256SUMS` binds the reviewed files. Canonical migrations 0001–0006 do not create, delete or alter this table. The later auth-rate-limit migration does not reference it either. The current auth limiter is a separate table.

**Conclusion:** retired from application use, but still an explicit operational compatibility dependency. An immediate table drop is not justified by the repository evidence. Keep it in place. A database/release owner must confirm whether those operator workflows are retired, inspect current database dependencies and external consumers, and decide retention/export of historical contact/goals data before proposing a new, separately reviewed decommission migration and replacement operational expectations. Do not rewrite historical migrations, fingerprints, reviewed SQL or checksummed packages.

This review made no connection to staging/Production, read no business rows, and executed no schema or data changes. Live table contents, external writers, current views/FKs and retention obligations are therefore not claimed to have been checked. Existing required CI rehearsals run only against disposable PostgreSQL 18.6.

## Validation and handoff

Completed every current `.github/workflows/ci.yml` step: frozen install; offline isolation guards; Next type generation and TypeScript; zero-warning ESLint; server tests (532 pass, 10 existing disposable-DB skips and 1 existing TODO); UI tests (24 pass); synthetic production build; disposable PostgreSQL 18.6 tests (78 pass); reviewed release checksums/guards (17 pass); mail/storage guards (41 pass); and production operator checksums/rejection guards (5 pass). One database attempt hit a load-sensitive symbolic assertion while the production build shared CPU. The complete unchanged parallel database job passed 78/78 when rerun after the build. No grading, auth, test limit or test assertion was changed. Only completed changes in the listed owned files are committed. No application, component, taxonomy, Studio integration, schema, migration, package, lockfile, font, auth, provider or deployment configuration changes are part of this follow-up.
