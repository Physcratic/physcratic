# Native archive format migration

Continues draft PR #179 (`22d8429`) on top of #178. The archive has 112 records. All 112 now have native statement and solution documents and response controls. This batch converts the remaining 97 PDF-based records and adds controls to the three already-native IPhO 2026 records. Original PDFs, identities, source URLs and ratings remain available.

## Grading and review limits

The 978 new response fields are **self-review only**. They use MathLive for expressions and text areas for explanations, proofs, graphs and mixed responses. Comparing opens the worked solution. Responses are temporary page state and are not saved to an account. They do not award marks, change dashboard totals or update ELO. The prior twelve conversions retain their existing verified stateless checks and self-review controls. No automatic keys were inferred from a PDF or invented to make a completion metric pass.

This completes the requested document/field format migration. It does **not** complete automatic grading for the entire archive. Verified per-part answers, units, domains, accepted alternatives and negative examples remain a separate physics review task.

The new source documents are parsed and KaTeX validated. They have **not** all been manually compared page by page with the official PDFs. Subpart detection is heuristic and must also be reviewed against the statement. The source and inventory ledgers explicitly retain this pending status. Do not promote this to a claim of independently reviewed physics content.

## Sources

The 97 source ZIP URLs come from the IPhO, APhO and EuPhO archive pages at https://olimpicos.net. The provenance ledger records each ZIP and source TeX SHA-256, document origin and copied figures. Local figure filenames bind their bytes by SHA-256 prefix; the corpus manifest records complete hashes. The original-PDF ledger binds every retained source PDF with its full digest.

The external source archive did not contain solution TeX for IPhO 2025 T1 and T3. Their native solutions are readable derivations from the retained official solution PDFs, with attribution and source qualifications in the document. The maintained TeX is under `scripts/native-archive/derived-source`. T1 C5 retains the official geometric construction as a source crop. These derivations are not a verbatim transcription of every examiner marking table. The linked originals remain authoritative.

The three existing IPhO 2026 source documents are reused without rewriting them. Earlier native conversions and checking keys remain unchanged.

## Reproduction

Normal maintenance requires no downloads or Python dependencies:

```sh
node --conditions=react-server --import tsx scripts/build-native-olympiads.ts
git diff --exit-code -- lib/corpus public/corpus docs/engineering/native-archive-*.json
```

The authoritative checked-in native nodes and response descriptions are `lib/olympiad/native-bulk.json` and `bulk-tasks.json`. Public grading metadata is generated through the existing explicit allowlist. The client-side membership catalogue imports only the small ID list.

For a new source import, use a temporary source directory with `plan.json` from `scripts/native-archive/sources.json`, downloaded `<id>.zip` files, and each ZIP extracted to `tex/<id>/`. Validate ZIP paths before extraction. Install Python BeautifulSoup and Pandoc 3.14 separately. Overlay the two maintained solution TeX files and copy the retained T1 C5 figure into `tex/ipho-2025-t1/figures/official-solution-c5.png` before parsing.

```sh
python scripts/native-archive/prepare.py SOURCE_DIRECTORY /path/to/pandoc
python scripts/native-archive/assemble.py SOURCE_DIRECTORY
node --conditions=react-server --import tsx scripts/build-native-olympiads.ts
```

The importer preserves tables, merged cells, ordered-list labels and local figures. Only bounded structural attributes enter the typed document schema. It normalizes unsupported typography and upright Greek macros for KaTeX, without executing source scripts or accepting remote image paths. Review the output and task labels before committing.

## Verification

The per-record native tests parse both documents, render every equation strictly, verify local figure references and bind retained PDFs to their recorded hashes. Metadata tests check that answer keys cannot leak into public assets. Native browser tests exercise each problem at mobile and desktop widths in both themes, guest and synthetic verified sessions, with keyboard navigation, draft retention, solution comparison, axe and absence of persistent writes. Eight CI shards bound runtime.

The original PDF reader retains separate browser coverage using unchanged production PDF bytes and original page metadata in a synthetic harness. Canonical routes now use native documents, so PDF-specific assertions no longer run against those routes. The public library workflow still tests real production routes, authentication isolation and no-JavaScript output.

Actual local and exact-head CI results belong to the pull request. No merge, provider setting, database, migration, feature flag or manual deployment is part of this batch.
