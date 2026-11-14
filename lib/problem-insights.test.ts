import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { findArticle } from "./learn/articles";
import { headingId, visibleStrings } from "./learn/reading";
import { problemInsights, findPublishedProblemInsight } from "./problem-insights";
import { publicRoutes } from "./seo/public-routes";
import { findProblemPage } from "./seo/problem-pages";
const fingerprints: Record<string, string[]> = {
  "ipho-2009-t1": ["d33c90b9353747045d51c1fcf29c28290371fcdc036ae79aa6dc41409bc56560", "ce30702d56bfd330316994aa217f3b66b716b465efadcdebc9ecdf21982982be"],
  "ipho-2010-t1": ["67701ceca004cc12a187b6f0d8dc950a73ec9af64dc1a22b2f7e0bba0af0d195", "b7b89a6e6394a7b4a10d21c091d0eb90b9b58ed5bac5df9044e69c82e9fbe20f"],
};
test("exactly two source-verified editorial drafts with working learning destinations", () => {
  assert.deepEqual(problemInsights.map(i => i.problemId), Object.keys(fingerprints));
  for (const insight of problemInsights) {
    assert.equal(insight.published, false);
    assert.equal(insight.reviewedBy, null);
    assert.equal(findPublishedProblemInsight(insight.problemId), null);
    assert.ok(findProblemPage(insight.problemId)?.indexable);
    assert.ok(publicRoutes.some(r => r.path === `/problems/topics/${insight.topic}` && r.indexable));
    const article = findArticle(insight.guide.slug)!;
    assert.ok(article);
    if (insight.guide.hash) assert.ok(article.body.some(b => b.type === "heading" && headingId(b.text) === insight.guide.hash));
    for (const [index, kind] of ["statement", "solution"].entries()) {
      const bytes = readFileSync(`public/corpus/documents/english-${insight.problemId}-${kind}/document.pdf`);
      assert.equal(createHash("sha256").update(bytes).digest("hex"), fingerprints[insight.problemId][index]);
    }
    for (const text of visibleStrings([insight.title, insight.prerequisites, insight.idea, insight.misconception, insight.hints, insight.sources.map(s => s.title)])) assert.doesNotMatch(text, /[\u2013\u2014;]/u);
  }
  assert.equal(findPublishedProblemInsight("ipho-2016-t1"), null);
  assert.equal(findPublishedProblemInsight("unknown"), null);
});
