import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { themeChoice, themeOptions } from "./theme-setting";

describe("theme setting", () => {
  it("offers light, dark and system", () => {
    assert.deepEqual(themeOptions.map((o) => o.value), ["light", "dark", "system"]);
  });
  it("shows anything unknown as light", () => {
    assert.equal(themeChoice(undefined), "light");
    assert.equal(themeChoice("sepia"), "light");
    assert.equal(themeChoice("system"), "system");
    assert.equal(themeChoice("dark"), "dark");
  });
  it("defaults to light, keeps following the device when asked and has no theme toggle in the headers", () => {
    const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
    assert.match(layout, /defaultTheme="light"/);
    assert.match(layout, /enableSystem/);
    for (const file of ["../components/kokonutui/top-nav.tsx", "../app/learn/layout.tsx"]) {
      assert.doesNotMatch(readFileSync(new URL(file, import.meta.url), "utf8"), /ThemeToggle/);
    }
  });
});
