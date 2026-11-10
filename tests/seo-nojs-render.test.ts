import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ArenaDocument as ArenaDocumentType } from "../components/physics/arena-document";
import type { ProblemReader as ProblemReaderType } from "../components/physics/problem-reader";
import type { ArchiveStatementText as ArchiveStatementTextType } from "../components/problems/archive-statement";
import { parseArenaDocument } from "../lib/arena-document";
import { problems } from "../lib/physics";
import { allProblemPages, archiveStatementView, arenaStatementText } from "../lib/seo/problem-pages";
import { sentences } from "../lib/seo/statement-text";

/**
 * "No JavaScript" here means the HTML the server produces, before any script runs: the components are rendered to a
 * string and nothing else. tests/seo-nojs.live.mts fetches the same pages from a running server with a plain HTTP client.
 */
const decode = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

// The components use the automatic JSX runtime under Next. tsx compiles them with the classic runtime, which needs React in scope.
let ArenaDocument: typeof ArenaDocumentType, ProblemReader: typeof ProblemReaderType, ArchiveStatementText: typeof ArchiveStatementTextType;
before(async () => {
  (globalThis as { React?: unknown }).React = React;
  ({ ArenaDocument } = await import("../components/physics/arena-document"));
  ({ ProblemReader } = await import("../components/physics/problem-reader"));
  ({ ArchiveStatementText } = await import("../components/problems/archive-statement"));
});

describe("statements are in the server HTML", () => {
  it("renders every archive problem's statement text, source line and PDF link", () => {
    for (const page of allProblemPages().filter((p) => p.kind === "archive")) {
      const view = archiveStatementView(page)!;
      const html = renderToStaticMarkup(createElement(ArchiveStatementText, { page, view }));
      const text = decode(html);
      const first = sentences(view.paragraphs[0] ?? "")[0] ?? "";
      assert.ok(text.includes(first.replace(/\s+/g, " ")) && first.length > 20 || page.thin, `${page.id}: first sentence "${first.slice(0, 60)}"`);
      assert.ok(text.includes(`${page.competition} ${page.year}, Problem ${page.number}. Official problem (PDF)`), `${page.id}: source line`);
      assert.ok(html.includes(`href="${page.source!.officialUrl}"`), `${page.id}: official link`);
      for (const image of view.pageImages) assert.ok(html.includes(`alt="${image.alt.replace(/'/g, "&#x27;")}"`), `${page.id}: figure alt`);
      assert.ok(!/<script/.test(html));
    }
  });
  it("renders Cox's Timepiece with its first sentence", () => {
    const page = allProblemPages().find((p) => p.id === "ipho-2025-t2")!;
    const html = renderToStaticMarkup(createElement(ArchiveStatementText, { page, view: archiveStatementView(page)! }));
    assert.ok(decode(html).includes("In 1765, British clockmaker James Cox invented a clock whose only source of energy is the fluctuations in atmospheric pressure."));
  });
  it("renders every Arena statement with its text, maths and figures with alt text, and no solution", () => {
    for (const page of allProblemPages().filter((p) => p.kind === "arena")) {
      const source = arenaStatementText(page.id)!;
      const html = renderToStaticMarkup(createElement(ArenaDocument, { content: source, staticFigures: true }));
      const firstParagraph = parseArenaDocument(source).flatMap((s) => s.blocks).find((b) => b.type === "paragraph" && !b.text.startsWith("$$") && !b.text.startsWith("!["));
      const lead = firstParagraph && firstParagraph.type === "paragraph" ? firstParagraph.text.split("$$")[0].trim() : "";
      assert.ok(lead.length > 15, `${page.id}: has a lead`);
      assert.ok(decode(html).includes(lead), `${page.id}: "${lead.slice(0, 50)}"`);
      if (source.includes("$$")) assert.match(html, /class="katex"/, `${page.id}: KaTeX HTML`);
      if (source.includes("$$")) assert.match(html, /<math/, `${page.id}: MathML`);
      for (const [, alt] of source.matchAll(/!\[([^\]]+)\]\(\/corpus\/arena\/figures\/[a-z-]+\.png\)/g)) {
        assert.ok(new RegExp(`<img[^>]+alt="${alt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/'/g, "&#x27;")}"`).test(html), `${page.id}: figure "${alt}"`);
      }
      assert.doesNotMatch(html, /Worked solution|Loading problem diagram/);
    }
  });
  it("renders every practice problem's prompt, and keeps the hint and solution hidden", () => {
    for (const problem of problems) {
      const html = renderToStaticMarkup(createElement(ProblemReader, { problem }));
      const text = decode(html);
      assert.ok(text.includes(problem.prompt.split(/(?<=[.!?])\s+(?=[A-Z])/u)[0]), `${problem.id}: prompt`);
      assert.ok(html.includes(`<h1`), `${problem.id}: h1`);
      assert.ok(!text.includes(problem.hint), `${problem.id}: hint hidden`);
      assert.ok(!problem.solution.some((step) => step.text.length > 30 && text.includes(step.text)), `${problem.id}: solution hidden`);
    }
  });
});

describe("public library links", () => {
  it("keeps problem and topic anchors in the server-rendered library pages", async () => {
    const { default: Library } = await import("../app/problems/page");
    const { default: Archive } = await import("../app/problems/archive/page");
    const { default: Topic } = await import("../app/problems/topics/[slug]/page");
    const { topicsWithProblems } = await import("../lib/seo/problem-pages");
    const library = renderToStaticMarkup(createElement(Library));
    const archive = renderToStaticMarkup(createElement(Archive));
    for (const page of allProblemPages()) {
      assert.ok((page.kind === "archive" ? archive : library).includes(`href="${page.path}"`), page.path);
    }
    for (const topic of topicsWithProblems()) {
      assert.ok(library.includes(`href="/problems/topics/${topic.slug}"`), topic.slug);
      const html = renderToStaticMarkup(await Topic({ params: Promise.resolve({ slug: topic.slug }) }));
      for (const page of allProblemPages().filter(p => p.topicSlug === topic.slug)) {
        assert.ok(html.includes(`href="${page.path}"`), `${topic.slug}: ${page.path}`);
      }
    }
  });
});
