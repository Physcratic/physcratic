import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ArenaProblemReader } from "../components/physics/arena-problem-reader";
import { ArenaDocument } from "../components/physics/arena-document";
import { UnifiedProblemCard } from "../components/physics/unified-arena-collection";
import { arenaProblemSchema, type ArenaCatalogEntry } from "../lib/arena-schema";
import { getEstimatedProblemElo } from "../lib/problem-archive";
import arena from "../lib/arena/index.json";

// The 15 problems of the beginner set were written for Physcratic and have no source document. Their page says
// "Original Physcratic problem" and nothing on it, or on their library card, names or links a PDF. The 18 older
// problems keep the line they had.
// The reader and its children are compiled with the classic JSX runtime under tsx, which looks for a global React.
(globalThis as { React?: typeof React }).React = React;
const entries = arena.problems as ArenaCatalogEntry[];
const originals = entries.filter((entry) => entry.original);
const older = entries.filter((entry) => !entry.original);
const full = (entry: ArenaCatalogEntry) => arenaProblemSchema.parse(JSON.parse(readFileSync(join(process.cwd(), "public", entry.path), "utf8")));
const page = (entry: ArenaCatalogEntry) =>
  renderToStaticMarkup(createElement(ArenaProblemReader, { problem: entry, statement: createElement(ArenaDocument, { content: full(entry).statement, staticFigures: true }) }));
const pdf = /\.pdf|_Problem|_Solution|application\/pdf/i;

test("there are 15 original problems and 18 older ones", () => {
  assert.equal(originals.length, 15);
  assert.equal(older.length, 18);
  assert.ok(originals.every((entry) => entry.importedOn === "2026-11-14"));
});

test("an original problem's page says so and has no PDF link or file name", () => {
  for (const entry of originals) {
    const html = page(entry);
    assert.match(html, />Original Physcratic problem</, entry.id);
    assert.doesNotMatch(html, /Transcribed/, entry.id);
    assert.doesNotMatch(html, pdf, entry.id);
    for (const [, href] of html.matchAll(/href="([^"]*)"/g)) assert.doesNotMatch(href, pdf, `${entry.id}: ${href}`);
    // Neither the catalogue entry nor the published document carries a file name that a page could link to.
    assert.doesNotMatch(JSON.stringify(entry), pdf, entry.id);
    const document = full(entry);
    assert.equal(document.statementFile, undefined, entry.id);
    assert.equal(document.solutionFile, undefined, entry.id);
    assert.doesNotMatch(JSON.stringify(document), pdf, entry.id);
  }
});

test("an original problem's library card has no PDF link", () => {
  for (const entry of originals) {
    const html = renderToStaticMarkup(createElement(UnifiedProblemCard, { problem: { key: `arena:${entry.id}`, kind: "arena", id: entry.id, title: entry.title, tags: [entry.topic, ...entry.tags], summary: entry.summary, elo: getEstimatedProblemElo(entry.id), estimatedDifficulty: null, author: null } }));
    assert.match(html, new RegExp(`href="/dashboard/problems/${entry.id}"`), entry.id);
    assert.doesNotMatch(html, pdf, entry.id);
  }
});

test("an older Arena problem keeps its line", () => {
  for (const entry of older) {
    const html = page(entry);
    assert.match(html, />Transcribed text and LaTeX, with original diagrams\.</, entry.id);
    assert.doesNotMatch(html, /Original Physcratic problem/, entry.id);
  }
});
