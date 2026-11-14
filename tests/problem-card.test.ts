import assert from "node:assert/strict";
import test from "node:test";
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ProblemCard,
  type ProblemCardProps,
} from "../components/physics/problem-card";

import { ArenaCollection } from "../components/physics/arena-collection";
import { ProblemCollection } from "../components/physics/problem-collection";
import { OlympiadProblemCard } from "../components/physics/olympiad-problem-card";
import { catalogProblems } from "../lib/corpus-catalog";
import arena from "../lib/arena/index.json";
import { getEstimatedProblemElo } from "../lib/problem-archive";

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

test("problem cards share a labelled article, header, details and open action", () => {
  const html = render({ ...base, onOpen() {} });
  assert.match(html, /role="article"/);
  assert.match(html, /data-problem-card="test-problem"/);
  assert.match(html, /problem-entry-header/);
  assert.match(html, /problem-entry-details/);
  assert.match(html, /class="flex items-center justify-between gap-4"/);
  assert.match(html, /<h3[^>]*>.*A block on an incline/);
  assert.match(html, /5 min · Hint \+ worked solution/);
  assert.match(html, /English.*Unrated/);
  assert.match(html, /Open problem/);
  assert.match(html, /Open problem: Quick practice, A block on an incline/);
  assert.match(html, /Newton’s laws/);
});

test("cards without extra metadata retain their title, difficulty, tags and open action", () => {
  const html = render({
    ...base,
    title: "Champagne!",
    details: undefined,
    elo: 2500,
    onOpen() {},
  });
  assert.match(html, /Champagne!/);
  assert.match(html, /Estimated difficulty 2,500/);
  assert.match(html, /Newton’s laws/);
  assert.match(html, /Open problem: Quick practice, Champagne!/);
  assert.doesNotMatch(html, /border-destructive|5 min|Hint \+ worked solution|scored subparts|Official solution/);
});

test("each card has one control, so keyboard users get one tab stop per problem", () => {
  const withLink = render({ ...base, href: "/dashboard/problems/test-problem" });
  assert.equal((withLink.match(/<a[\s>]/g) ?? []).length, 1);
  assert.equal((withLink.match(/<button[\s>]/g) ?? []).length, 0);
  assert.match(withLink, /href="\/dashboard\/problems\/test-problem"/);
  assert.match(withLink, />Open problem</);
  const withButton = render({ ...base, onOpen() {} });
  assert.equal((withButton.match(/<a[\s>]/g) ?? []).length, 0);
  assert.equal((withButton.match(/<button[\s>]/g) ?? []).length, 1);
  assert.doesNotMatch(withLink + withButton, /Exercise/);
});

test("cards without a supplied difficulty never invent an estimate", () => {
  const html = render({ ...base, source: "Physcratic Arena", href: "/dashboard/problems/test-problem" });
  assert.match(html, /Unrated/);
  assert.doesNotMatch(html, /Estimated difficulty|~[\d,]+ ELO/);
  assert.match(html, /href="\/dashboard\/problems\/test-problem"/);
  assert.doesNotMatch(html, /<button/);
});

test("practice cards identify difficulty ratings as estimates and preserve rating bands", () => {
  for (const [elo, band, level] of [
    [150, "Beginner", "beginner-olympiad"],
    [800, "Beginner", "beginner-olympiad"],
    [801, "Intermediate", "intermediate-olympiad"],
    [1800, "Intermediate", "intermediate-olympiad"],
    [1801, "Advanced", "advanced"],
    [2600, "Advanced", "advanced"],
    [2250, "Advanced", "advanced"],
    [2601, "Mastery", "mastery"],
    [3201, "Mastery", "mastery"],
    [4000, "Mastery", "mastery"],
  ] as const) {
    const html = render({ ...base, elo, onOpen() {} });
    const formatted = elo.toLocaleString("en-US");
    assert.ok(html.includes(`>${formatted}</span>`));
    assert.ok(html.includes(`Estimated difficulty ${formatted}, ${band}`));
    // The band name is shown next to the rating, not only read out.
    assert.ok(html.includes(`<span class="text-sm">${band}</span>`), `${band} is shown on the card`);
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
    assert.match(html, /Open problem:/);
  }
});

