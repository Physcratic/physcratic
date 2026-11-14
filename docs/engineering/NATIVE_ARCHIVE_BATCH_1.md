# Native olympiad archive conversion, batch 1

## Scope

Baseline: `bcc132eb44b01d67402910015972b594b08810c2`. Five canonical records retain their IDs, titles, ratings, source links and original PDFs. EuPhO 2018 T1 (Three balls), T2 (Solenoid), T3 (Staircase), IPhO 2012 T2 (Kelvin water dropper) and APhO 2012 T1 (The Drag on a Falling Magnet) now use native statement and solution nodes with Arena answer controls. The other 107 records are unchanged. Together with three pre-existing native IPhO 2026 records, this leaves 104 PDF records. This is the first checked batch, not a complete archive conversion.

## Content and checking

All 12 source pages were rendered and compared against the transcription. Eight diagrams are cropped from those PDFs, with crop coordinates and hashes in [the figure ledger](native-archive-batch-1-figures.json). Original PDF hashes and document disposition are in [the source ledger](native-archive-batch-1-sources.json). [The inventory](native-archive-inventory.json) lists every record and remaining format. Regenerate with `node --conditions=react-server --import tsx scripts/build-native-olympiads.ts`.

The five problems expose 19 automatic final-answer checks and two qualitative self-review fields. They use the existing stateless checker and typed MathLive controls. Full workings and photo upload remain optional. These checks do not save account progress, marks or ELO. Existing 30 Arena and Quick practice definitions and persistence behavior remain unchanged. Server-only reference answers are omitted from public grading metadata. Independent human source review remains pending.

EuPhO Three balls preserves and annotates the general double-sum convention. Staircase preserves and annotates the printed exponent inconsistency. IPhO notes the alternative proof's reused sigma symbol. APhO defines positive separation and magnitude conventions for the input fields. No official source correction is silently substituted.

## Validation

Frozen dependency installation, TypeScript and changed-file ESLint pass. Focused server regression passes 69/69, including the unchanged existing grading snapshot, and native renderer/heading regression passes 19/19. Browser coverage passes 161 checks across five problems, two widths and two themes, using the actual reader, MathLive and stateless route with a synthetic verified account. It checks submission, retained drafts, no persistence POSTs, one heading, no horizontal overflow and no serious or critical axe findings. Browser authentication is a fixture, not a live provider assertion. Full-repository build and CI outcomes are recorded in the PR.

## Continue safely

Convert remaining records in source-reviewed batches. Split shared papers by their actual problem boundaries, preserve source PDFs, include every statement and solution subpart and crop original figures. Derive answer conventions from the official solution, annotate source inconsistencies, add positive and negative answer cases and review all source pages. Keep new checks stateless until saved progress has its own explicit catalogue and verification. Do not claim a whole year is converted based on a shared PDF.
