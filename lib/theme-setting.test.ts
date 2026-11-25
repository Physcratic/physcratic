import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { themeChoice, themeOptions, themeMode } from "./theme-setting";

describe("theme setting", () => {
  it("offers three light and three dark themes", () => {
    assert.equal(themeOptions.filter(o => o.mode === "light").length, 3);
    assert.equal(themeOptions.filter(o => o.mode === "dark").length, 3);
    for (const option of themeOptions) {
      assert.equal(themeChoice(option.value), option.value);
      assert.equal(themeMode(option.value), option.mode);
    }
    assert.equal(themeMode("system"), "system");
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
