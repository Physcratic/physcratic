import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { CARD_LAYER, HEADER_LAYER, MENU_LAYER, RING_HEADER_LAYER, RING_PAGE_LAYER, ringLayer } from "../components/tour/tour-layer";
import { plainTourText } from "../components/tour/tour-text";
import { tours } from "../components/tour/tours";

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
  assert.match(nav, new RegExp(`<header className="relative z-${HEADER_LAYER} `));
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
