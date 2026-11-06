import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProblemCard } from "../components/physics/problem-card";
import { TagFilterContext, isActiveTag, nextTagFilter, tagFilterHref } from "../components/physics/tag-filter";

const card = { id: "p1", title: "A wave problem", source: "Physcratic", tags: ["Waves", "Optics"], href: "/dashboard/problems/p1" };
const inLibrary = (active: string) =>
  renderToStaticMarkup(createElement(TagFilterContext.Provider, { value: { active, toggle() {} } }, createElement(ProblemCard, card)));

test("in the library every tag on a card is a button named Filter by, at least 44px tall", () => {
  const html = inLibrary("all");
  assert.match(html, /<button[^>]*aria-label="Filter by Waves"/);
  assert.match(html, /<button[^>]*aria-label="Filter by Optics"/);
  const buttons = [...html.matchAll(/<button[^>]*aria-label="Filter by [^"]+"[^>]*>/g)].map((m) => m[0]);
  assert.equal(buttons.length, 2);
  for (const button of buttons) {
    assert.match(button, /type="button"/);
    assert.match(button, /min-h-11/, "44px on touch");
    assert.match(button, /aria-pressed="false"/);
  }
});

test("the tag the filter is set to shows as pressed, whatever its case", () => {
  const html = inLibrary("waves");
  assert.match(html, /aria-label="Filter by Waves"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*aria-label="Filter by Waves"/);
  assert.match(html, /aria-pressed="false"[^>]*aria-label="Filter by Optics"|aria-label="Filter by Optics"[^>]*aria-pressed="false"/);
});

test("outside the library the tags stay plain labels", () => {
  const html = renderToStaticMarkup(createElement(ProblemCard, card));
  assert.doesNotMatch(html, /Filter by/);
  assert.match(html, /Waves/);
});

test("pressing a tag sets it, pressing it again clears it", () => {
  assert.equal(nextTagFilter("all", "Waves"), "Waves");
  assert.equal(nextTagFilter("Waves", "Waves"), "all");
  assert.equal(nextTagFilter("waves", "Waves"), "all");
  assert.equal(nextTagFilter("Optics", "Waves"), "Waves");
  assert.ok(isActiveTag("Waves", "waves"));
  assert.ok(!isActiveTag("all", "all"));
});

test("the filter is in the address so it can be shared, and clearing it takes it out", () => {
  const set = tagFilterHref("https://physcratic.test/dashboard?view=problems&collection=arena&topic=Optics#results", "Waves");
  assert.equal(set, "/dashboard?view=problems&collection=arena&tag=Waves#results", "tag replaces topic and the rest stays");
  assert.equal(tagFilterHref("https://physcratic.test/dashboard?view=problems&tag=Waves", "all"), "/dashboard?view=problems");
  assert.equal(tagFilterHref("https://physcratic.test/dashboard?view=problems", "Newton’s laws"), "/dashboard?view=problems&tag=Newton%E2%80%99s+laws");
});
