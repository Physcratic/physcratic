import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import React, { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProblemRoom } from "../components/physics/problem-room";
import { GuestOnly } from "../components/physics/problem-nav";
import { ProblemHistory } from "../components/physics/problem-history";
import { ArenaProblemReader } from "../components/physics/arena-problem-reader";
import { ImportedProblemReader } from "../components/physics/imported-problem-reader";
import { CrumbTrail } from "../components/problems/problem-links";
import { catalogProblems } from "../lib/corpus-catalog";
import arena from "../lib/arena/index.json";
import { jsonLdScript, problemCrumbs, problemPageGraph } from "../lib/seo/json-ld";
import { allProblemPages, findProblemPage } from "../lib/seo/problem-pages";
import { archiveBackHref, guestProblemsHref, problemBackHref, showProblemCrumbs, signedInProblemsHref } from "../lib/problem-back";
import type { ArenaCatalogEntry } from "../lib/arena-schema";

// Some components use the classic JSX transform, which needs React in scope under the test runner.
Object.assign(globalThis, { React });

const room = (backHref?: string, body = "Body") => renderToStaticMarkup(createElement(ProblemRoom, { backHref } as ComponentProps<typeof ProblemRoom>, createElement("h1", null, body)));
const links = (html: string) => [...html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].map((m) => m[0]);

