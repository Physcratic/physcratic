import assert from "node:assert/strict";
import test from "node:test";
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ProblemCard,
  type ProblemCardProps,
} from "../components/physics/problem-card";

const base = {
  id: "test-problem",
  title: "A block on an incline",
  source: "Quick practice",
  description: "Resolve the forces on a smooth incline.",
  details: ["5 min", "Hint + worked solution"],
  tags: ["Mechanics", "Newton’s laws"],
};

function render(props: ProblemCardProps) {
  return renderToStaticMarkup(createElement(ProblemCard, props));
}

test("problem cards share a labelled article, header, details and exercise action", () => {
  const html = render({ ...base, onOpen() {} });
  assert.match(html, /role="article"/);
  assert.match(html, /data-problem-card="test-problem"/);
  assert.match(html, /problem-entry-header/);
  assert.match(html, /problem-entry-details/);
  assert.match(html, /class="flex items-center justify-between gap-4"/);
  assert.match(html, /<h3[^>]*>.*A block on an incline/);
  assert.match(html, /5 min · Hint \+ worked solution/);
  assert.match(html, /English.*Unrated/);
  assert.match(html, /Exercise/);
  assert.match(html, /Exercise: Quick practice — A block on an incline/);
  assert.match(html, /Newton’s laws/);
});

test("unrated source problems never get a fabricated ELO estimate", () => {
  const html = render({ ...base, source: "Physcratic Arena", href: "/dashboard/problems/test-problem" });
  assert.match(html, /Unrated/);
  assert.doesNotMatch(html, /Estimated difficulty|~[\d,]+ ELO/);
  assert.match(html, /href="\/dashboard\/problems\/test-problem"/);
  assert.doesNotMatch(html, /<button/);
});

test("practice cards identify difficulty ratings as estimates and preserve rating bands", () => {
  for (const [elo, band, level] of [
    [900, "Foundational", "under-1200"],
    [1300, "Intermediate", "1200-1599"],
    [1700, "Advanced", "1600-plus"],
  ] as const) {
    const html = render({ ...base, elo, onOpen() {} });
    const formatted = elo.toLocaleString("en-US");
    assert.ok(html.includes(`>${formatted}</span>`));
    assert.ok(html.includes(`Estimated difficulty ${formatted}, ${band}`));
    assert.ok(html.includes("rounded-md"));
    assert.doesNotMatch(html, /~[\d,]+|\bELO\b/);
    assert.ok(html.includes(`data-level="${level}"`));
    assert.doesNotMatch(html, /Unrated/);
  }
});

test("all olympiad competitions retain their identity, source references and title language", () => {
  for (const competition of ["IPhO", "APhO", "EuPhO"] as const) {
    const html = render({
      ...base,
      title: "Движение тела",
      titleLanguage: "ru",
      headingLevel: 4,
      source: competition,
      competition,
      reference: "2025 · T1",
      statementLanguage: "ru",
      description: "Source title in Russian",
      onOpen() {},
    });
    assert.ok(html.includes(`data-competition="${competition}"`));
    assert.match(html, /2025 · T1/);
    assert.match(html, /<h4[^>]*lang="ru"/);
    assert.match(html, /Source title in Russian/);
    assert.doesNotMatch(html, /Russian statement|English statement/);
    assert.match(html, /русский.*Unrated/);
    assert.match(html, /Exercise:/);
  }
});

test("multiple instances of the same problem have unique accessible heading IDs", () => {
  const props: ProblemCardProps = { ...base, onOpen() {} };
  const html = renderToStaticMarkup(
    createElement(Fragment, null, createElement(ProblemCard, props), createElement(ProblemCard, props)),
  );
  const labels = [...html.matchAll(/aria-labelledby="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(labels.length, 2);
  assert.notEqual(labels[0], labels[1]);
  for (const id of labels) assert.ok(html.includes(`id="${id}"`));
});

test("problem metadata and titles are escaped rather than interpreted as markup", () => {
  const html = render({
    ...base,
    title: "Force < mass & acceleration",
    description: "<script>alert('test')</script>",
    onOpen() {},
  });
  assert.match(html, /Force &lt; mass &amp; acceleration/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});
