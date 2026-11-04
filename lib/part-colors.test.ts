import assert from "node:assert/strict";
import test from "node:test";
import { assignPartColors, contrastRatio, partColor, partPalette } from "./part-colors";

// Theme surfaces from app/globals.css: card and page background, light then dark, as hex.
const surfaces = {
  light: { card: "#ffffff", page: "#f7f7f8" },
  dark: { card: "#18181b", page: "#131315" },
} as const;

test("palette has six distinct named hues", () => {
  assert.equal(partPalette.length, 6);
  assert.equal(new Set(partPalette.map((color) => color.name)).size, 6);
  assert.equal(new Set(partPalette.map((color) => color.light.border)).size, 6);
});

for (const theme of ["light", "dark"] as const) {
  test(`${theme}: chip text reaches 4.5:1 on its chip`, () => {
    for (const color of partPalette) {
      const ratio = contrastRatio(color[theme].chipText, color[theme].chipBackground);
      assert.ok(ratio >= 4.5, `${color.name} chip ${ratio.toFixed(2)}:1`);
    }
  });
  test(`${theme}: left border reaches 3:1 on the card and the page`, () => {
    for (const color of partPalette) {
      for (const [name, surface] of Object.entries(surfaces[theme])) {
        const ratio = contrastRatio(color[theme].border, surface);
        assert.ok(ratio >= 3, `${color.name} border on ${name} ${ratio.toFixed(2)}:1`);
      }
    }
  });
}

test("colours follow position and ignore label text", () => {
  assert.deepEqual(assignPartColors(["a", "b", "c"]), [0, 1, 2]);
  assert.deepEqual(assignPartColors(["x", "q", "m"]), [0, 1, 2]);
});

test("sub-parts share their parent's colour", () => {
  assert.deepEqual(assignPartColors(["A.1", "A.2", "B.1", "B.2", "B.3", "C.1"]), [0, 0, 1, 1, 1, 2]);
  assert.deepEqual(assignPartColors(["A.1", "a.2"]), [0, 0]);
});

test("the palette repeats after six parents and empty labels count as their own part", () => {
  assert.deepEqual(assignPartColors(["a", "b", "c", "d", "e", "f", "g"]), [0, 1, 2, 3, 4, 5, 0]);
  assert.deepEqual(assignPartColors(["", "", "A.1"]), [0, 1, 2]);
  assert.equal(partColor(7).name, partColor(1).name);
  assert.equal(partColor(-1).name, partColor(5).name);
});
