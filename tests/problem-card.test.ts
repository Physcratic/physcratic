import assert from "node:assert/strict";
import test from "node:test";
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ProblemCard,
  visibleCardImage,
  type ProblemCardProps,
} from "../components/physics/problem-card";
import { UnifiedProblemCard } from "../components/physics/unified-arena-collection";
import type { CollectionEntry } from "../lib/unified-arena";

import { TagFilterContext } from "../components/physics/tag-filter";
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

test("problem cards share a labelled article, rating block, details and open action", () => {
  const html = render({ ...base, onOpen() {} });
  assert.match(html, /role="article"/);
  assert.match(html, /data-problem-card="test-problem"/);
  assert.match(html, /problem-entry-details/);
  assert.match(html, /<h3[^>]*>.*A block on an incline/);
  assert.match(html, /<span>5 min<\/span><span>Hint \+ worked solution<\/span>/);
  assert.match(html, /Unrated.*English/);
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
  assert.match(html, /Rating <\/span>2,500</);
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

test("the rating block comes first, then one quiet source line above a larger title, in the new layout", () => {
  const html = render({
    ...base,
    source: "IPhO",
    competition: "IPhO",
    year: 2025,
    task: "T1",
    elo: 1850,
    headingLevel: 4,
    href: "/dashboard/problems/test-problem",
  });
  // On a narrow screen the card is one column with the rating block on top, and from sm up the block is on the left.
  assert.match(html, /class="[^"]*flex-col[^"]*sm:flex-row/);
  const rating = html.indexOf("data-rating-block");
  const source = html.indexOf(">IPhO</span>");
  const year = html.indexOf(">2025</span>");
  const task = html.indexOf(">T1</span>");
  const title = html.indexOf("<h4");
  assert.ok(rating >= 0 && rating < source && source < year && year < task && task < title, "rating, then source, year and task, then title");
  // Source, year and task are three spans on one line with an 8px gap and no glyph between them, and the title is larger than the old text-lg.
  assert.equal((html.match(/<p class="flex flex-wrap items-center[^"]*text-muted-foreground">/g) ?? []).length, 1);
  assert.match(html, /<h4[^>]*class="[^"]*text-xl font-semibold/);
  // The band name stays visible as text, in a plain block and not a second control. It is not a labelled group, which
  // made a screen reader say "Rating 1,850, Advanced" and then read the same two lines again.
  assert.match(html, /data-rating-block/);
  assert.doesNotMatch(html, /role="group"|aria-label="Rating/);
  assert.match(html, /<span class="sr-only">Rating <\/span>1,850<\/p>/);
  assert.match(html, />Advanced<\/p>/);
});

test("the rating block has a soft band tint, a 4px stripe and the band colour only on the number and label", () => {
  for (const [elo, level] of [[500, "beginner-olympiad"], [1200, "intermediate-olympiad"], [2100, "advanced"], [3000, "mastery"]] as const) {
    const html = render({ ...base, elo, onOpen() {} });
    assert.ok(html.includes(`data-level="${level}"`), level);
    const block = html.slice(html.indexOf("data-rating-block"), html.indexOf("</div>", html.indexOf("data-rating-block")));
    // Soft tint for the area, strong colour on the 4px stripe, the number and the label.
    assert.match(block, /bg-\[hsl\(var\(--band\)\/0\.1\)\]/);
    assert.match(block, /border-t-4 /);
    assert.match(block, /border-t-\[hsl\(var\(--band\)\)\]/);
    assert.match(block, /sm:border-l-4/);
    assert.match(block, /sm:border-l-\[hsl\(var\(--band\)\)\]/);
    assert.equal((block.match(/text-\[hsl\(var\(--band\)\)\]/g) ?? []).length, 2, "number and label");
  }
  // The band colour is not on the rest of the card, which has no tint, stripe or coloured text of its own.
  const html = render({ ...base, elo: 1200, onOpen() {} });
  const rest = html.slice(html.indexOf("</div>", html.indexOf("data-rating-block")));
  assert.doesNotMatch(rest, /--band|elo-|band-/);
  // Not a hex colour anywhere in the card.
  assert.doesNotMatch(html, /#[0-9a-fA-F]{3,8}\b/);
});

test("an unrated card keeps a neutral block with the same 4px edge, and shows the band name as text only when rated", () => {
  const html = render({ ...base, onOpen() {} });
  assert.match(html, /bg-muted\/50/);
  assert.match(html, /border-t-4 /);
  assert.match(html, /sm:border-l-4/);
  assert.doesNotMatch(html, /--band|data-level/);
});

test("competition names and tags are neutral, and an active tag filter uses the primary token", () => {
  const competition = render({ ...base, source: "APhO", competition: "APhO", year: 2024, task: "T1", onOpen() {} });
  assert.match(competition, /data-competition="APhO"/);
  assert.doesNotMatch(competition, /elo-|band-|ipho|apho|eupho/);
  const withFilter = (active: string) =>
    renderToStaticMarkup(createElement(TagFilterContext.Provider, { value: { active, toggle() {} } }, createElement(ProblemCard, { ...base, onOpen() {} })));
  // The tag buttons only. The filled "Open problem" button is the one other thing on the card that uses the primary token.
  const tagButtons = (html: string) => [...html.matchAll(/<button[^>]*aria-label="Filter by[^>]*>/g)].map((match) => match[0]);
  const idle = tagButtons(withFilter("all"));
  assert.equal(idle.length, 2);
  for (const button of idle) {
    assert.match(button, /aria-pressed="false"/);
    assert.doesNotMatch(button, /bg-primary|bg-foreground|text-background|border-foreground/);
  }
  // Base has the tags Mechanics and Newton’s laws, so exactly one is pressed and it takes the primary token.
  const active = tagButtons(withFilter("Mechanics"));
  assert.equal(active.filter((button) => /aria-pressed="true"/.test(button)).length, 1);
  assert.equal(active.filter((button) => /border-foreground bg-primary text-primary-foreground/.test(button)).length, 1);
  assert.equal(active.filter((button) => /bg-foreground|text-background/.test(button)).length, 0);
  assert.equal(active.filter((button) => /aria-pressed="false"/.test(button) && !/bg-primary/.test(button)).length, 1);
});

test("the whole card opens the problem through the one control, which is the filled primary button", () => {
  for (const props of [{ href: "/dashboard/problems/test-problem" }, { onOpen() {} }] as const) {
    const html = render({ ...base, ...props });
    // The control stretches over the card, so a press anywhere on it opens the problem, with no second link or button.
    assert.match(html, /relative flex min-w-0 flex-col/);
    assert.match(html, /after:absolute after:inset-0/);
    assert.equal((html.match(/after:absolute/g) ?? []).length, 1);
    assert.equal((html.match(/<(a|button)[\s>]/g) ?? []).length, 1);
    // A filled primary button, not the outline style the card used before.
    assert.match(html, /bg-primary/);
    assert.doesNotMatch(html, /outline-transparent/);
    // Tap target of at least 44 by 44.
    assert.match(html, /min-h-11 min-w-11/);
    assert.match(html, /aria-label="Open problem: Quick practice, A block on an incline"/);
  }
});

test("only the one control opens the problem, so an attribution link or button is not nested inside it", () => {
  const html = render({
    ...base,
    href: "/dashboard/problems/test-problem",
    attribution: createElement("a", { href: "/u/ada" }, "Ada"),
  });
  // Pressable things in the attribution sit above the stretched layer and take their own press.
  assert.match(html, /pointer-events-none relative z-10/);
  assert.match(html, /\[&amp;_a\]:pointer-events-auto/);
  assert.match(html, /\[&amp;_button\]:pointer-events-auto/);
  // The attribution link is inside that layer, and the open link is the only one with the stretched ::after layer.
  assert.match(html, /pointer-events-none[^>]*><a href="\/u\/ada">Ada<\/a><\/div>/);
  assert.equal((html.match(/<a[\s>]/g) ?? []).length, 2);
  assert.equal((html.match(/after:absolute/g) ?? []).length, 1);
});

test("cards without a supplied difficulty never invent an estimate", () => {
  const html = render({ ...base, source: "Physcratic Arena", href: "/dashboard/problems/test-problem" });
  assert.match(html, /Unrated/);
  assert.doesNotMatch(html, /Rating <\/span>\d|~[\d,]+ ELO/);
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
    assert.ok(html.includes(`>${formatted}</p>`));
    assert.ok(html.includes(`<span class="sr-only">Rating </span>${formatted}</p>`));
    assert.ok(html.includes(`>${band}</p>`));
    // The band name is shown under the rating, not only read out.
    assert.ok(html.includes(`<p class="text-sm font-medium text-[hsl(var(--band))]">${band}</p>`), `${band} is shown on the card`);
    assert.ok(html.includes("tabular-nums"));
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
      year: 2025,
    task: "T1",
      statementLanguage: "ru",
      description: "Source title in Russian",
      onOpen() {},
    });
    assert.ok(html.includes(`data-competition="${competition}"`));
    assert.match(html, />2025<\/span><span>T1<\/span>/);
    assert.doesNotMatch(html, /·/);
    assert.match(html, /<h4[^>]*lang="ru"/);
    assert.match(html, /Source title in Russian/);
    assert.doesNotMatch(html, /Russian statement|English statement/);
    assert.match(html, /Unrated.*русский/);
    assert.match(html, /Open problem:/);
  }
});

test("Arena cards use the archive template and retain their individual difficulty badges", () => {
  const html = renderToStaticMarkup(createElement(ArenaCollection, {
    query: "", topic: "all", difficulty: "all", onReset() {},
  }));
  assert.equal([...html.matchAll(/data-problem-card=/g)].length, 10);
  assert.equal([...html.matchAll(/data-rating-block/g)].length, 10);
  for (const problem of arena.problems.slice(0, 10)) {
    assert.ok(html.includes(`<span class="sr-only">Rating </span>${getEstimatedProblemElo(problem.id).toLocaleString("en-US")}</p>`));
    assert.ok(html.includes(`href="/dashboard/problems/${problem.id}"`));
  }
  assert.doesNotMatch(html, /Unrated|Self-review|Statement \+ worked solution/);
  assert.match(html, /id="arena-results"/);
  assert.match(html, new RegExp(`${arena.count} of ${arena.count} problems</span><span>Showing 1 to 10`));
  assert.equal([...html.matchAll(new RegExp(`Page 1 of ${Math.ceil(arena.count / 10)}`, "g"))].length, 2);
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
    emptyMessage: "No matching problems.",
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
    assert.ok(html.includes(`${count} of ${count} problems</span><span>Showing 1 to ${visible}`));
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
    assert.match(html, /18 of 18 problems<\/span><span>Showing 11 to 18/);
    assert.match(html, /Page 2 of 2/);
    assert.match(html, /data-problem-card="problem-11"/);
    assert.match(html, /data-problem-card="problem-18"/);
    assert.doesNotMatch(html, /data-problem-card="problem-1"/);
  }
});

test("changing collection filters resets a retained page to the first page", () => {
  const html = renderCollection(12, 18, 2, "previous-filters");
  assert.match(html, /12 of 18 problems<\/span><span>Showing 1 to 10/);
  assert.match(html, /Page 1 of 2/);
  assert.match(html, /data-problem-card="problem-1"/);
});

test("the shared collection reports filtered results against the topic total", () => {
  const html = renderCollection(2, 18);
  assert.match(html, /2 of 18 problems<\/span><span>Showing 1 to 2/);
});

test("empty collections keep the archive shell and reset action without misleading pagination", () => {
  const html = renderCollection(0, 18);
  assert.match(html, /0 of 18 problems/);
  // One plain line and the button. No icon, no second line of advice.
  assert.match(html, /<p>No matching problems\.<\/p>/);
  assert.match(html, /<button[^>]*>.*Clear filters<\/button>/);
  assert.doesNotMatch(html, /Try another|data-slot="empty/);
  assert.equal((html.match(/<button[\s>]/g) ?? []).length, 1, "Clear filters is the only control");
  assert.equal((html.match(/<svg/g) ?? []).length, 1, "only the button icon");
  assert.doesNotMatch(html, /<nav |Showing|Page 1 of|data-problem-card=/);
});

test("all imported archive cards display their individual estimate in the rating block", () => {
  for (const problem of catalogProblems) {
    const html = renderToStaticMarkup(createElement(OlympiadProblemCard, { problem, onOpen() {} }));
    const elo = getEstimatedProblemElo(problem.id).toLocaleString("en-US");
    assert.ok(html.includes(`<span class="sr-only">Rating </span>${elo}</p>`), problem.id);
    assert.ok(html.includes(`>${elo}</p>`), problem.id);
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

test("imported cards place the labelled host flag directly before the competition name", () => {
  for (const problem of catalogProblems) {
    const html = renderToStaticMarkup(createElement(OlympiadProblemCard, { problem, onOpen() {} }))
    assert.match(html, /role="img" aria-label="Hosted by /, problem.id)
    assert.ok(html.indexOf('role="img"') < html.indexOf(`>${problem.competition}</span>`), problem.id)
    assert.ok(html.includes(`<span>${problem.year}</span><span>${problem.code}</span>`), problem.id)
    assert.ok(!html.includes("·"), problem.id)
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
  assert.match(html, />2027<\/span><span>T1</)
  assert.doesNotMatch(render({ ...base, host: { country: "France", flags: ["fr"] }, onOpen() {} }), /Hosted by|flags\/fr/)
})

// Phase 3: the favourite control. Arena cards pass these props only when problem statistics are enabled.
const footerOf = (html: string) => html.slice(html.indexOf("problem-entry-details"));
const likeButton = (html: string) => html.match(/<button[^>]*aria-pressed="(?:true|false)"[^>]*>.*?<\/button>/)?.[0] ?? "";

test("with no like props the card renders exactly as before, with no control and no extra footer item", () => {
  for (const props of [{ href: "/dashboard/problems/test-problem" }, { onOpen() {} }] as const) {
    const plain = render({ ...base, ...props });
    const explicit = render({ ...base, ...props, likeCount: undefined, liked: undefined, onToggleLike: undefined, likeAccess: undefined });
    assert.equal(explicit, plain);
    assert.doesNotMatch(plain, /data-like-control|Favourite|aria-pressed|lucide-heart/);
    // The footer holds the open action, then the tags, and nothing in between.
    assert.match(footerOf(plain), /^problem-entry-details[^>]*>(?:<a|<button)[^]*?<\/(?:a|button)><div class="flex min-w-0 flex-wrap gap-2 sm:flex-1">/);
  }
});

test("with a count but no handler the toggle is shown disabled", () => {
  const html = render({ ...base, onOpen() {}, likeCount: 2, liked: false });
  assert.match(likeButton(html), /\sdisabled=""/);
  assert.match(html, /<span class="tabular-nums">2<\/span> favourites/);
});

test("a card that is not favourited has a neutral outline toggle with the count in tabular numerals", () => {
  const html = render({ ...base, href: "/dashboard/problems/test-problem", likeCount: 1234, liked: false, onToggleLike() {} });
  const button = likeButton(html);
  assert.match(button, /aria-pressed="false"/);
  assert.match(button, />Favourite<\/button>$/);
  assert.match(button, /border border-input bg-background/);
  assert.doesNotMatch(button, /bg-primary|destructive|\b(?:fill|text|bg)-red/);
  assert.match(button, /fill-transparent/);
  assert.match(button, /stroke-foreground/);
  // 44 by 44 at least, above the stretched open layer, with the shared focus ring.
  assert.match(button, /h-11/);
  assert.match(button, /min-w-11/);
  assert.match(button, /relative z-10/);
  assert.match(button, /focus-visible:ring-2/);
  assert.doesNotMatch(button, /\sdisabled=""|\saria-disabled="/);
  assert.match(html, /<span class="tabular-nums">1,234<\/span> favourites/);
  // The name keeps the existing word, and the problem title describes which problem it is.
  const titleId = html.match(/aria-labelledby="([^"]+)"/)![1];
  assert.ok(button.includes(`aria-describedby="${titleId}"`));
});

test("a favourited card fills the heart with the primary token, never red, and keeps the strong outline", () => {
  const html = render({ ...base, onOpen() {}, likeCount: 1, liked: true, onToggleLike() {} });
  const button = likeButton(html);
  assert.match(button, /aria-pressed="true"/);
  assert.match(button, />Favourited<\/button>$/);
  assert.match(button, /fill-primary/);
  assert.match(button, /stroke-foreground/);
  assert.doesNotMatch(button, /\b(?:fill|text|stroke|bg)-red|destructive|fill-current/);
  // The short fill animation is off under reduced motion.
  assert.match(button, /transition-\[fill\] duration-200/);
  assert.match(button, /motion-reduce:transition-none/);
  assert.match(html, /<span class="tabular-nums">1<\/span> favourite</);
  assert.doesNotMatch(html, /#[0-9a-fA-F]{3,8}\b/);
});

test("the footer order is open problem, then the like control, then the tags", () => {
  const html = footerOf(render({ ...base, href: "/dashboard/problems/test-problem", likeCount: 2, liked: false, onToggleLike() {} }));
  const open = html.indexOf("Open problem");
  const like = html.indexOf("data-like-control");
  const tags = html.indexOf("Mechanics");
  assert.ok(open >= 0 && open < like && like < tags, "open, like, tags");
  // The open action still stretches over the card and is still the only stretched layer.
  assert.equal((html.match(/after:absolute/g) ?? []).length, 1);
});

test("a signed-out visitor keeps the sign-in link and the count, with no toggle", () => {
  const html = render({ ...base, onOpen() {}, likeCount: 3, liked: false, likeAccess: "signed-out" });
  assert.match(html, /<a[^>]*class="relative z-10 inline-flex min-h-11[^"]*focus-visible:ring-2[^"]*" href="\/sign-in">Sign in to favourite<\/a>/);
  assert.equal(likeButton(html), "");
  assert.match(html, /<span class="tabular-nums">3<\/span> favourites/);
});

test("an unverified account sees a disabled toggle and the verify-your-email note", () => {
  const html = render({ ...base, onOpen() {}, likeCount: 0, liked: false, likeAccess: "unverified", onToggleLike() {} });
  assert.match(likeButton(html), /\sdisabled=""/);
  assert.match(html, /<p>Verify your email to save favourites\.<\/p>/);
  assert.doesNotMatch(html, /Sign in to favourite/);
});

test("while statistics load there is no toggle yet and the status is in words", () => {
  const html = render({ ...base, onOpen() {}, likeAccess: "ready", likeBusy: true, likeStatus: "Loading statistics…" });
  assert.equal(likeButton(html), "");
  assert.doesNotMatch(html, /Sign in to favourite/);
  assert.match(html, /<p role="status">Loading statistics…<\/p>/);
  assert.match(html, /data-like-control[^>]*aria-busy="true"/);
});

test("while a change is in flight the toggle stays focusable but marked busy", () => {
  const html = render({ ...base, onOpen() {}, likeCount: 5, liked: true, onToggleLike() {}, likeBusy: true });
  const button = likeButton(html);
  // aria-disabled rather than disabled, so focus is not lost after Enter or Space.
  assert.match(button, /\saria-disabled="true"/);
  assert.doesNotMatch(button, /\sdisabled=""/);
  assert.match(html, /aria-busy="true"/);
});

test("a rate-limited change shows the error in words, as an alert", () => {
  const html = render({ ...base, onOpen() {}, likeCount: 4, liked: false, onToggleLike() {}, likeError: "Too many requests. Try again in a minute." });
  assert.match(html, /<p role="alert" class="font-medium text-foreground">Too many requests\. Try again in a minute\.<\/p>/);
  // The toggle shows the rolled-back state and can be pressed again.
  assert.match(likeButton(html), /aria-pressed="false"/);
  assert.doesNotMatch(likeButton(html), /\sdisabled=""|\saria-disabled="/);
  assert.doesNotMatch(html, /text-destructive|\b(?:text|fill|bg)-red/);
});

// Phase 4: polish. The hover and motion rules are in app/globals.css, so the tests that cover them read it.
import { readFileSync } from "node:fs";
import { ProblemCardSkeleton, ProblemCardSkeletonList } from "../components/physics/problem-card";

test("the card sits in a wrapper that takes the hover, and its text wraps instead of running out of the card", () => {
  const html = render({ ...base, href: "/dashboard/problems/test-problem" });
  // The wrapper is outermost and holds the card, so the lift moves the card and never the thing under the pointer.
  assert.match(html, /^<div class="problem-entry-lift min-w-0"><div[^>]*data-problem-card="test-problem"/);
  // Long words and addresses break, so nothing sideways-scrolls at 375px.
  assert.match(html, /\[overflow-wrap:anywhere\]/);
  // The hover is not in the card's own classes. It is one rule in the stylesheet, so it cannot drift between callers.
  const root = html.match(/<div [^>]*data-problem-card="test-problem"[^>]*>/)![0];
  assert.doesNotMatch(root, /hover:|transition|translate/);
});

test("edge cases keep the same structure: a long title, a Russian title, many tags, no description and no rating", () => {
  const long = render({ ...base, title: `Equilibrium ${"Thermoelectromagnetohydrodynamic".repeat(3)}`, source: "IPhO", year: 2016, task: "T1", elo: 2650, href: "/dashboard/problems/x" });
  assert.match(long, /<h3[^>]*>Equilibrium Thermoelectromagnetohydrodynamic/);
  assert.match(long, /\[overflow-wrap:anywhere\]/);
  const russian = render({ ...base, title: "Движение заряженной частицы", titleLanguage: "ru", statementLanguage: "ru", onOpen() {} });
  assert.match(russian, /<h3[^>]*lang="ru"[^>]*>Движение заряженной частицы/);
  assert.match(russian, /<p lang="ru"[^>]*>русский<\/p>/);
  const tags = Array.from({ length: 11 }, (_, index) => `Tag ${index + 1}`);
  const many = render({ ...base, tags, onOpen() {} });
  assert.equal((many.match(/>Tag \d+</g) ?? []).length, 11);
  assert.match(many, /flex min-w-0 flex-wrap gap-2/);
  const bare = render({ ...base, description: undefined, details: undefined, onOpen() {} });
  assert.doesNotMatch(bare, /line-clamp-2/);
  assert.match(bare, /Unrated/);
  // With and without the like control, the footer holds the open action and the tags in the same order.
  const withLike = render({ ...base, likeCount: 3, liked: false, onToggleLike() {}, href: "/dashboard/problems/x" });
  const without = render({ ...base, href: "/dashboard/problems/x" });
  assert.ok(withLike.indexOf("Open problem") < withLike.indexOf("data-like-control") && withLike.indexOf("data-like-control") < withLike.indexOf("Mechanics"));
  assert.ok(without.indexOf("Open problem") < without.indexOf("Mechanics"));
});

test("the like slot keeps the height of the toggle while statistics load, and a refresh takes no room", () => {
  const loading = render({ ...base, onOpen() {}, likeAccess: "ready", likeBusy: true, likeStatus: "Loading statistics…" });
  assert.match(loading, /<div class="flex min-h-11 items-center"><p role="status">Loading statistics…<\/p><\/div>/);
  const loaded = render({ ...base, onOpen() {}, likeCount: 4, liked: true, onToggleLike() {} });
  assert.match(loaded, /data-like-control[^>]*><div class="flex min-h-11 flex-wrap items-center gap-2">/);
  // After a change the new statistics are fetched. That is announced, but it is not drawn, so the footer does not move.
  const refreshing = render({ ...base, onOpen() {}, likeCount: 4, liked: true, onToggleLike() {}, likeBusy: true, likeStatus: "Refreshing statistics…" });
  assert.match(refreshing, /<p role="status" class="sr-only">Refreshing statistics…<\/p>/);
});

test("the desktop footer is not reversed, so Tab runs left to right in the order Open, favourite, tags", () => {
  const source = readFileSync("components/physics/problem-card.tsx", "utf8");
  assert.doesNotMatch(source, /flex-row-reverse|justify-between/);
  const html = render({ ...base, onOpen() {}, likeCount: 2, liked: false, onToggleLike() {}, likeAccess: "ready" });
  const footer = footerOf(html);
  assert.ok(footer.indexOf("Open problem") < footer.indexOf("data-like-control"));
  assert.ok(footer.indexOf("data-like-control") < footer.indexOf("sm:flex-1"));
});

test("the skeleton has the same box as a card, is hidden from assistive technology and has nothing to press", () => {
  const html = renderToStaticMarkup(createElement(ProblemCardSkeleton));
  const card = render({ ...base, onOpen() {} });
  for (const shared of [/problem-entry relative flex min-w-0 flex-col gap-0 overflow-hidden py-0 sm:flex-row \[overflow-wrap:anywhere\]/, /problem-entry-details flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-end sm:px-6/, /flex min-w-0 flex-1 flex-col/, /flex flex-1 flex-col gap-4 p-4 sm:p-6/, /sm:w-40 sm:border-b-0 sm:border-l-4/]) {
    assert.match(html, shared);
    assert.match(card, shared);
  }
  assert.match(html, /^<div class="problem-entry-lift min-w-0" aria-hidden="true" data-problem-card-skeleton/);
  assert.doesNotMatch(html, /<a[\s>]|<button[\s>]|role="article"|tabindex/);
  // The pulse is only for people who have not asked for less motion.
  assert.match(html, /motion-safe:animate-pulse/);
  assert.doesNotMatch(html.replaceAll("motion-safe:animate-pulse", ""), /animate-/);
  // One announcement for the list, and the placeholders are the only other thing in it.
  const list = renderToStaticMarkup(createElement(ProblemCardSkeletonList, { label: "Loading collection…", count: 3 }));
  assert.match(list, /^<div role="status"[^>]*><span class="sr-only">Loading collection…<\/span>/);
  // aria-busy can hold back the announcement of a live region, so the list carries only the status role.
  assert.doesNotMatch(list, /aria-busy/);
  assert.equal((list.match(/data-problem-card-skeleton/g) ?? []).length, 3);
});

test("the stylesheet lifts the card 2px and darkens its border on hover, and only where hover and motion are allowed", () => {
  const css = readFileSync("app/globals.css", "utf8");
  const lift = css.match(/@media \(hover: hover\) and \(prefers-reduced-motion: no-preference\) \{\s*\.problem-entry-lift:hover > \.problem-entry \{\s*transform: translateY\(-2px\);/);
  assert.ok(lift, "the 2px lift is inside hover and no-preference");
  assert.equal((css.match(/translateY\(-2px\)/g) ?? []).length, 1);
  // The transition is inside no-preference too, so a person who asked for less motion sees no animation at all.
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\) \{\s*\.problem-entry \{\s*transition:/);
  const outside = css.replace(/@media \(prefers-reduced-motion: no-preference\) \{[\s\S]*?\n\}\n/, "");
  assert.doesNotMatch(outside.slice(outside.indexOf(".problem-entry["), outside.indexOf(".featured-contest-card")), /transition:/);
  // A stronger border for hover and keyboard focus. The old 40% was lighter than the resting border on a light card.
  assert.match(css, /\.problem-entry:has\(:focus-visible\) \{\s*border-color: hsl\(var\(--foreground\) \/ 0\.7\);/);
  // Keyboard focus also outlines the whole card in the foreground colour. It does not depend on hover or on the button ring token.
  assert.match(css, /\.problem-entry:has\(:focus-visible\) \{[^}]*outline: 2px solid hsl\(var\(--foreground\)\);\s*outline-offset: 2px;/);
  assert.match(css, /@media \(hover: hover\) \{\s*\.problem-entry-lift:hover > \.problem-entry \{\s*border-color: hsl\(var\(--foreground\) \/ 0\.7\);/);
  assert.doesNotMatch(css, /foreground \/ 0\.4\);/);
});

// Card image (C2). Only Arena cards pass one. Corpus, olympiad and archive cards pass nothing and must not change.
const figure = { src: "/corpus/arena/figures/mind-the-gap-statement.png", alt: "Lens resting on a reference surface, with ring radius and air gap labelled", width: 720, height: 350 };

test("a card with no image renders exactly as before and has no picture", () => {
  const without = render({ ...base, href: "/dashboard/problems/test-problem", elo: 1200 });
  assert.equal(render({ ...base, href: "/dashboard/problems/test-problem", elo: 1200, image: undefined }), without);
  assert.doesNotMatch(without, /data-card-image|<img|sm:flex-row sm:items-start/);
});

test("a card with an image shows it in a fixed frame with alt text, lazy loading and its own size", () => {
  const html = render({ ...base, href: "/dashboard/problems/test-problem", elo: 1200, image: figure });
  const frame = html.match(/<div data-card-image="true" class="([^"]*)">/);
  assert.ok(frame, "the frame is there");
  assert.match(frame[1], /\bh-\[120px\]/);
  assert.match(frame[1], /\bsm:h-40\b/);
  assert.match(frame[1], /\bbg-white\b/);
  assert.match(frame[1], /\brounded-lg\b/);
  const img = html.match(/<img src="\/corpus\/arena\/figures\/mind-the-gap-statement\.png"[^>]*>/);
  assert.ok(img, "the picture is there");
  assert.match(img[0], /alt="Lens resting on a reference surface, with ring radius and air gap labelled"/);
  assert.match(img[0], /width="720"/);
  assert.match(img[0], /height="350"/);
  assert.match(img[0], /loading="lazy"/);
  assert.match(img[0], /decoding="async"/);
  assert.match(img[0], /object-contain/);
  assert.match(img[0], /rounded-\[calc\(var\(--radius\)-0\.5rem\)\]/);
});

test("the image sits after the title and before the footer, and the card keeps one control", () => {
  const html = render({ ...base, href: "/dashboard/problems/test-problem", elo: 1200, image: figure, headingLevel: 4 });
  const title = html.indexOf("<h4");
  const picture = html.indexOf("data-card-image");
  const footer = html.indexOf("problem-entry-details");
  assert.ok(title > 0 && title < picture && picture < footer, "title, then picture, then footer (the order on a phone)");
  assert.match(html, /flex flex-1 flex-col gap-4 p-4 sm:p-6 sm:flex-row sm:items-start sm:gap-6/, "from 640px the picture sits to the right of the text");
  assert.equal((html.match(/<a[\s>]/g) ?? []).length, 1, "the stretched link is still the only link");
  assert.equal((html.match(/<button[\s>]/g) ?? []).length, 0);
  assert.match(html, /aria-label="Open problem: Quick practice, A block on an incline"/);
  assert.doesNotMatch(html.slice(picture, html.indexOf("</div>", picture)), /tabindex|<a |<button/, "the picture is not a control");
});

test("the Arena collection shows a picture only for problems that have a statement figure", () => {
  const html = renderToStaticMarkup(createElement(ArenaCollection, { query: "", topic: "all", difficulty: "all", onReset() {} }));
  const firstPage = arena.problems.slice(0, 10);
  assert.equal((html.match(/data-card-image/g) ?? []).length, firstPage.filter((problem) => "image" in problem).length);
  for (const problem of firstPage) {
    const start = html.indexOf(`data-problem-card="${problem.id}"`);
    const next = html.indexOf("data-problem-card=", start + 1);
    const card = html.slice(start, next < 0 ? undefined : next);
    assert.equal(card.includes("data-card-image"), "image" in problem, problem.id);
  }
});

test("corpus, olympiad and archive cards pass no image and look unchanged", () => {
  for (const problem of catalogProblems) {
    const html = renderToStaticMarkup(createElement(OlympiadProblemCard, { problem, onOpen() {} }));
    assert.doesNotMatch(html, /data-card-image/, problem.id);
  }
  const root = new URL("../components/physics/", import.meta.url);
  for (const file of ["corpus-collection.tsx", "olympiad-problem-card.tsx", "olympiad-catalog.tsx"]) {
    assert.doesNotMatch(readFileSync(new URL(file, root), "utf8"), /\bimage=/, file);
  }
  assert.doesNotMatch(readFileSync(new URL("../../components/problems/topic-directory.tsx", root), "utf8"), /\bimage=/);
});

// Community cards (C3c). The collection gives a community entry an optional image, and the card shows it in the C2 frame.
const communityId = "11111111-1111-4111-8111-111111111111", communityRevision = "22222222-2222-4222-8222-222222222222";
const communityImage = { src: `/card-images/${communityId}/${communityRevision}`, alt: "A beam on two supports", width: 640, height: 480 };
const community = (image?: typeof communityImage): CollectionEntry => ({ key: `authored:${communityId}`, kind: "authored", id: communityId, title: "A community problem", tags: ["Mechanics"], summary: "Published community problem", estimatedDifficulty: null, author: null, ...(image ? { image } : {}) });
const unified = (entry: CollectionEntry) => renderToStaticMarkup(createElement(UnifiedProblemCard, { problem: entry }));

test("a community entry with an image shows it with the given address, alt text and size", () => {
  const html = unified(community(communityImage));
  assert.match(html, /<div data-card-image="true" class="[^"]*\bh-\[120px\][^"]*\bsm:h-40\b/);
  const img = html.match(/<img src="\/card-images\/[^"]*"[^>]*>/)?.[0] ?? "";
  assert.ok(img.includes(`src="${communityImage.src}"`));
  assert.ok(img.includes('alt="A beam on two supports"'));
  assert.ok(img.includes('width="640"') && img.includes('height="480"'));
  assert.ok(img.includes('loading="lazy"') && img.includes('decoding="async"') && img.includes("object-contain"));
  assert.equal((html.match(/<a[\s>]/g) ?? []).length, 1, "the stretched link is still the only link");
});

test("a community entry without an image renders exactly as before", () => {
  const html = unified(community());
  assert.doesNotMatch(html, /data-card-image|<img|sm:flex-row sm:items-start/);
  assert.equal(unified(community()), unified({ ...community(), image: undefined }));
});

test("no alt text or an address that failed to load means no frame, and a different address is kept", () => {
  assert.equal(visibleCardImage(undefined, null), undefined);
  for (const alt of ["", "   "]) assert.equal(visibleCardImage({ ...communityImage, alt }, null), undefined, JSON.stringify(alt));
  assert.equal(visibleCardImage(communityImage, communityImage.src), undefined);
  assert.deepEqual(visibleCardImage(communityImage, "/card-images/other/other"), communityImage);
  assert.doesNotMatch(unified(community({ ...communityImage, alt: " " })), /data-card-image|<img/);
  // The load error handler is on the picture and records its own address.
  const card = readFileSync(new URL("../components/physics/problem-card.tsx", import.meta.url), "utf8");
  assert.match(card, /<img src=\{shown\.src\}[^>]*onError=\{\(\) => setFailedSrc\(shown\.src\)\}/);
});

test("Arena entries still take their picture from the Arena index, whatever an entry carries", () => {
  const arenaEntry = (id: string, extra: object = {}): CollectionEntry => ({ key: `arena:${id}`, kind: "arena", id, title: "T", tags: [], summary: "S", estimatedDifficulty: null, author: null, ...extra });
  const withFigure = arena.problems.find((problem) => "image" in problem)!;
  const without = arena.problems.find((problem) => !("image" in problem))!;
  assert.ok(unified(arenaEntry(withFigure.id)).includes(`src="${(withFigure as { image: { src: string } }).image.src}"`));
  assert.doesNotMatch(unified(arenaEntry(without.id)), /data-card-image/);
  assert.doesNotMatch(unified(arenaEntry(without.id, { image: communityImage })), /card-images/, "an Arena entry never shows a community address");
});

test("the loading card has the picture slot in the same place and size", () => {
  const html = renderToStaticMarkup(createElement(ProblemCardSkeleton));
  assert.match(html, /data-card-image-slot="true" class="[^"]*\bh-\[120px\][^"]*\bsm:h-40\b[^"]*\blg:w-60\b/);
  assert.match(html, /sm:flex-row sm:items-start sm:gap-6/);
});
