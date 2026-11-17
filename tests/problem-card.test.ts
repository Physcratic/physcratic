import assert from "node:assert/strict";
import test from "node:test";
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ProblemCard,
  type ProblemCardProps,
} from "../components/physics/problem-card";

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
  assert.match(html, /5 min · Hint \+ worked solution/);
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
  assert.match(html, /Rating 2,500/);
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
    reference: "2025 · T1",
    elo: 1850,
    headingLevel: 4,
    href: "/dashboard/problems/test-problem",
  });
  // On a narrow screen the card is one column with the rating block on top, and from sm up the block is on the left.
  assert.match(html, /class="[^"]*flex-col[^"]*sm:flex-row/);
  const rating = html.indexOf("Rating 1,850, Advanced");
  const source = html.indexOf(">IPhO</span>");
  const reference = html.indexOf(">2025 · T1</span>");
  const title = html.indexOf("<h4");
  assert.ok(rating >= 0 && rating < source && source < reference && reference < title, "rating, then source and reference, then title");
  // Source and reference share one line, and the title is larger than the old text-lg.
  assert.equal((html.match(/<p class="flex flex-wrap items-center[^"]*text-muted-foreground">/g) ?? []).length, 1);
  assert.match(html, /<h4[^>]*class="[^"]*text-xl font-semibold/);
  // The band name stays visible as text, in a block that is a labelled group and not a second control.
  assert.match(html, /role="group" aria-label="Rating 1,850, Advanced"/);
  assert.match(html, />Advanced<\/p>/);
});

test("the rating block has a soft band tint, a 4px stripe and the band colour only on the number and label", () => {
  for (const [elo, level] of [[500, "beginner-olympiad"], [1200, "intermediate-olympiad"], [2100, "advanced"], [3000, "mastery"]] as const) {
    const html = render({ ...base, elo, onOpen() {} });
    assert.ok(html.includes(`data-level="${level}"`), level);
    const block = html.slice(html.indexOf('role="group"'), html.indexOf("</div>", html.indexOf('role="group"')));
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
  const rest = html.slice(html.indexOf("</div>", html.indexOf('role="group"')));
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
  const competition = render({ ...base, source: "APhO", competition: "APhO", reference: "2024 · T1", onOpen() {} });
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
  assert.doesNotMatch(html, /Rating \d|~[\d,]+ ELO/);
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
    assert.ok(html.includes(`Rating ${formatted}, ${band}`));
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
    assert.match(html, /Unrated.*русский/);
    assert.match(html, /Open problem:/);
  }
});

test("Arena cards use the archive template and retain their individual difficulty badges", () => {
  const html = renderToStaticMarkup(createElement(ArenaCollection, {
    query: "", topic: "all", difficulty: "all", onReset() {},
  }));
  assert.equal([...html.matchAll(/data-problem-card=/g)].length, 10);
  assert.equal([...html.matchAll(/aria-label="Rating /g)].length, 10);
  for (const problem of arena.problems.slice(0, 10)) {
    assert.ok(html.includes(`Rating ${getEstimatedProblemElo(problem.id).toLocaleString("en-US")},`));
    assert.ok(html.includes(`href="/dashboard/problems/${problem.id}"`));
  }
  assert.doesNotMatch(html, /Unrated|Self-review|Statement \+ worked solution/);
  assert.match(html, /id="arena-results"/);
  assert.match(html, new RegExp(`${arena.count} of ${arena.count} problems · Showing 1 to 10`));
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

test("all imported archive cards display their individual estimate in the rating block", () => {
  for (const problem of catalogProblems) {
    const html = renderToStaticMarkup(createElement(OlympiadProblemCard, { problem, onOpen() {} }));
    const elo = getEstimatedProblemElo(problem.id).toLocaleString("en-US");
    assert.ok(html.includes(`Rating ${elo},`), problem.id);
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