test("Arena cards use the archive template and retain their individual difficulty badges", () => {
  const html = renderToStaticMarkup(createElement(ArenaCollection, {
    query: "", topic: "all", difficulty: "all", onReset() {},
  }));
  assert.equal([...html.matchAll(/data-problem-card=/g)].length, 10);
  assert.equal([...html.matchAll(/aria-label="Estimated difficulty /g)].length, 10);
  for (const problem of arena.problems.slice(0, 10)) {
    assert.ok(html.includes(`Estimated difficulty ${getEstimatedProblemElo(problem.id).toLocaleString("en-US")},`));
    assert.ok(html.includes(`href="/dashboard/problems/${problem.id}"`));
  }
  assert.doesNotMatch(html, /Unrated|Self-review|Statement \+ worked solution/);
  assert.match(html, /id="arena-results"/);
  assert.match(html, /18 of 18 problems · Showing 1 to 10/);
  assert.equal([...html.matchAll(/Page 1 of 2/g)].length, 2);
  assert.match(html, /aria-label="Arena pages \(top\)"/);
  assert.match(html, /aria-label="Arena pages \(bottom\)"/);
});

function renderCollection(count: number, totalCount = count, page?: number, paginationKey = "all") {
  return renderToStaticMarkup(createElement(ProblemCollection, {
    id: "test-results",
    title: "Test collection",
    paginationLabel: "Test",
    items: Array.from({ length: count }, (_, index) => ({ id: `problem-${index + 1}` })),
    totalCount,
    filterKey: "all",
    pagination: page === undefined ? undefined : { key: paginationKey, page, onChange() {} },
    renderProblem: (problem) => createElement("article", { "data-problem-card": problem.id }, problem.id),
    emptyTitle: "No matching problems",
    emptyDescription: "Try another filter.",
    onReset() {},
  }));
}

test("the shared collection reuses archive spacing, heading and top/bottom pagination", () => {
  for (const count of [5, 10, 12, 18, 100]) {
    const html = renderCollection(count);
    const visible = Math.min(10, count);
    assert.match(html, /aria-labelledby="test-results-heading"/);
    assert.match(html, /id="test-results-heading" tabindex="-1"/);
    assert.match(html, /scroll-mt-6 overflow-hidden shadow-none/);
    assert.match(html, /gap-4 px-4 pb-5 sm:px-6/);
    assert.ok(html.includes(`${count} of ${count} problems · Showing 1 to ${visible}`));
    assert.equal([...html.matchAll(/data-problem-card=/g)].length, visible);
    assert.equal([...html.matchAll(new RegExp(`Page 1 of ${Math.ceil(count / 10)}`, "g"))].length, 2);
    assert.equal([...html.matchAll(/<nav /g)].length, 2);
    assert.equal([...html.matchAll(/<button[^>]*disabled=""/g)].length, count <= 10 ? 4 : 2);
    if (count > 10) assert.doesNotMatch(html, /data-problem-card="problem-11"/);
  }
});

test("retained collection pages show the remaining problems and clamp out-of-range pages", () => {
  for (const page of [2, 5]) {
    const html = renderCollection(18, 18, page);
    assert.equal([...html.matchAll(/data-problem-card=/g)].length, 8);
    assert.match(html, /18 of 18 problems · Showing 11 to 18/);
    assert.match(html, /Page 2 of 2/);
    assert.match(html, /data-problem-card="problem-11"/);
    assert.match(html, /data-problem-card="problem-18"/);
    assert.doesNotMatch(html, /data-problem-card="problem-1"/);
  }
});

test("changing collection filters resets a retained page to the first page", () => {
  const html = renderCollection(12, 18, 2, "previous-filters");
  assert.match(html, /12 of 18 problems · Showing 1 to 10/);
  assert.match(html, /Page 1 of 2/);
  assert.match(html, /data-problem-card="problem-1"/);
});

test("the shared collection reports filtered results against the topic total", () => {
  const html = renderCollection(2, 18);
  assert.match(html, /2 of 18 problems · Showing 1 to 2/);
});

test("empty collections keep the archive shell and reset action without misleading pagination", () => {
  const html = renderCollection(0, 18);
  assert.match(html, /0 of 18 problems/);
  assert.match(html, /No matching problems/);
  assert.match(html, /Try another filter/);
  assert.match(html, /Clear filters/);
  assert.doesNotMatch(html, /<nav |Showing|Page 1 of|data-problem-card=/);
});

test("all imported archive cards display their individual estimate using the shared rating badge", () => {
  for (const problem of catalogProblems) {
    const html = renderToStaticMarkup(createElement(OlympiadProblemCard, { problem, onOpen() {} }));
    const elo = getEstimatedProblemElo(problem.id).toLocaleString("en-US");
    assert.ok(html.includes(`Estimated difficulty ${elo},`), problem.id);
    assert.ok(html.includes(`>${elo}</span>`), problem.id);
    assert.doesNotMatch(html, /Unrated/);
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

test("imported cards place the labelled host flag directly before the competition badge", () => {
  for (const problem of catalogProblems) {
    const html = renderToStaticMarkup(createElement(OlympiadProblemCard, { problem, onOpen() {} }))
    assert.match(html, /role="img" aria-label="Hosted by /, problem.id)
    assert.ok(html.indexOf('role="img"') < html.indexOf(`>${problem.competition}</div>`), problem.id)
    assert.ok(html.includes(`${problem.year} · ${problem.code}`), problem.id)
    assert.ok(html.includes(`href="/dashboard/problems/${problem.id}"`), problem.id)
    assert.equal((html.match(/<a[\s>]/g) ?? []).length, 1)
    assert.doesNotMatch(html, /<svg[^>]*role="img"/)
    assert.ok(html.includes('<img src="/flags/'), problem.id)
  }
})

test("host flags identify online and joint hosts without adding a control", () => {
  for (const [id, label, flag] of [
    ["ipho-2021-t1", "Hosted by Lithuania (online)", ["lt"]],
    ["ipho-2016-t1", "Hosted by Switzerland and Liechtenstein", ["ch", "li"]],
    ["eupho-2020-t1", "Hosted by Estonia (online)", ["ee"]],
  ]) {
    const problem = catalogProblems.find((entry) => entry.id === id)!
    const html = renderToStaticMarkup(createElement(OlympiadProblemCard, { problem, onOpen() {} }))
    assert.ok(html.includes(`aria-label="${label}"`))
    for (const code of flag) assert.ok(html.includes(`src="/flags/${code}.svg"`))
    assert.doesNotMatch(html, /[\u{1F1E6}-\u{1F1FF}]/u)
    assert.doesNotMatch(html, /tabindex=/)
  }
})

test("unknown host metadata and non-competition cards omit the flag", () => {
  const problem = { ...catalogProblems[0], year: 2027 }
  const html = renderToStaticMarkup(createElement(OlympiadProblemCard, { problem, onOpen() {} }))
  assert.doesNotMatch(html, /Hosted by|role="img"/)
  assert.match(html, /2027 · T1/)
  assert.doesNotMatch(render({ ...base, host: { country: "France", flags: ["fr"] }, onOpen() {} }), /Hosted by|flags\/fr/)
})
