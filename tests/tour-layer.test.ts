import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import TopNav from "../components/kokonutui/top-nav";
import { CARD_LAYER, HEADER_LAYER, MENU_BUTTON_LAYER, MENU_LAYER, RING_HEADER_LAYER, RING_PAGE_LAYER, ringLayer } from "../components/tour/tour-layer";
import { plainTourText } from "../components/tour/tour-text";
import { tours } from "../components/tour/tours";

(globalThis as { React?: unknown }).React = React;
const router = { back() {}, forward() {}, refresh() {}, hmrRefresh() {}, push() {}, replace() {}, prefetch() {} };

const inHeader = { closest: (selector: string) => (selector === "header" ? {} : null), dataset: { tour: "nav-coaching" } };
const inPage = { closest: () => null, dataset: { tour: "answer-box" } };
const menuButton = { closest: () => null, dataset: { tour: "nav-open" } };

test("a page step keeps the ring under the header, menus, dialogs and the tour card", () => {
  const layer = ringLayer(inPage);
  assert.equal(layer, RING_PAGE_LAYER);
  assert.ok(layer < HEADER_LAYER && layer < MENU_LAYER && layer < CARD_LAYER);
});

test("a header step (Coaching, Help, Search, the menu button) raises the ring just above the header, still under menus and dialogs", () => {
  for (const target of [inHeader, menuButton]) {
    const layer = ringLayer(target);
    assert.equal(layer, RING_HEADER_LAYER);
    assert.ok(layer > HEADER_LAYER && layer < MENU_LAYER && layer < CARD_LAYER);
  }
});

test("the header really sits on the layer the ring is measured against", () => {
  const nav = readFileSync("components/kokonutui/top-nav.tsx", "utf8");
  const header = nav.match(/<header\b[^>]*>/)?.[0];
  assert.ok(header, "header source exists");
  // Positioning can vary, but the stacking layer must remain outside all conditional interpolations.
  assert.match(header.replace(/\$\{[^}]*\}/g, ""), new RegExp(`\\bz-${HEADER_LAYER}\\b`));
  for (const file of ["components/ui/dialog.tsx", "components/ui/dropdown-menu.tsx", "components/ui/sheet.tsx", "components/ui/popover.tsx"]) {
    assert.match(readFileSync(file, "utf8"), new RegExp(`z-${MENU_LAYER}`), file);
  }
  const tour = readFileSync("components/tour/guided-tour.tsx", "utf8");
  assert.ok(tour.includes("ringLayer(target)") && !/z-\[60\]/.test(tour));
  assert.ok(tour.includes(`z-[${CARD_LAYER}]`));
});

test("keys in tour text are marked as key chips, and the markers are balanced", () => {
  const text = (tour: "welcome" | "studio", id: string) => tours[tour].steps.find((s) => s.id === id)!.text;
  assert.ok(text("studio", "equation").includes("[[$]]"));
  assert.ok(text("welcome", "answer").includes("[[/]]") && text("welcome", "answer").includes("[[^]]"));
  assert.equal(plainTourText(text("welcome", "answer")), "Type your answer here. A / makes a fraction and a ^ makes a power, like on paper.");
  for (const tour of Object.values(tours)) for (const step of tour.steps) assert.ok(!/\[\[|\]\]/.test(plainTourText(step.text)), `${tour.id}/${step.id}`);
});

test("the mobile menu button sits above the header and below the menu it opens, and the tour ring still clears it", () => {
  assert.ok(MENU_BUTTON_LAYER > HEADER_LAYER && MENU_BUTTON_LAYER < MENU_LAYER);
  assert.ok(RING_HEADER_LAYER > MENU_BUTTON_LAYER, "the ring for the menu button step shows over the button");
  const sidebar = readFileSync("components/kokonutui/sidebar.tsx", "utf8");
  assert.match(sidebar, new RegExp(`fixed right-3 top-3.5 z-\\[${MENU_BUTTON_LAYER}\\] `));
});

test("both tours have a typing step with a key chip for the backslash", () => {
  for (const id of ["welcome", "studio"] as const) {
    const step = tours[id].steps.find((s) => s.id === "typing");
    assert.ok(step, id);
    assert.ok(step!.text.includes("[[\\]]theta") && step!.text.includes("sin"), id);
    assert.ok(plainTourText(step!.text).includes("\\theta"), id);
  }
});

test("default and public sticky headers retain the same unconditional stacking layer", () => {
  for (const sticky of [false, true]) {
    const html = renderToStaticMarkup(createElement(AppRouterContext.Provider, { value: router }, createElement(TopNav, { view: "overview", sticky })));
    const classes = html.match(/<header class="([^"]+)"/)?.[1].split(/\s+/);
    assert.ok(classes, "rendered header exists");
    assert.deepEqual(classes.filter(name => /^z-/.test(name)), [`z-${HEADER_LAYER}`]);
    assert.ok(classes.includes(sticky ? "sticky" : "relative"));
    if (sticky) assert.ok(classes.includes("top-0"));
  }
});
