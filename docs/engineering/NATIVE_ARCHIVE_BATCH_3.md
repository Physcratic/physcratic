# Native olympiad archive conversion, batch 3

## Scope and baseline

Continues draft #178 at `6884fb374e13af605f2318bbfadbd6856d4bc2c4`. Main was rechecked at `bcc132eb44b01d67402910015972b594b08810c2`, already an ancestor of that draft. EuPhO 2020 T1 Solenoid and loop, T2 Mechanical accelerator and T3 Cat eyes gain native statements, LaTeX, source diagrams, worked solutions and answer fields. The two implementation batches cover T1/T2, then T3 and integration. All source solution approaches are retained in readable form. Original examiner marking tables remain in the linked PDF.

The archive still has 112 records. This candidate has **15 native statement/solution records**, including the three pre-existing IPhO 2026 records, and **97 PDF records remain**. Twelve converted archive problems have configured answer fields. This is partial delivery, not completion of the archive. No existing problem ID, title, rating, source link or original PDF is changed. The prior nine conversions remain byte-identical.

## Source and answer review

The original one-page shared statement and all ten shared solution pages were rendered on white and inspected. T1 occupies solution pages 1 to 5, T2 pages 5 to 7, and T3 pages 7 to 10. Native records contain only their own question and solution. Nine original crops retain complete axes, labels and ray constructions. The figure ledger records source SHA-256, page, render size, pixel crop coordinates and crop SHA-256. The document ledger binds both original PDFs per problem. Independent human physics review remains pending.

Six automatic checks and one graph self-review field are added:

- T1 asks for signed z components of F1 and F2. The two current extrema use the leading long-solenoid approximation. The graph is self-review and must include baseline, dip, peak, time origin and time scales. The worked solution explicitly corrects the source's intermediate missing Faraday minus sign and clarifies the abbreviated local-quadratic table. Five force derivations, both current derivations and the energy-source distinction are retained.
- T2 checks the maximum laboratory speed after complete unwinding, `u(2*pi*N+1)`. The speed at detachment is smaller. All three official derivations and the subsequent translating-frame motion are explained.
- T3 checks h in millimetres, target 80 and absolute tolerance 16, matching the requested 20 percent estimate. The intensity graph, photographs and ray construction remain original. Both geometrical constructions, luminance arguments and the source's optional scattered-light correction are retained. The near-focal correction is preserved.

These checks reuse the existing stateless server checker and reader. They do not enter the account-persistence catalogue or award marks/ELO. Public metadata contains no private checking keys.

## Validation and environment limits

Six focused tests pass locally using the real production expression reader and sampled checker. They independently integrate the short-coil forces, finite-difference linked flux, verify Lenz sign and current symmetry/asymptotics, derive speeds using rotating-frame energy and scan post-detachment velocity vectors, solve exact paraxial blur geometry, and verify all crop/source hashes and problem boundaries. Two additional integration tests check public metadata against the actual server catalogue and numeric-tolerance boundaries in full GitHub CI.

Local shell network access cannot resolve GitHub, and pnpm dependencies are unavailable. Repository access and delivery therefore use the connected GitHub API. Local generation uses an uncommitted adapter over the repository generator: only the new records are processed, with equivalent metadata serialization, and the unavailable schema parse is deferred. No full local typecheck, lint, build, browser sweep or schema-validation result is claimed. The final PR must record the actual exact-head GitHub CI results. Browser and physical-device checks remain unrun for this batch unless subsequently recorded there. Existing #178 browser evidence covers its prior nine conversions only.

Normal full-checkout regeneration is `node --conditions=react-server --import tsx scripts/build-native-olympiads.ts`. The original two source ledgers remain separate, and the third source ledger covers only this set. Full-suite integrity tests compare every new metadata file with the actual server-generated metadata.

## Next work

Continue the remaining 97 PDFs in source-reviewed batches, preserving subparts, figures, alternative solutions and source-error notes. Do not mark automated extraction as reviewed transcription. Merge the parent conversion PR before retargeting a stacked follow-up to main, reconciling concurrent main changes. No migration, provider, live database, feature flag, merge or manual deployment is included.
