import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProblemHeading } from "../components/physics/problem-heading";
import { ratingBand } from "../lib/rating-bands";
for (const rating of [0, 199, 200, 799, 800, 1599, 1600, 2599, 2600, 4000]) test(`shared heading retains the canonical ${rating} estimate band`, () => {
  const html = renderToStaticMarkup(React.createElement(ProblemHeading, { title: 'Actual Published Title', source: 'Community-authored problem', estimate: String(rating), tags: ['Mechanics', 'Mechanics', 'Energy'] }));
  assert.ok(html.includes(ratingBand(rating).name)); assert.ok(html.includes('(estimate)')); assert.ok(html.includes(`~${rating.toLocaleString('en-US')}`)); assert.equal((html.match(/Mechanics/g) ?? []).length, 1); assert.equal((html.match(/<h1/g) ?? []).length, 1);
});
test("legacy difficulty labels and long literal titles stay readable without invented ratings", () => {
  for (const estimate of [null, 'Intermediate', 'unknown legacy label', '4001']) {
    const title = '<script>private()</script>' + 'LongTitle'.repeat(30);
    const html = renderToStaticMarkup(React.createElement(ProblemHeading, { title, source: 'Community-authored problem', estimate }));
    assert.ok(html.includes('&lt;script&gt;')); assert.ok(!html.includes('<script>')); if (estimate) assert.ok(html.includes(estimate)); assert.ok(!html.includes('~'));
  }
});
