import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProblemHeading } from "../components/physics/problem-heading";
import { ratingBand } from "../lib/rating-bands";
for (const rating of [0, 799, 800, 801, 1599, 1600, 1800, 1801, 2599, 2600, 2601, 3200, 3201, 4000]) test(`shared heading retains the canonical ${rating} estimate band`, () => {
  const html = renderToStaticMarkup(React.createElement(ProblemHeading, { title: 'Actual Published Title', source: 'Community-authored problem', estimate: String(rating), tags: ['Mechanics', 'Mechanics', 'Energy'] }));
  assert.ok(html.includes(ratingBand(rating).name)); assert.ok(!html.includes('(estimate)')); assert.ok(!html.includes('~')); const shown = rating.toLocaleString('en-US'); assert.ok(html.includes(`<span class="tabular-nums">${shown}</span> <span>${ratingBand(rating).name}</span>`)); assert.ok(html.includes(`aria-label="Rating ${shown}, ${ratingBand(rating).name}"`)); assert.ok(!html.includes('·')); assert.equal((html.match(/Mechanics/g) ?? []).length, 1); assert.equal((html.match(/<h1/g) ?? []).length, 1);
});
test("legacy difficulty labels and long literal titles stay readable without invented ratings", () => {
  for (const estimate of [null, 'Intermediate', 'unknown legacy label', '4001']) {
    const title = '<script>private()</script>' + 'LongTitle'.repeat(30);
    const html = renderToStaticMarkup(React.createElement(ProblemHeading, { title, source: 'Community-authored problem', estimate }));
    assert.ok(html.includes('&lt;script&gt;')); assert.ok(!html.includes('<script>')); if (estimate) assert.ok(html.includes(estimate)); assert.ok(!html.includes('~'));
  }
});
test("source, year and task are separate spans with no glyph between them", () => {
  const html = renderToStaticMarkup(React.createElement(ProblemHeading, { title: 'Walking Past Two Speakers', source: 'IPhO', year: 2026, task: 'T1' }));
  assert.ok(html.includes('<span>IPhO</span><span>2026</span><span>T1</span>'));
  assert.ok(!html.includes('·'));
  const plain = renderToStaticMarkup(React.createElement(ProblemHeading, { title: 'Title', source: 'Community-authored problem' }));
  assert.ok(plain.includes('<span>Community-authored problem</span></div>'));
});
