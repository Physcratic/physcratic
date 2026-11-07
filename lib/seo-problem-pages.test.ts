import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findCopyProblems } from "./copy-rules";
import { articles } from "./learn/articles";
import { practiceProblemIds } from "./learn/practice-links";
import { catalogProblems } from "./corpus-catalog";
import arena from "./arena/index.json";
import { problems } from "./physics";
import {
  META_TITLE_BUDGET,
  allProblemPages,
  archiveMetaTitle,
  archiveStatementView,
  displayTitle,
  findProblemPage,
  relatedProblems,
  topicSlug,
  topicsWithProblems,
} from "./seo/problem-pages";

const pages = allProblemPages();

describe("problem pages", () => {
  it("covers every practice, Arena and archive problem exactly once", () => {
    assert.equal(pages.length, problems.length + arena.problems.length + catalogProblems.length);
    assert.equal(new Set(pages.map((p) => p.id)).size, pages.length);
    assert.equal(pages.filter((p) => p.kind === "archive").length, 100);
    for (const p of pages) assert.equal(p.path, `/dashboard/problems/${p.id}`);
  });
  it("titles archive problems like \"Cox's Timepiece, IPhO 2025 Problem 2 | Physcratic\"", () => {
    const page = findProblemPage("ipho-2025-t2")!;
    assert.equal(`${page.metaTitle} | Physcratic`, "Cox's Timepiece, IPhO 2025 Problem 2 | Physcratic");
    assert.equal(page.title, "Cox's Timepiece");
    assert.equal(page.number, 2);
    assert.equal(page.source?.line, "IPhO 2025, Problem 2.");
    assert.equal(page.source?.officialLabel, "Official problem (PDF)");
    assert.match(page.source!.officialUrl, /^https:\/\//);
  });
  it("keeps every title within 60 characters with the site suffix, and every title unique", () => {
    for (const p of pages) assert.ok(p.metaTitle.length <= META_TITLE_BUDGET, `${p.id}: ${p.metaTitle}`);
    assert.equal(new Set(pages.map((p) => p.metaTitle)).size, pages.length);
    assert.equal(archiveMetaTitle("Zero-length springs and slinky coils", "IPhO", 2019, 1, false).endsWith(", IPhO 2019 P1"), true);
    assert.equal(archiveMetaTitle("IPhO 2019 Problem 1", "IPhO", 2019, 1, true), "IPhO 2019 Problem 1");
    assert.equal(displayTitle("WATER-POWERED RICE-POUNDING MORTAR"), "Water-Powered Rice-Pounding Mortar");
    assert.equal(displayTitle("Cox's Timepiece"), "Cox's Timepiece");
  });
  it("gives every page its own 70 to 160 character description that follows the copy rules", () => {
    for (const p of pages) {
      assert.ok(p.description.length >= 70 && p.description.length <= 160, `${p.id}: ${p.description.length} "${p.description}"`);
      assert.deepEqual(findCopyProblems(p.description).map((x) => x.rule), [], p.id);
      assert.deepEqual(findCopyProblems(p.title).map((x) => x.rule), [], p.id);
    }
    assert.equal(new Set(pages.map((p) => p.description)).size, pages.length, "no two pages share a description");
  });
  it("gives every archive problem statement text, the source and a way to reach the official file", () => {
    for (const p of pages.filter((x) => x.kind === "archive")) {
      const view = archiveStatementView(p)!;
      assert.ok(view.paragraphs.length > 0 || !p.indexable, p.id);
      assert.ok(p.source && p.source.line.startsWith(`${p.competition} ${p.year}, Problem ${p.number}`), p.id);
      assert.ok(view.pdfHref?.endsWith("document.pdf"), p.id);
      for (const image of view.pageImages) assert.ok(image.alt.length > 20 && image.src.endsWith(".webp"), p.id);
    }
  });
  it("marks only pages with too little text as not indexable, and there are few of them", () => {
    const thin = pages.filter((p) => !p.indexable);
    assert.ok(thin.length >= 1 && thin.length <= 5, thin.map((p) => p.id).join());
    for (const p of thin) assert.equal(p.kind, "archive");
  });
  it("links each problem to 3 to 5 other indexable problems, and every page links somewhere new", () => {
    const inbound = new Map<string, number>();
    for (const p of pages) {
      const related = relatedProblems(p);
      assert.ok(related.length >= 3 && related.length <= 5, `${p.id}: ${related.length}`);
      assert.ok(!related.some((r) => r.id === p.id));
      assert.equal(new Set(related.map((r) => r.id)).size, related.length);
      for (const r of related) { assert.ok(r.indexable, `${p.id} links a noindex page ${r.id}`); inbound.set(r.id, (inbound.get(r.id) ?? 0) + 1); }
    }
    const orphans = pages.filter((p) => p.indexable && !inbound.has(p.id));
    assert.ok(orphans.length < pages.length * 0.1, `${orphans.length} problems have no related-problem link in: ${orphans.slice(0, 5).map((p) => p.id)}`);
  });
  it("puts same-olympiad-and-year problems first for archive problems", () => {
    const related = relatedProblems(findProblemPage("ipho-2025-t2")!).map((p) => p.id);
    assert.ok(related.includes("ipho-2025-t1") && related.includes("ipho-2025-t3"), related.join());
  });
  it("has a topic page for every topic its problems use", () => {
    for (const p of pages) assert.ok(topicsWithProblems().some((t) => t.slug === p.topicSlug), p.id);
    assert.equal(topicSlug("Modern physics"), "modern-physics");
    assert.equal(topicSlug("Modern"), "modern-physics");
  });
  it("sends each guide to at least two real, indexable problems", () => {
    for (const article of articles.filter((a) => a.published)) {
      const ids = practiceProblemIds[article.slug] ?? [];
      assert.ok(ids.length >= 2, article.slug);
      for (const id of ids) assert.ok(findProblemPage(id)?.indexable, `${article.slug}: ${id}`);
    }
    assert.deepEqual(Object.keys(practiceProblemIds).filter((slug) => !articles.some((a) => a.slug === slug)), []);
  });
});
