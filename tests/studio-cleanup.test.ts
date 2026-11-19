import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RecoverySection, nextRecoveryState } from "../components/authoring/studio-ui";

Object.assign(globalThis, { React });
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const editor = read("components/authoring/problem-editor.tsx");
const workspace = read("components/authoring/workspace.tsx");
const permissions = read("components/authoring/solution-permissions.tsx");
const count = (text: string, pattern: RegExp) => (text.match(pattern) ?? []).length;
const section = (active: boolean) => renderToStaticMarkup(React.createElement(RecoverySection, { active } as React.ComponentProps<typeof RecoverySection>, React.createElement("p", null, "Inside")));

test("the second student preview link is gone and the preview tab stays", () => {
  assert.doesNotMatch(editor, /Open student problem room/);
  assert.match(editor, /Student preview/);
  assert.equal(count(editor, /aria-label="Editor view"/g), 1);
});

test("there is one Download private copy action, and the conflict panel no longer has its own", () => {
  assert.equal(count(editor, /Download private copy\s*</g), 1);
  assert.doesNotMatch(editor, /Download private local copy/);
  // The two other downloads save different files (a saved tab copy and an unreadable one), so they stay.
  assert.equal(count(editor, /Download private recovery copy/g), 1);
  assert.equal(count(editor, /Download unrecognized private copy/g), 1);
  assert.equal(count(editor, /onClick=\{\(\) => download\(draft\)\}/g), 1);
});

test("there is one way out of the editor, Back to drafts", () => {
  assert.equal(count(editor, /aria-label="Back to drafts"/g), 1);
});

test("the Recovery section is closed with nothing needing attention and is a 44px button with a name", () => {
  const html = section(false);
  assert.match(html, /<button[^>]*aria-expanded="false"[^>]*>/);
  assert.match(html, /min-h-11/);
  assert.match(html, /<span>Recovery<\/span>/);
  assert.doesNotMatch(html, /Inside/);
});

test("the Recovery section opens by itself when something needs attention and says so", () => {
  const html = section(true);
  assert.match(html, /aria-expanded="true"/);
  assert.match(html, /Recovery, needs attention/);
  assert.match(html, /Inside/);
});

test("Recovery opens the moment a conflict or corrupt copy appears, and a person can still close it", () => {
  let state = { open: false, seen: false };
  assert.deepEqual(nextRecoveryState(state, false), state);
  const opened = nextRecoveryState(state, true);
  assert.deepEqual(opened, { open: true, seen: true });
  state = { ...opened, open: false };
  assert.deepEqual(nextRecoveryState(state, true), state, "closed by the person, stays closed while active");
  const resolved = nextRecoveryState(state, false);
  assert.deepEqual(resolved, { open: false, seen: false });
  assert.equal(nextRecoveryState({ open: true, seen: true }, false).open, true, "clearing a problem does not close it under the person");
  assert.equal(nextRecoveryState(resolved, true).open, true, "a new problem opens it again");
});

test("the editor wraps the saved copy, corrupt copy and conflict tools in Recovery, active for each of them", () => {
  const start = editor.indexOf("<RecoverySection");
  const end = editor.indexOf("</RecoverySection>");
  assert.ok(start > 0 && end > start);
  assert.match(editor.slice(start, start + 240), /snapshot\.recoveryRaw \|\| recovery \|\| phase === "conflict" \|\| phase === "error"/);
  const inside = editor.slice(start, end).replace(/\s+/g, " ");
  for (const text of [
    "Download unrecognized private copy", "Discard unrecognized copy",
    "Restore local work", "Download private recovery copy", "Discard local recovery copy",
    "Resolve a version conflict", "Compare with latest server copy", "Retry saving",
    "Inspect latest server document and private answer configuration", "Use server copy", "Keep local work over this version",
  ]) assert.ok(inside.includes(text), text);
});

test("the upload cleanup is inside a Recovery section on the drafts list", () => {
  const start = workspace.indexOf("<RecoverySection");
  const end = workspace.indexOf("</RecoverySection>");
  assert.ok(start > 0 && end > start);
  assert.ok(workspace.slice(start, end).includes("Clean old unused uploads"));
  assert.match(workspace.slice(start, start + 60), /active=\{false\}/);
});

test("the expiry is a date input with a plain label, a visible message and 16px text", () => {
  assert.match(permissions, /type="date"/);
  assert.match(permissions, /Student access ends on \(optional\)/);
  assert.doesNotMatch(permissions, /ISO 8601/);
  assert.match(permissions, /aria-invalid/);
  assert.match(permissions, /\$\{id\}-error/);
  assert.match(permissions, /disabled=\{busy \|\| Boolean\(expiryProblem\)\}/);
  // The stored value is still sent exactly as before.
  assert.match(permissions, /expiresAt: enabled \? expiry \|\| null : null/);
  const fields = read("components/authoring/editor-fields.tsx");
  assert.match(fields.slice(fields.indexOf("export const inputClass")), /min-h-11[^"]*text-base/);
});
