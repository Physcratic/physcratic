import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { catalogProblems } from "./corpus-catalog";
import { iphoSubproblems } from "./ipho-archive";
import { problems } from "./physics";
import { SITE } from "./site";
import {
  competitionBreakdown,
  counts,
  topicCards,
  warmUpIds,
  warmUps,
} from "../components/landing/data";

const EM = "—";
const EN = "–";

describe("landing data", () => {
  it("derives counts from the real data", () => {
    assert.equal(counts.olympiad, catalogProblems.length);
    assert.equal(counts.warmUps, problems.length);
    assert.equal(counts.iphoSubproblems, iphoSubproblems.length);
    assert.match(competitionBreakdown, /^\d+ IPhO, \d+ APhO, \d+ EuPhO$/);
  });
  it("links every topic with its raw URL value and a display label", () => {
    const modern = topicCards.find((t) => t.value === "Modern");
    assert.equal(modern?.label, "Modern physics");
    assert.equal(modern?.href, "/dashboard?view=problems&topic=Modern");
    for (const t of topicCards) assert.ok(t.count > 0, t.value);
  });
  it("features six existing warm-up problems, one per topic first", () => {
    assert.equal(warmUps.length, 6);
    assert.deepEqual(
      warmUps.slice(0, 4).map((p) => p.topic),
      ["Mechanics", "Electromagnetism", "Waves", "Thermodynamics"],
    );
    for (const id of warmUpIds) assert.ok(problems.some((p) => p.id === id), id);
  });
});

describe("copy rules: no em dashes, en dashes or semicolons in visible text", () => {
  it("site strings", () => {
    for (const text of [SITE.defaultTitle, SITE.tagline, SITE.description]) {
      assert.ok(!text.includes(EM) && !text.includes(EN) && !text.includes(";"), text);
    }
    assert.equal(SITE.tagline, "Physics Olympiad practice for IPhO, APhO and EuPhO");
    assert.equal(SITE.defaultTitle, `${SITE.tagline} | Physcratic`);
  });
  it("landing sources contain no dash characters", () => {
    const dir = join(__dirname, "../components/landing");
    const files = readdirSync(dir).map((f) => join(dir, f));
    files.push(join(__dirname, "../app/page.tsx"));
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      assert.ok(!text.includes(EM) && !text.includes(EN), file);
    }
  });
});
