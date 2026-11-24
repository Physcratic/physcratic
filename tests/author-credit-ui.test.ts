import assert from "node:assert/strict";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthoringWorkspace } from "../components/authoring/workspace";

(globalThis as { React?: typeof React }).React = React;

test("Studio presents the independent credit disclosure only when enabled", () => {
  const render = (authorCreditEnabled?: boolean) => renderToStaticMarkup(
    createElement(AuthoringWorkspace, { userId: "synthetic", authorCreditEnabled }),
  );
  assert.doesNotMatch(render(), /Author credit/);
  const html = render(true);
  assert.match(html, /Author credit/);
  assert.match(html, /all your published community problems, including older\s+publications/);
  assert.match(html, /private profile and stays on after profile deactivation/);
  assert.match(html, /Your published problems stay online/);
});
