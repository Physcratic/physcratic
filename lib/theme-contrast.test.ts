import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { it } from "node:test";
import { themeOptions } from "./theme-setting";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8").split("/* Theme surface roles.")[1];
function luminance(hsl: string) {
  const [h, s, l] = hsl.split(" ").map(parseFloat);
  const a = s / 100 * Math.min(l / 100, 1 - l / 100);
  return [0, 8, 4].map(n => {
    const k = (n + h / 30) % 12;
    const v = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
  }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
}
function contrast(a: string, b: string) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
for (const theme of themeOptions) {
  it(`${theme.label} keeps text and controls readable across base surfaces`, () => {
    const selector = theme.value === "light" ? ":root" : `.${theme.value}`;
    const block = css.slice(css.indexOf(`${selector} {`)).split("}")[0];
    const tokens = Object.fromEntries([...block.matchAll(/--([\w-]+): ([^;]+);/g)].map(m => [m[1], m[2]]));
    for (const surface of ["background", "card", "popover", "muted", "accent", "sidebar-background"]) {
      for (const ink of ["foreground", "muted-foreground"]) assert.ok(contrast(tokens[ink], tokens[surface]) >= 4.5, `${ink} on ${surface}`);
      assert.ok(contrast(tokens.input, tokens[surface]) >= 3, `control border on ${surface}`);
      assert.ok(contrast(tokens.ring, tokens[surface]) >= 3, `focus ring on ${surface}`);
    }
    assert.ok(contrast(tokens.primary, tokens["primary-foreground"]) >= 4.5, "primary action text");
  });
}
