import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Problem Studio has one editor. An earlier release stored a mode ("classic", "advanced" or "simple") under physcratic.studio.mode. Nothing
// reads or writes it now, so a stale value cannot change the editor. tests/studio-simple.browser.mjs opens the editor with each stale value.
const folders = ["components/authoring", "components/authored", "lib", "app"];
function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "corpus" || entry.name === "node_modules" ? [] : sources(path);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

test("no code reads or writes the stored Studio mode", () => {
  const found = folders.flatMap(sources).filter((file) => /physcratic\.studio\.mode|STUDIO_MODE_KEY|readStudioMode|CLASSIC_MODE_VALUE/.test(readFileSync(file, "utf8")));
  assert.deepEqual(found, []);
});

test("the Classic editor and its switch are gone from the Studio source", () => {
  const found = folders.flatMap(sources).filter((file) => /Classic editor|Back to the new editor|data-classic-link|advanced-sections/.test(readFileSync(file, "utf8")));
  assert.deepEqual(found, []);
});
