import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import type { Pool } from "pg";
import { articles, findArticle, learnPath } from "./learn/articles";
import { bodyText, visibleStrings } from "./learn/reading";
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
  // The default of Simple mode: 1 percent relative, a tiny absolute floor. Advanced can change both.
  const key = { kind: "numeric", value: 10, units: "N", absTol: 1e-9, relTol: 0.01 };
  assert.equal(evaluateNumericAnswer({ kind: "numeric", value: 10.08, units: "N" }, key).status, "correct");
  assert.equal(evaluateNumericAnswer({ kind: "numeric", value: 10.2, units: "N" }, key).status, "incorrect");
  assert.equal(evaluateNumericAnswer({ kind: "numeric", value: 10, units: "kg" }, key).status, "needs-review");
  assert.equal(evaluateNumericAnswer({ kind: "numeric", value: 10, units: "1" }, { ...key, units: "" }).status, "correct");
  const expressionKey = { kind: "expression", expected: "1", variables: [{ name: "x", domain: "real", assumptions: [] }], angleUnit: "radians", exclusions: [] };
  // Phase 1: expression answers are checked with seeded test values. x/x equals 1 wherever it is defined, so it is now correct
  // (it was needs-review under the old exact prover).
  assert.equal(evaluateExpressionAnswer({ kind: "expression", expression: "x/x" }, expressionKey).status, "correct");
  assert.equal(evaluateExpressionAnswer({ kind: "expression", expression: "x+1" }, expressionKey).status, "incorrect");
  const authorText = bodyText(findArticle(slugs[1])!.body).join(" ");
  assert.match(authorText, /10\.08 N/);
  assert.match(authorText, /within 1 percent/);
  const studentText = bodyText(findArticle(slugs[0])!.body).join(" ");
  assert.match(studentText, /library opens Physcratic Arena/);
  assert.match(studentText, /no library tab/);
  assert.match(studentText, /Checks are not saved and do not change your rating/);
  assert.match(studentText, /later attempts on that revision count as assisted/);
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

const text = (slug: string) => bodyText(findArticle(slug)!.body).join(" ");
const words = (slug: string) => text(slug).split(/\s+/).filter(Boolean).length;

test("the guides keep to their word counts", () => {
  assert.ok(words("how-to-write-a-problem") >= 400 && words("how-to-write-a-problem") <= 700, `write guide has ${words("how-to-write-a-problem")} words`);
  assert.ok(words("how-to-use-physcratic") >= 400 && words("how-to-use-physcratic") <= 700, `use guide has ${words("how-to-use-physcratic")} words`);
  assert.equal(findArticle("how-to-write-a-problem")!.title, "How to write a problem in Problem Studio");
  assert.equal(findArticle("how-to-use-physcratic")!.title, "How to use Physcratic");
});

test("the guides follow the copy rules and never mention a partial status no grader returns", () => {
  const banned = /\b(elegant|worth|journey|unlock|craft|seamless|effortless|next-level|delve|elevate|game-changer|dive into|look no further)\b/i;
  for (const slug of slugs) {
    const article = findArticle(slug)!;
    const strings = [article.title, article.description, ...visibleStrings(article.body)];
    for (const value of strings) {
      assert.doesNotMatch(value, /[\u2013\u2014;]/u, `no dashes or semicolons: ${value.slice(0, 60)}`);
      assert.doesNotMatch(value, banned, value.slice(0, 60));
      assert.doesNotMatch(value, /partly correct/i, value.slice(0, 60));
      // British spelling: "practice" is the noun, "practise" the verb. No US spellings.
      assert.doesNotMatch(value, /\b(color|colors|behavior|center|favorite|analyze|recognize|organize|license|practiced|practicing)\b|\b(to|you|can|will) practice\b/i, `British spelling: ${value.slice(0, 60)}`);
    }
    assert.ok(article.description.length < 155 && article.title.length < 60);
  }
});

const source = (...paths: string[]) => paths.map((path) => readFileSync(path, "utf8")).join("\n");
const studio = source("components/authoring/problem-editor.tsx", "components/authoring/workspace.tsx", "components/authoring/studio-ui.tsx", "components/authoring/simple-editor.tsx", "components/authoring/simple-model.ts", "components/authoring/rich-math-text.tsx", "components/authoring/editor-fields.tsx", "components/tour/tours.ts", "components/tour/tour-help.tsx", "lib/problem-authoring-editor.ts");
const solving = source("components/physics/archive-answer-panel.tsx", "components/physics/problem-reader.tsx", "components/physics/problem-card.tsx", "components/physics/problem-library.tsx", "components/physics/topic-chips.tsx", "components/physics/arena-problem-reader.tsx", "components/physics/imported-problem-reader.tsx", "components/physics/corpus-problem-reader.tsx", "components/physics/solve-ui.tsx", "components/kokonutui/content.tsx", "components/kokonutui/sidebar.tsx", "lib/solve-feedback.ts", "lib/theme-setting.ts", "components/community/appearance-settings.tsx", "components/account-nav.tsx", "components/physics/dashboard-highlights.tsx", "components/tour/tours.ts", "components/tour/tour-help.tsx");

test("every button, card and tab the write guide names exists in Problem Studio", () => {
  for (const label of ["My drafts", "Simple", "Advanced", "Help", "Write your first problem", "Equation", "What&apos;s the question?", "Main question", "Choose an image", "Describe the image", "Final Answer (Solution)", "Answer preview", "Worked solution (required)", "Add part", "Where&apos;s it from?", "Estimated difficulty", "Done", "Publish", "All changes saved", "Correct", "Incorrect", "Needs review"]) {
    assert.ok(studio.includes(label), `Problem Studio has no "${label}"`);
  }
});

test("every button, tab and result the use guide names exists on the solving screens", () => {
  for (const label of ["Random quick practice", "Open problem", "Physcratic Arena", "Olympiad archive", "Guided exercises", "Find a problem", "Recommended problem", "Another problem", "Need a hint?", "Show solution", "Check answer", "Try again", "Next problem", "Worked solution", "Reading notes", "Could not read this answer", "Could not be decided", "Not answered", "Not correct yet", "Welcome to Physcratic", "Replay tours", "Settings", "Coaching", "Problem Studio"]) {
    assert.ok(solving.includes(label) || readFileSync("components/kokonutui/layout.tsx", "utf8").includes(label) || readFileSync("components/kokonutui/top-nav.tsx", "utf8").includes(label), `no "${label}" on the solving screens`);
  }
});
