import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, it } from "node:test";
import { clampOgTitle, ogSize, ogTitleFontSize, ogTitleLimit } from "./og/text";

const imageFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return imageFiles(path);
    return /^opengraph-image\.tsx?$/.test(name) ? [path] : [];
  });
const routes = imageFiles(join(process.cwd(), "app")).map((file) => ({
  route: relative(join(process.cwd(), "app"), file).split(sep).slice(0, -1).join("/") || "/",
  source: readFileSync(file, "utf8"),
}));

describe("link preview text helpers", () => {
  it("leaves a short title alone and collapses stray whitespace", () => {
    assert.equal(clampOgTitle("Mind the Gap"), "Mind the Gap");
    assert.equal(clampOgTitle("  Mind \n the   Gap "), "Mind the Gap");
  });
  it("cuts a long title at a word boundary and ends it with three dots", () => {
    const long = "Thermoelectromagnetohydrodynamic ".repeat(8).trim();
    const out = clampOgTitle(long);
    assert.ok(out.length <= ogTitleLimit, String(out.length));
    assert.ok(out.endsWith("..."));
    assert.ok(!/[\s,.:;]\.\.\.$/.test(out));
    assert.equal(clampOgTitle("x".repeat(ogTitleLimit)), "x".repeat(ogTitleLimit));
    assert.equal(clampOgTitle("x".repeat(ogTitleLimit + 1)).length, ogTitleLimit);
  });
  it("uses a smaller font as a title grows and never below 46 pixels", () => {
    const sizes = [10, 36, 37, 60, 61, 90, 91, 120].map((n) => ogTitleFontSize("x".repeat(n)));
    assert.deepEqual(sizes, [76, 76, 64, 64, 54, 54, 46, 46]);
    for (let i = 1; i < sizes.length; i++) assert.ok(sizes[i] <= sizes[i - 1]);
  });
  it("is the 1200 by 630 size every route declares", () => {
    assert.deepEqual(ogSize, { width: 1200, height: 630 });
  });
});

describe("every link preview route uses the shared template", () => {
  it("covers the home page, the library, guides, topics, problems and coaching", () => {
    assert.deepEqual(
      routes.map((r) => r.route).sort(),
      ["/", "coaching", "dashboard/problems/[id]", "learn", "learn/[slug]", "problems", "problems/archive", "problems/topics/[slug]"],
    );
  });
  it("imports the template, builds no image of its own and reads no files", () => {
    for (const { route, source } of routes) {
      assert.match(source, /from "@\/lib\/og\/link-preview"/, route);
      assert.doesNotMatch(source, /ImageResponse|next\/og|readFile|node:fs/, route);
      assert.match(source, /export const size = \{ width: 1200, height: 630 \};/, route);
      assert.match(source, /export const contentType = "image\/png";/, route);
      assert.match(source, /export const alt = /, route);
    }
  });
  it("keeps the template reading only the one public logo", () => {
    const template = readFileSync(join(process.cwd(), "lib/og/link-preview.tsx"), "utf8");
    assert.deepEqual([...template.matchAll(/readFile\(/g)].length, 1);
    assert.deepEqual([...template.matchAll(/public\/[\w./-]+/g)].map((m) => m[0]), ["public/logo-mark-transparent.png"]);
    assert.doesNotMatch(template, /fetch\(|corpus|\.env|process\.env/);
  });
});