test("the back link target depends on the state, and an archive problem always returns to its archive list", () => {
  assert.equal(guestProblemsHref, "/problems");
  assert.equal(signedInProblemsHref, "/dashboard?view=problems");
  assert.equal(problemBackHref({ signedIn: false }), "/problems");
  assert.equal(problemBackHref({ signedIn: true }), "/dashboard?view=problems");
  const archive = archiveBackHref({ kind: "archive", competition: "IPhO", year: 2025 });
  assert.equal(archive, "/problems/archive#ipho-2025");
  assert.equal(problemBackHref({ signedIn: false, archiveHref: archive }), archive);
  assert.equal(problemBackHref({ signedIn: true, archiveHref: archive }), archive);
  assert.equal(archiveBackHref({ kind: "arena" }), undefined);
  assert.equal(archiveBackHref({ kind: "authored" }), undefined);
  for (const page of allProblemPages().filter((p) => p.kind === "archive")) {
    const href = archiveBackHref(page)!;
    assert.match(href, /^\/problems\/archive#(ipho|apho|eupho)-\d{4}$/, page.id);
  }
});

test("the breadcrumb is for guests and crawlers, not for a signed-in person", () => {
  assert.equal(showProblemCrumbs(false), true);
  assert.equal(showProblemCrumbs(true), false);
  const page = findProblemPage("arena-mind-the-gap")!;
  const crumbs = createElement(CrumbTrail, { crumbs: problemCrumbs(page) });
  // The server HTML, which is what a crawler and a guest get, has the trail.
  const html = renderToStaticMarkup(createElement(GuestOnly, null, crumbs));
  assert.match(html, /aria-label="breadcrumb"/);
  assert.match(html, /href="\/problems"/);
});

test("the structured data of every problem page is byte for byte what it was", () => {
  const pages = allProblemPages();
  const hash = createHash("sha256");
  for (const page of pages) hash.update(`${page.id}\n${jsonLdScript(problemPageGraph(page))}\n`);
  assert.equal(pages.length, 145);
  assert.equal(hash.digest("hex"), "80fdbdd99dc4c8e9bb53a66f9a25bd57ce9224aaea09eaff4a79912780c8bebf");
  const graph = problemPageGraph(findProblemPage("arena-mind-the-gap")!) as { "@type": string }[];
  assert.equal(graph[0]["@type"], "BreadcrumbList");
});

test("the header has one back link, the home wordmark and no Problem room label", () => {
  const html = room();
  assert.doesNotMatch(html, /Problem room/i);
  const all = links(html);
  const back = all.filter((a) => />\s*All problems\s*</.test(a.replace(/<svg[\s\S]*?<\/svg>/g, "")));
  assert.equal(back.length, 1, "exactly one All problems link");
  assert.match(back[0], /href="\/problems"/, "the server HTML links guests to the library");
  assert.match(back[0], /min-h-11 min-w-11/);
  assert.match(back[0], /<svg[^>]*aria-hidden="true"/);
  const wordmark = all.find((a) => a.includes('aria-label="Physcratic home"'));
  assert.ok(wordmark, "the wordmark link is named Physcratic home");
  assert.match(wordmark, /href="\/"/);
  assert.doesNotMatch(wordmark, /lucide-arrow-left|All problems|back/i, "the wordmark does not read as a back link");
  assert.match(wordmark, /min-h-11/);
  assert.match(html, /href="\/dashboard#problem-history"[^>]*>Your previous work<\/a>/);
});

test("the skip link comes first, then the back link, then the wordmark, then the main region", () => {
  const html = room();
  const skip = html.indexOf("Skip to problem content");
  const back = html.indexOf("All problems");
  const mark = html.indexOf('aria-label="Physcratic home"');
  const main = html.indexOf('<main id="solver-main"');
  assert.ok(skip >= 0 && skip < back && back < mark && mark < main, `${skip} ${back} ${mark} ${main}`);
  assert.match(html, /href="#solver-main"/);
  assert.match(html, /<main id="solver-main" tabindex="-1"/);
});

test("an archive problem passes its archive list as the back link", () => {
  const html = room("/problems/archive#ipho-2025");
  const back = links(html).filter((a) => a.includes("All problems"));
  assert.equal(back.length, 1);
  assert.match(back[0], /href="\/problems\/archive#ipho-2025"/);
});

test("an Arena problem page has one All problems link and no second back link", () => {
  const problem = arena.problems[0] as ArenaCatalogEntry;
  const html = renderToStaticMarkup(createElement(ProblemRoom, null, createElement(ArenaProblemReader, { problem })));
  assert.equal((html.match(/All problems/g) ?? []).length, 1);
  assert.doesNotMatch(html, /Back to Physcratic Arena|Back to all problems|Back to collection|Problem room/);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(html, new RegExp(`href="/dashboard/problems/${arena.problems[1].id}"[^>]*>Next in Arena`));
  assert.match(html, /Follows Arena catalogue order/);
});

test("the last Arena entry has no invented continuation or wraparound", () => {
  const problem = arena.problems.at(-1)! as ArenaCatalogEntry;
  const html = renderToStaticMarkup(createElement(ProblemRoom, null, createElement(ArenaProblemReader, { problem })));
  assert.doesNotMatch(html, /Next in Arena/);
  assert.match(html, /Your previous work/);
});

test("the previous-work destination exists while private progress is still unavailable", () => {
  const html = renderToStaticMarkup(createElement(ProblemHistory, { onOpen() {} }));
  assert.match(html, /<section id="problem-history" tabindex="-1" aria-label="Your problem history"/);
});

test("an archive problem page has one back link, and the embedded reader keeps its own", () => {
  const problem = catalogProblems[0];
  const page = renderToStaticMarkup(createElement(ProblemRoom, { backHref: archiveBackHref(findProblemPage(problem.id)!) } as ComponentProps<typeof ProblemRoom>, createElement(ImportedProblemReader, { asPage: true, problem })));
  assert.equal((page.match(/All problems/g) ?? []).length, 1);
  assert.doesNotMatch(page, /Back to all problems|Problem room/);
  const embedded = renderToStaticMarkup(createElement(ImportedProblemReader, { problem, onBack() {} }));
  assert.match(embedded, /Back to all problems/);
});

test("the problem page and the authored page use the shared room with no label option", () => {
  const page = readFileSync(new URL("../app/dashboard/problems/[id]/page.tsx", import.meta.url), "utf8");
  assert.match(page, /<GuestOnly>[\s\S]*<CrumbTrail/);
  assert.equal((page.match(/<ProblemRoom backHref=\{archiveBackHref\(page\)\}>/g) ?? []).length, 2);
  const workspace = readFileSync(new URL("../components/authored/student-workspace.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(workspace, /showLabel/);
  assert.doesNotMatch(readFileSync(new URL("../components/physics/problem-room.tsx", import.meta.url), "utf8"), /Problem room|showLabel|uppercase|tracking-/);
  const layout = readFileSync(new URL("../app/dashboard/problems/[id]/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /problemPageGraph\(page\)/, "the structured data is still emitted by the layout for everyone");
});
