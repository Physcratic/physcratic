import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProblemRoom } from "../components/physics/problem-room";

Object.assign(globalThis, { React });

test("the problem room label is sentence case with normal tracking and no mono or uppercase styling", () => {
  const html = renderToStaticMarkup(React.createElement(ProblemRoom, null, React.createElement("h1", null, "Title")));
  const label = html.match(/<span class="([^"]*)">Problem room<\/span>/);
  assert.ok(label, "the label is shown by default");
  assert.doesNotMatch(label[1], /uppercase|tracking-|font-mono/);
  assert.doesNotMatch(html, /PROBLEM ROOM/);
  assert.ok(!renderToStaticMarkup(React.createElement(ProblemRoom, { showLabel: false } as React.ComponentProps<typeof ProblemRoom>, "Body")).includes("Problem room"));
});
