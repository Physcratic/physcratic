import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { articles } from "./learn/articles";
import { problems, topics } from "./physics";
import { findPublicProblem, indexableRoutes, publicRoutes, topicHasProblems } from "./seo/public-routes";
import { allProblemPages, findProblemPage, topicsWithProblems } from "./seo/problem-pages";

describe("public route registry", () => {
  it("has unique paths that start with /", () => {
    const paths = publicRoutes.map((r) => r.path);
    assert.equal(new Set(paths).size, paths.length);
    for (const p of paths) assert.ok(p.startsWith("/"), p);
  });
  it("has no query-string URLs, so no ?view= or ?topic= in the sitemap", () => {
    assert.deepEqual(publicRoutes.filter((r) => r.path.includes("?")).map((r) => r.path), []);
  });
  it("lists the home page, the library and the archive", () => {
    const paths = indexableRoutes.map((r) => r.path);
    for (const path of ["/", "/problems", "/problems/archive"]) assert.ok(paths.includes(path), path);
    assert.ok(!paths.includes("/dashboard"), "the signed-in app is not in the sitemap");
  });
  it("resolves every problem id and lists every problem page", () => {
    const listed = publicRoutes.filter((r) => r.kind === "problem");
    assert.equal(listed.length, allProblemPages().length);
    for (const r of listed) {
      const id = r.path.split("/").pop()!;
      assert.equal(findProblemPage(id)?.id, id);
      assert.equal(r.path, `/dashboard/problems/${id}`);
    }
    assert.equal(findProblemPage("nope"), undefined);
    assert.equal(findPublicProblem("nope"), null);
    assert.ok(listed.filter((r) => r.group === "practice").length === problems.length);
    assert.equal(listed.filter((r) => r.group === "archive").length, 102)
  });
  it("gives every topic with problems a path of its own", () => {
    const listed = publicRoutes.filter((r) => r.kind === "topic").map((r) => r.path);
    assert.deepEqual(listed, topicsWithProblems().map((t) => `/problems/topics/${t.slug}`));
    for (const t of topics) assert.equal(topicHasProblems(t.name), topicsWithProblems().some((x) => x.name === t.name || (t.name === "Modern" && x.slug === "modern-physics")), t.name);
  });
  it("lists 100 archive pages in the sitemap, and leaves out the two with too little text", () => {
    const archive = allProblemPages().filter((p) => p.kind === "archive");
    assert.equal(archive.length, 102)
    for (const p of archive) assert.equal(indexableRoutes.some((r) => r.path === p.path), !p.thin, p.path);
    assert.deepEqual(archive.filter((p) => p.thin).map((p) => p.id), ["ipho-2017-t2", "ipho-2017-t3"]);
    for (const p of allProblemPages().filter((x) => x.kind !== "archive")) assert.ok(indexableRoutes.some((r) => r.path === p.path), p.path);
    assert.equal(publicRoutes.filter((r) => r.group === "archive").length, 102, "all pages stay in the registry")
  });
  it("excludes noindex pages from the indexable list", () => {
    assert.ok(publicRoutes.some((r) => r.path === "/terms"));
    assert.ok(!indexableRoutes.some((r) => r.path === "/terms"));
  });
  it("takes lastmod from the data, as a date, and never invents one", () => {
    for (const r of publicRoutes) if (r.lastmod) assert.match(r.lastmod, /^\d{4}-\d{2}-\d{2}$/, r.path);
    for (const r of publicRoutes.filter((x) => x.kind === "coaching")) assert.equal(r.lastmod, undefined);
    for (const r of publicRoutes.filter((x) => x.kind === "problem" && x.group === "practice")) {
      const own = problems.find((p) => `/dashboard/problems/${p.id}` === r.path)!;
      assert.equal(r.lastmod, own.addedAt);
    }
    for (const r of publicRoutes.filter((x) => x.group === "archive" || x.group === "arena")) assert.ok(r.lastmod, r.path);
  });
  it("lists the coaching page and its two form pages, and not the removed training page", () => {
    const coaching = indexableRoutes.filter((r) => r.kind === "coaching").map((r) => r.path);
    assert.deepEqual(coaching, ["/coaching", "/coaching/consultation", "/coaching/become-a-tutor"]);
    assert.ok(!publicRoutes.some((r) => r.path === "/coaching/training"));
  });
  it("lists the hub and every published guide, and no unpublished one", () => {
    const learn = indexableRoutes.filter((r) => r.kind === "learn").map((r) => r.path);
    assert.ok(learn.includes("/learn"));
    for (const a of articles) {
      assert.equal(learn.includes(`/learn/${a.slug}`), a.published, a.slug);
    }
  });
});
