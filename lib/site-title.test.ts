import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { SITE } from "./site";

const brand = "Physcratic";

test("the default title is the brand, a spaced hyphen and the tagline, in 60 characters or fewer", () => {
  assert.equal(SITE.defaultTitle, "Physcratic - Physics Olympiad practice for IPhO, APhO, EuPhO");
  assert.ok(SITE.defaultTitle.startsWith(`${brand} - `), "a plain hyphen with a space on each side");
  assert.ok(!/[|–—]/.test(SITE.defaultTitle), "no pipe, en dash or em dash");
  assert.ok(SITE.defaultTitle.length <= 60);
});

test("the social image shows the title without its brand prefix", () => {
  const route = readFileSync("app/opengraph-image.tsx", "utf8");
  const stripped = route.match(/SITE\.defaultTitle\.replace\("([^"]*)", ""\)/)?.[1];
  assert.equal(stripped, `${brand} - `, "the image strips the same prefix the title starts with");
  const tagline = SITE.defaultTitle.replace(stripped!, "");
  assert.equal(tagline, "Physics Olympiad practice for IPhO, APhO, EuPhO");
  assert.ok(!tagline.includes(brand) && !tagline.includes(" - "), "no brand and no separator is left");
  assert.ok(tagline.length <= 50, "one line at the image's 38px tagline size");
});
