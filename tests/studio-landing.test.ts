import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthoringWorkspace } from "../components/authoring/workspace";

// Components are compiled with the classic JSX runtime under tsx, which looks for a global React.
(globalThis as { React?: typeof React }).React = React;
const first = () => renderToStaticMarkup(createElement(AuthoringWorkspace, { userId: "author" }));

test("Problem Studio opens on My drafts: the first paint is the list, not an editor", () => {
  const html = first();
  assert.match(html, /<h1[^>]*>\s*Problem Studio\s*<\/h1>/);
  assert.match(html, /New problem/);
  assert.match(html, /Loading your drafts/);
  // None of the editor is on the page before a draft is opened or New problem is pressed.
  for (const editorOnly of ["Classic editor", "What&#x27;s the question?", "Back to drafts", "Student preview", "id=\"simple-title\""]) assert.equal(html.includes(editorOnly), false, editorOnly);
});

test("New problem is a button of the shared 44px size, and the list is the page's one main area", () => {
  const html = first();
  const button = /<button[^>]*class="([^"]*)"[^>]*>(?:<svg[\s\S]*?<\/svg>)?\s*New problem\s*<\/button>/.exec(html);
  assert.ok(button, "a New problem button");
  assert.match(button![1], /\bh-11\b/);
  assert.equal((html.match(/id="author-main"/g) ?? []).length, 1);
});

test("the page gates are unchanged: signed out goes to sign in, unverified sees the verify message, only then the workspace", () => {
  const page = readFileSync(join(process.cwd(), "app/dashboard/author/page.tsx"), "utf8");
  const signedOut = page.indexOf('redirect("/sign-in?returnTo=%2Fdashboard%2Fauthor")');
  const unverified = page.indexOf("session.user.emailVerified !== true");
  const message = page.indexOf("Verify your email to start authoring");
  const workspace = page.indexOf("<AuthoringWorkspace");
  assert.ok(signedOut > 0 && unverified > signedOut && message > unverified && workspace > message, "sign in, then verify, then the workspace");
  assert.equal(page.includes("Problem Studio is available to verified authors."), true);
});
