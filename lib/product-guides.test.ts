import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import type { Pool } from "pg";
import { articles, findArticle, learnPath } from "./learn/articles";
import { bodyText } from "./learn/reading";
import { articleGraph } from "./seo/json-ld";
import { publicRoutes } from "./seo/public-routes";
import { problems } from "./physics";
import { catalogProblems } from "./corpus-catalog";
import arena from "./arena/index.json";
import { createProblemAuthoringApi } from "./problem-authoring-api";
import { evaluateNumericAnswer } from "./authored-numeric-grading";
import { evaluateExpressionAnswer } from "./authored-symbolic-grading";
import { physicsTagLabel } from "./physics-taxonomy";
import { parseProblemCollection } from "./problem-collection-route";

const slugs = ["how-to-use-physcratic", "how-to-write-a-problem"];

test("product guides are published through the existing registry with no invented human reviewer or sources", () => {
  assert.equal(articles.filter((a) => a.kind !== "product").length, 4);
  for (const slug of slugs) {
    const article = findArticle(slug)!;
    assert.ok(article);
    assert.equal(article.kind, "product");
    assert.equal(article.reviewedBy, null);
    assert.deepEqual(article.sources, []);
    assert.ok(publicRoutes.some((r) => r.path === learnPath(slug) && r.indexable));
    const graph = articleGraph(article);
    assert.equal("reviewedBy" in graph[1], false);
    assert.doesNotMatch(JSON.stringify(graph), /Arrow Dunatos|bronze medallist/);
  }
  for (const article of articles.filter((a) => a.kind !== "product")) {
    assert.equal(article.reviewedBy?.name, "Arrow Dunatos");
    assert.ok("reviewedBy" in articleGraph(article)[1]);
  }
  assert.match(readFileSync("components/authoring/studio-ui.tsx", "utf8"), /HOW_IT_WORKS_HREF = "\/learn\/how-to-write-a-problem"/);
});

test("every contextual product-guide link targets a real implemented route or public static problem", () => {
  const ids = new Set([...problems, ...catalogProblems, ...arena.problems].map((p) => p.id));
  for (const slug of slugs) {
    for (const block of findArticle(slug)!.body) {
      if (block.type === "guideLink") assert.ok(findArticle(block.slug), block.slug);
      if (block.type === "problemLink") assert.ok(ids.has(block.problemId), block.problemId);
      if (block.type !== "siteLink") continue;
      assert.ok(block.href.startsWith("/") && !block.href.startsWith("//"));
      const url = new URL(block.href, "https://physcratic.test");
      if (url.pathname.startsWith("/dashboard/problems/")) {
        assert.ok(ids.has(url.pathname.split("/").at(-1)!), block.href);
      } else assert.ok(existsSync(join("app", url.pathname, "page.tsx")), block.href);
      if (url.searchParams.has("collection")) assert.equal(parseProblemCollection(url.searchParams.get("collection")), url.searchParams.get("collection"));
    }
  }
});

test("the documented author access is the existing owner-scoped verified-account contract", async () => {
  for (const [user, status] of [[null, 401], [{ id: "guide-author", emailVerified: false }, 403], [{ id: "guide-author", emailVerified: true }, 200]] as const) {
    const queries: unknown[][] = [];
    const pool = { query: async (_text: string, values: unknown[]) => { queries.push(values); return { rows: [] }; } } as unknown as Pool;
    const api = createProblemAuthoringApi({ pool, user: async () => user, origin: () => true });
    const response = await api("list", new Request("https://physcratic.test/api/authored-problems"));
    assert.equal(response.status, status);
    if (status === 200) assert.equal(queries[0][0], "guide-author");
    else assert.equal(queries.length, 0);
  }
  const text = bodyText(findArticle(slugs[1])!.body).join(" ");
  assert.match(text, /email-verified account/);
  assert.match(text, /no separate staff invitation requirement/);
  assert.ok(text.includes(physicsTagLabel("mechanics", "topic")));
  assert.ok(text.includes(physicsTagLabel("newtons-laws", "method")));
});

test("documented tolerance, units and limited-symbolic examples agree with actual graders", () => {
  const key = { kind: "numeric", value: 10, units: "N", absTol: 0.05, relTol: 0.01 };
  assert.equal(evaluateNumericAnswer({ kind: "numeric", value: 10.08, units: "N" }, key).status, "correct");
  assert.equal(evaluateNumericAnswer({ kind: "numeric", value: 10.2, units: "N" }, key).status, "incorrect");
  assert.equal(evaluateNumericAnswer({ kind: "numeric", value: 10, units: "kg" }, key).status, "needs-review");
  assert.equal(evaluateNumericAnswer({ kind: "numeric", value: 10, units: "1" }, { ...key, units: "" }).status, "correct");
  const expressionKey = { kind: "expression", expected: "1", variables: [{ name: "x", domain: "real", assumptions: [] }], angleUnit: "radians", exclusions: [] };
  assert.equal(evaluateExpressionAnswer({ kind: "expression", expression: "x/x" }, expressionKey).status, "needs-review");
  const authorText = bodyText(findArticle(slugs[1])!.body).join(" ");
  assert.match(authorText, /10\.08 N/);
  assert.match(authorText, /Relative tolerance to 0\.01/);
  const studentText = bodyText(findArticle(slugs[0])!.body).join(" ");
  assert.match(studentText, /Quick practice and Arena checks/);
  assert.match(studentText, /Physcratic Arena by default/);
  assert.match(studentText, /no longer have a library tab/);
  assert.match(studentText, /not saved attempts and do not award ELO/);
  assert.match(studentText, /subsequent new attempts on the entire revision assisted/);
});

/** Width and height from a WebP header (lossy, lossless or extended). No image library needed. */
function webpSize(file: Buffer) {
  assert.equal(file.toString("ascii", 0, 4), "RIFF");
  assert.equal(file.toString("ascii", 8, 12), "WEBP");
  const kind = file.toString("ascii", 12, 16);
  if (kind === "VP8 ") return { width: file.readUInt16LE(26) & 0x3fff, height: file.readUInt16LE(28) & 0x3fff };
  if (kind === "VP8L") {
    const bits = file.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  assert.equal(kind, "VP8X");
  return { width: file.readUIntLE(24, 3) + 1, height: file.readUIntLE(27, 3) + 1 };
}

test("every guide image is a real WebP, 1280px wide, under 200 KB, with alt text that describes the screen", () => {
  for (const article of articles) {
    for (const block of article.body) {
      if (block.type !== "image") continue;
      assert.ok(block.src.startsWith(`/learn/${article.slug}/`) && block.src.endsWith(".webp"), block.src);
      const path = join("public", block.src);
      assert.ok(existsSync(path), `${block.src} is missing`);
      const file = readFileSync(path);
      assert.ok(file.length < 200 * 1024, `${block.src} is ${file.length} bytes`);
      const size = webpSize(file);
      assert.equal(size.width, 1280, block.src);
      assert.deepEqual({ width: block.width, height: block.height }, size, `${block.src} width and height match the file`);
      assert.ok(block.alt.split(/\s+/).length >= 6 && /^[A-Z]/.test(block.alt), `${block.src} needs alt text that says what the screen shows`);
    }
  }
});
