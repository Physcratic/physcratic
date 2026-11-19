import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { describe, it } from "node:test";
import sharp from "sharp";
import arena from "./arena/index.json";
import { arenaCardImageAlts } from "./arena/card-images";
import { arenaCardImage, buildCardImage, firstStatementFigure } from "./arena/card-image";
import { arenaCardImageSchema } from "./arena-schema";
import { findBannedWords, findCopyProblems } from "./copy-rules";
import { source01 } from "./arena/source-01";
import { source02 } from "./arena/source-02";
import { source03 } from "./arena/source-03";
import { source04 } from "./arena/source-04";
import { source05 } from "./arena/source-05";
import { source06 } from "./arena/source-06";
import { source07 } from "./arena/source-07";
import { source08 } from "./arena/source-08";

const seeds = [...source01, ...source02, ...source03, ...source04, ...source05, ...source06, ...source07, ...source08];
const withImage = arena.problems.filter((problem) => "image" in problem && problem.image);

describe("Arena card images", () => {
  it("are the first statement figure of a problem, never a solution image", () => {
    assert.equal(seeds.length, arena.problems.length);
    for (const seed of seeds) {
      const expected = firstStatementFigure(seed.statement);
      const entry = arena.problems.find((problem) => problem.id === seed.id) as { image?: { src: string } } | undefined;
      assert.ok(entry, seed.id);
      assert.equal(entry.image?.src ?? null, expected, seed.id);
      if (entry.image) {
        assert.doesNotMatch(entry.image.src, /solution/i, seed.id);
        assert.ok(!seed.solution.includes(entry.image.src) || seed.statement.includes(entry.image.src), seed.id);
      }
    }
    assert.ok(withImage.length >= 22, String(withImage.length));
  });

  it("point at public static files under /corpus/arena/figures that exist and have the stored size", async () => {
    for (const problem of withImage as { id: string; image: { src: string; width: number; height: number } }[]) {
      assert.ok(arenaCardImageSchema.safeParse(problem.image).success, problem.id);
      assert.match(problem.image.src, /^\/corpus\/arena\/figures\/[a-z0-9-]+-statement\.(png|svg)$/, problem.id);
      const file = `public${problem.image.src}`;
      assert.ok(existsSync(file), file);
      const meta = await sharp(file).metadata();
      assert.deepEqual({ width: meta.width, height: meta.height }, { width: problem.image.width, height: problem.image.height }, problem.id);
    }
  });

  it("have short alt text that describes the figure, not a file name, and obeys the copy rules", () => {
    for (const problem of withImage as { id: string; image: { src: string; alt: string } }[]) {
      const { alt, src } = problem.image;
      assert.ok(alt.length >= 10 && alt.length <= 90, `${problem.id}: ${alt.length}`);
      assert.doesNotMatch(alt, /\.(png|svg|jpg)\b|\/|_|statement/i, problem.id);
      assert.ok(!src.toLowerCase().includes(alt.toLowerCase()), problem.id);
      assert.deepEqual([...findCopyProblems(alt), ...findBannedWords(alt)], [], alt);
      assert.equal(alt, arenaCardImageAlts[problem.id], problem.id);
    }
  });

  it("have an entry in the alt map only for a problem that has a statement figure", () => {
    const ids = new Set(withImage.map((problem) => problem.id));
    assert.deepEqual(Object.keys(arenaCardImageAlts).sort(), [...ids].sort());
    for (const problem of arena.problems) assert.equal(arenaCardImage(problem.id) !== undefined, ids.has(problem.id), problem.id);
  });

  it("are refused by the generator when the alt, the figure or the size is missing", () => {
    const statement = "Text\n\n![A figure.](/corpus/arena/figures/x-statement.png)\n";
    assert.throws(() => buildCardImage("arena-x", statement, undefined, { width: 1, height: 1 }), /no entry/);
    assert.throws(() => buildCardImage("arena-x", "No figure here", "A short alt text", undefined), /no statement image/);
    assert.throws(() => buildCardImage("arena-x", statement, "A short alt text", undefined), /could not be measured/);
    assert.throws(() => buildCardImage("arena-x", statement, "Too short", { width: 10, height: 10 }));
    assert.equal(buildCardImage("arena-x", "No figure here", undefined, undefined), undefined);
    assert.equal(firstStatementFigure("![s](/corpus/arena/figures/a-solution.png)"), "/corpus/arena/figures/a-solution.png");
    assert.deepEqual(buildCardImage("arena-x", statement, "A short alt text", { width: 20, height: 10 }), { src: "/corpus/arena/figures/x-statement.png", alt: "A short alt text", width: 20, height: 10 });
  });
});
