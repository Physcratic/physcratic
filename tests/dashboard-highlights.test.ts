import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DashboardHighlights } from "../components/physics/dashboard-highlights";
import arena from "../lib/arena/index.json";

(globalThis as { React?: unknown }).React = React;

test("Lobby recommendation renders a real Arena title, summary and enabled reader link before effects", () => {
  const html = renderToStaticMarkup(React.createElement(DashboardHighlights));
  const first = arena.problems[0];
  assert.ok(html.includes(first.title));
  assert.ok(html.includes(first.summary));
  assert.ok(html.includes(`href="/dashboard/problems/${first.id}"`));
  assert.doesNotMatch(html, /Choosing a problem/);
  assert.doesNotMatch(html, /<button[^>]+disabled[^>]*>Solve problem/);
});
