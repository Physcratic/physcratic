# PDF structure-tree accessibility repair

14 November 2026. Investigation baseline: main `d95b861d512f6c1db4782d99cf7e2ab6937d8e03`. Draft PR only. No merge or deployment is authorized.

## Reproduction and root cause

The actual production-mode IPhO 2010 T1 first statement page reports one axe `aria-required-children` rule with four failing nodes, severity critical, at 375px and 1440px in both themes. First-page comparisons with IPhO 2009 T1, 2016 T1 and 2025 T1 have zero axe violations. The unmodified 2010 source PDF is tagged by Word 2007.

Two source `TR` tags contain valid `TD` children followed by a bare inline `Span`, owning marked-content IDs `p3R_mc22` and `p3R_mc27`. Those two marked-content sequences have no extracted text. The existing cells contain the figure labels and caption. Two bare outer `L` tags contain only another `L`, which contains the actual list items.

React-PDF 11.0.0 maps `TR` to `row` and `L` to `list` and recursively emits these children. The resulting rows own generic children outside their cells, and lists directly own lists instead of list items. Chromium's accessibility tree independently exposes these same invalid relationships. These are invalid ARIA semantics, not merely axe misidentifying valid structure.

Potential assistive-technology effects include inconsistent table-cell navigation, extra list grouping and incorrect item-count announcements. Browser accessibility-tree inspection establishes the exposed structure, not actual spoken behavior. NVDA, JAWS and VoiceOver have not been tested. No specific lost-text or announcement behavior is claimed.

## Smallest bounded repair

The version-bound pnpm patch modifies the existing React-PDF structure renderer before React creates its elements. Dependency versions remain unchanged. Runtime JavaScript, distributed TypeScript source and its declaration remain consistent.

- A row consisting of valid cells followed only by bare inline content spans keeps the same cells. Append those complete trailing spans inside the preceding cloned cell. Keep every ownership reference and its order, including the currently empty references. Do not invent extra empty columns.
- Collapse an outer list only when it has no metadata and contains solely another list. Preserve the inner list, its metadata and all real list items. Genuine nested lists inside list items remain nested.
- Leave ambiguous shapes, leading/intervening non-cell nodes, block nodes, object references, labeled/language-bearing inline spans and meaningful outer-list metadata unchanged. This is constrained recovery of malformed inline tags, not general reconstruction of arbitrary PDF tables.
- Do not mutate the source tree, PDF bytes, selectable text, canvas, annotations or document navigation. No hidden content, disabled structure tree, role demotion, copied accessibility-only text or axe exclusions.

The source evidence justifies the current repair: the moved spans have no extracted text, all references remain, and existing table cell counts stay 2 and 1. Inferring author-intended cell membership from arbitrary malformed tags remains a limitation. Unexpected forms deliberately remain visible to future audits.

`onGetStructTreeSuccess` is a notification effect after the tree is rendered and memoized, not a transformation hook. Mutating it can leave stale or initially invalid DOM. A DOM observer would interfere with React ownership. React-PDF's current upstream renderer and PDF.js 6.3.289's separate viewer also directly map these tags. Switching viewers or merely upgrading without verified upstream support is not a demonstrated fix.

## Regression evidence

`lib/pdf-structure.test.ts` exercises the actual patched renderer and real PDF tag tree. It checks valid-tree preservation, all ownership IDs and order, original cell counts, list items, labels/language, genuine nesting, ambiguous shapes and immutable inputs.

`tests/pdf-accessibility.browser.mjs` audits real production reader pages without mocking PDFs or excluding their trees from axe. It checks mobile/desktop and both themes, selectable text, canvas visibility, source download/open links, keyboard page navigation, all three 2010 statement pages and all eight solution pages, plus restoration of the original page. Browser evidence records text, ordered ownership IDs, cell counts and canvas fingerprints for controlled before/after comparison. Cross-machine canvas hashes are evidence, not a brittle CI golden image.

The existing library browser workflow runs this check against its disposable local session fixture, including a synthetic member. No live database, provider configuration, publication content or SEO policy is involved. Full-page axe must pass. Unit tests run through ordinary CI. Pinned patch installation is checked with a frozen lockfile.

Local production-mode Chromium 154.0.8037.57: all seven cases pass. The 2010 page changes from four failing nodes to zero at both widths and in both themes. All three comparison readers remain zero. Text, ordered ownership IDs, original cell counts, canvas PNG hashes and source PDF hashes match exactly before/after. All eleven 2010 statement/solution page fingerprints also match. The browser accessibility tree now exposes only the original two/one cells in those rows and direct list items in the two lists. Six targeted renderer tests and 34 focused renderer/publication/SEO tests pass. The existing contrast/structure/focus sweep, scoped to the affected reader, passes all eight 375/390/768/1440 light/dark cases with no distinct failures. Full local tests pass with 880 server passes, 31 skips and one inherited TODO, plus 201 component passes. Frozen install, offline guards, TypeScript, zero-warning lint and production build pass. Independent review confirms the patch and runtime evidence, with no material blocker.

Actual commands, full-suite results, browser version, before/after measurements, independent review, exact head and CI links are recorded on the draft PR. Physical screen-reader/device qualification remains separate. There is no claim that all pages in the archive or all PDF tagging defects are repaired.

## Maintenance and references

This patch is tied to React-PDF 11.0.0. A dependency upgrade must review upstream behavior and rerun these real-source tests. Remove the patch only after equivalent upstream support is demonstrated. Do not silently rebase a failed patch or broaden recovery to ambiguous structures merely to pass axe.

- [WAI-ARIA row role](https://www.w3.org/TR/wai-aria-1.2/#row)
- [WAI-ARIA list role](https://www.w3.org/TR/wai-aria-1.2/#list)
- [React-PDF structure renderer](https://github.com/wojtekmaj/react-pdf/blob/main/packages/react-pdf/src/StructTreeItem.tsx)
- Installed `react-pdf/dist/shared/structTreeUtils.js`, `StructTree.js` and `Page/Canvas.js`
- Installed `pdfjs-dist/web/pdf_viewer.mjs`, `StructTreeLayerBuilder`
