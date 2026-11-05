import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { articles, formatDate, publishedArticles } from "./learn/articles";
import { renderMath } from "./learn/math";
import { headingId, readingMinutes, wordCount } from "./learn/reading";
import { CHECK_HOST_SITE, type Article } from "./learn/types";
import { problems } from "./physics";

const citedIds = (a: Article): string[] => {
  const ids: string[] = [];
  for (const b of a.body) {
    if ("cite" in b && b.cite) ids.push(...b.cite);
    if (b.type === "table") {
      for (const r of b.rows) for (const c of r.cells) ids.push(...(c.cite ?? []));
    }
  }
  return ids;
};

describe("learn articles", () => {
  it("has unique slugs, four reviewed guides and two product guides", () => {
    const slugs = articles.map((a) => a.slug);
    assert.equal(new Set(slugs).size, slugs.length);
    assert.equal(articles.length, 6);
  });
  for (const a of articles) {
    describe(a.slug, () => {
      it("meets title, description and date rules", () => {
        assert.ok(a.title.length < 60, `title ${a.title.length}`);
        assert.ok(a.description.length < 155, `description ${a.description.length}`);
        assert.match(a.updated, /^\d{4}-\d{2}-\d{2}$/);
        assert.ok(!Number.isNaN(Date.parse(a.updated)));
        assert.match(a.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/);
      });
      it("records human review only for reviewed guides", () => {
        if (a.kind === "product") {
          assert.equal(a.reviewedBy, null);
          return;
        }
        assert.equal(a.reviewedBy.name, "Arrow Dunatos");
        assert.equal(a.reviewedBy.credential, "IPhO 2026 bronze medallist");
      });
      it("keeps the existing guide length limits and allows complete product documentation", () => {
        const words = wordCount(a.body);
        const [min, max] = a.kind === "product" ? [400, 700] : a.slug === "physics-olympiad-books-and-resources" ? [700, 1200] : [900, 1400];
        assert.ok(words >= min && words <= max, `${words} words`);
      });
      it("computes reading minutes at 220 words a minute", () => {
        assert.equal(a.readingMinutes, readingMinutes(a.body));
        assert.equal(a.readingMinutes, Math.ceil(wordCount(a.body) / 220));
      });
      it("has complete sources", () => {
        const ids = a.sources.map((s) => s.id);
        assert.equal(new Set(ids).size, ids.length);
        for (const s of a.sources) {
          assert.ok(s.title && s.publisher, s.id);
          assert.match(s.url, /^https:\/\//);
          assert.match(s.accessed, /^\d{4}-\d{2}-\d{2}$/);
        }
      });
      it("cites only known sources, uses every source, and numbers them by first use", () => {
        const cited = citedIds(a);
        const ids = a.sources.map((s) => s.id);
        for (const id of cited) assert.ok(ids.includes(id), `unknown cite ${id}`);
        const firstUse = [...new Set(cited)];
        assert.deepEqual(firstUse, ids);
      });
      it("has headings in order, starting at h2", () => {
        const headings = a.body.filter((b) => b.type === "heading");
        assert.equal(headings[0]?.level, 2);
        let previous = 2;
        for (const h of headings) {
          assert.ok(h.level <= previous + 1, h.text);
          previous = h.level;
        }
        const texts = headings.map((h) => h.text);
        assert.equal(new Set(texts).size, texts.length, "duplicate heading");
      });
      it("links only to problems that exist", () => {
        for (const b of a.body) {
          if (b.type === "problemLink") {
            assert.ok(problems.some((p) => p.id === b.problemId), b.problemId);
          }
        }
      });
      it("links only to guides and headings that exist", () => {
        for (const b of a.body) {
          if (b.type !== "guideLink") continue;
          const target = articles.find((x) => x.slug === b.slug);
          assert.ok(target, b.slug);
          if (b.hash) {
            const ids = target.body
              .filter((x) => x.type === "heading")
              .map((h) => headingId(h.text));
            assert.ok(ids.includes(b.hash), b.hash);
          }
        }
      });
      it("renders every formula", () => {
        for (const b of a.body) {
          if (b.type === "math") assert.match(renderMath(b.tex), /katex/);
        }
      });
      it("cites every table cell unless it says to check the host site", () => {
        for (const b of a.body) {
          if (b.type !== "table") continue;
          for (const r of b.rows) {
            assert.equal(r.cells.length, b.head.length - 1, r.header);
            for (const c of r.cells) {
              assert.ok(
                (c.cite && c.cite.length > 0) || c.text === CHECK_HOST_SITE,
                `${r.header}: ${c.text}`,
              );
            }
          }
        }
      });
    });
  }
  it("guide B ends with a table", () => {
    const b = articles.find((x) => x.slug === "ipho-apho-eupho-differences")!;
    assert.equal(b.body.at(-1)?.type, "table");
  });
  it("only publishes published guides", () => {
    assert.ok(publishedArticles.every((a) => a.published));
  });
  it("formats dates in British English", () => {
    assert.equal(formatDate("2026-11-01"), "1 November 2026");
  });
});
