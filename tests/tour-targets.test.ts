import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { tourIds, tours } from "../components/tour/tours";

// Every name a tour step points at must be set somewhere in the source as a data-tour attribute, so a rename or a
// deleted element cannot break a tour without a test failing. The browser script checks the tours on real pages.

function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (!["node_modules", ".next", "corpus", "translations"].includes(name)) sources(path, out);
    } else if (/\.(tsx|ts)$/.test(name) && !/\.test\./.test(name)) out.push(path);
  }
  return out;
}

const defined = new Set<string>();
for (const file of [...sources("components"), ...sources("app")]) {
  const text = readFileSync(file, "utf8");
  for (const line of text.split("\n")) {
    if (!/data-tour|buttonTour|tour=|tour\b.*\?/.test(line) || /tourId|tour\.(autoStart|steps)/.test(line)) continue;
    for (const match of line.matchAll(/["']([a-z]+(?:-[a-z]+)+)["']/g)) defined.add(match[1]);
  }
}

test("every name a tour step points at is set as a data-tour attribute in the source", () => {
  const missing: string[] = [];
  for (const id of tourIds) for (const step of tours[id].steps) for (const name of step.targets) if (!defined.has(name)) missing.push(`${id}/${step.id}: ${name}`);
  assert.deepEqual(missing, []);
});

test("each tour has unique step ids and short, plain steps", () => {
  for (const id of tourIds) {
    const tour = tours[id];
    assert.equal(new Set(tour.steps.map((s) => s.id)).size, tour.steps.length, `${id}: unique ids`);
    for (const step of tour.steps) {
      assert.ok(step.targets.length > 0, `${id}/${step.id}: has a target`);
      const sentences = step.text.split(/(?<=[.!?])\s+/).filter(Boolean);
      assert.ok(sentences.length <= 2, `${id}/${step.id}: one or two sentences`);
      assert.ok(step.title.length <= 30, `${id}/${step.id}: short title`);
      assert.ok(!/[—–;]/.test(step.title + step.text), `${id}/${step.id}: no dashes or semicolons`);
    }
  }
});

test("the Welcome tour covers the places the owner asked for, in order", () => {
  const ids = tours.welcome.steps.map((s) => s.id);
  assert.deepEqual(ids, ["library", "topics", "open", "answer", "typing", "palette", "check", "help", "coaching", "settings"]);
  assert.deepEqual(tours.studio.steps.map((s) => s.id), ["main", "question", "equation", "typing", "picture", "solution", "answer", "try", "source", "difficulty", "publish"]);
});
