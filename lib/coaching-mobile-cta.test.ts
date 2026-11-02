import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { MOBILE_CTA_SPACE, hideMobileCta } from "./coaching/mobile-cta";

describe("coaching mobile consultation bar", () => {
  it("hides while the hero call to action or the footer is visible", () => {
    assert.equal(hideMobileCta({ hero: false, footer: false }), false);
    assert.equal(hideMobileCta({ hero: true, footer: false }), true);
    assert.equal(hideMobileCta({ hero: false, footer: true }), true);
  });
  it("leaves room for the bar and its margin under the footer, and makes footer links touch sized", () => {
    const css = readFileSync(new URL("../app/coaching/coaching.module.css", import.meta.url), "utf8");
    const footer = readFileSync(new URL("../components/coaching/coaching-sections.tsx", import.meta.url), "utf8");
    assert.equal(MOBILE_CTA_SPACE, "4rem");
    assert.match(footer, /pb-\[calc\(4rem\+env\(safe-area-inset-bottom\)\)\]/);
    assert.match(css, /@media \(pointer: coarse\) \{ \.page :global\(\.coaching-footer-link\) \{ display: inline-flex; min-height: 2\.75rem/);
    assert.equal((footer.match(/coaching-footer-link/g) ?? []).length, 2);
  });
});
