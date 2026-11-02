import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SkipLink } from "../components/skip-link";
import { focusSkipTarget, type SkipTarget } from "../lib/skip-link";

function fakeTarget(tabindex?: string) {
  const attrs = new Map<string, string>(tabindex === undefined ? [] : [["tabindex", tabindex]]);
  const calls: string[] = [];
  const target: SkipTarget = {
    hasAttribute: (name) => attrs.has(name),
    setAttribute: (name, value) => void attrs.set(name, value),
    focus: () => void calls.push("focus"),
    scrollIntoView: () => void calls.push("scroll"),
  };
  return { target, attrs, calls };
}

test("the skip link is hidden until keyboard focus and never uses plain :focus", () => {
  const html = renderToStaticMarkup(createElement(SkipLink, { targetId: "main-content" }, "Skip to content"));
  assert.match(html, /href="#main-content"/);
  assert.match(html, /Skip to content/);
  const classes = /class="([^"]*)"/.exec(html)?.[1].split(/\s+/) ?? [];
  assert.ok(classes.includes("sr-only"));
  assert.ok(classes.includes("focus-visible:not-sr-only"));
  assert.ok(!classes.some((c) => c.startsWith("focus:")), "mouse focus must not reveal the link");
});

test("activating the link focuses the main region", () => {
  const { target, calls } = fakeTarget("-1");
  assert.equal(focusSkipTarget(target), true);
  assert.deepEqual(calls, ["focus", "scroll"]);
});

test("a region without tabindex still becomes focusable and keeps an existing tabindex", () => {
  const bare = fakeTarget();
  focusSkipTarget(bare.target);
  assert.equal(bare.attrs.get("tabindex"), "-1");
  const kept = fakeTarget("0");
  focusSkipTarget(kept.target);
  assert.equal(kept.attrs.get("tabindex"), "0");
});

test("a missing region does nothing", () => {
  assert.equal(focusSkipTarget(null), false);
});
