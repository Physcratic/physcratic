import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterCatalog } from "./corpus-catalog";
import { problems, topics } from "./physics";
import {
  findPublicProblem,
  indexableRoutes,
  publicRoutes,
  topicHasProblems,
} from "./seo/public-routes";

describe("public route registry", () => {
  it("has unique paths that start with /", () => {
    const paths = publicRoutes.map((r) => r.path);
    assert.equal(new Set(paths).size, paths.length);
    for (const p of paths) assert.ok(p.startsWith("/"), p);
  });
  it("resolves every problem id", () => {
    for (const r of publicRoutes.filter((r) => r.kind === "problem")) {
      const id = r.path.split("/").pop()!;
      assert.equal(findPublicProblem(id)?.id, id);
    }
    assert.equal(findPublicProblem("nope"), null);
    assert.equal(
      publicRoutes.filter((r) => r.kind === "problem").length,
      problems.length,
    );
  });
  it("lists a topic only when physics or the catalog has problems for it", () => {
    const listed = publicRoutes.filter((r) => r.kind === "topic");
    for (const t of topics) {
      const expected =
        problems.some((p) => p.topic === t.name) ||
        filterCatalog({ topic: t.name }).length > 0;
      assert.equal(topicHasProblems(t.name), expected, t.name);
      assert.equal(
        listed.some((r) => r.topic === t.name),
        expected,
        t.name,
      );
    }
  });
  it("maps Modern to the catalog's Modern physics tag", () => {
    assert.equal(
      topicHasProblems("Modern"),
      filterCatalog({ topic: "Modern physics" }).length > 0 ||
        problems.some((p) => p.topic === "Modern"),
    );
  });
  it("excludes noindex pages from the indexable list", () => {
    assert.ok(publicRoutes.some((r) => r.path === "/terms"));
    assert.ok(!indexableRoutes.some((r) => r.path === "/terms"));
  });
});
