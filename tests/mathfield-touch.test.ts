import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { SINK_SELECTOR, enableTouchKeyboard, isTouchDevice, touchSinkAttributes } from "../components/physics/mathfield-touch";

// CI has no browser and no DOM library, so the field cannot be mounted here. These tests pin what the phone fix relies
// on instead: the MathLive version, the sink MathLive builds, and the attributes we set on it. tests/phase2-phones.browser.mjs
// mounts a real field on iOS and Android emulation and checks the same attributes on the live sink.

const root = join(process.cwd(), "node_modules", "mathlive");

test("mathlive stays pinned at 0.111.1 in package.json and in node_modules", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(pkg.dependencies.mathlive, "0.111.1");
  assert.equal(JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version, "0.111.1");
});

test("MathLive still builds the keyboard sink the fix patches, still with inputmode=none", () => {
  const source = readFileSync(join(root, "mathlive.mjs"), "utf8");
  const sink = source.match(/<span contenteditable=true[^`]*part=keyboard-sink[^`]*>/)?.[0] ?? "";
  assert.ok(sink, "the sink markup moved: check enableTouchKeyboard and SINK_SELECTOR before upgrading");
  assert.ok(sink.includes("class=ML__keyboard-sink"), "the sink class changed");
  assert.ok(SINK_SELECTOR === ".ML__keyboard-sink");
  assert.ok(sink.includes("inputmode=none"), "MathLive no longer sets inputmode=none: the fix may be unnecessary now, review it");
});

test("the touch fix sets all five attributes on the sink and reports a missing sink", () => {
  const attributes = new Map<string, string>();
  const sink = { setAttribute: (name: string, value: string) => attributes.set(name, value) };
  const element = { shadowRoot: { querySelector: (selector: string) => (selector === SINK_SELECTOR ? (sink as unknown as Element) : null) } };
  assert.equal(enableTouchKeyboard(element), true);
  assert.deepEqual(Object.fromEntries(attributes), { inputmode: "text", autocapitalize: "off", autocorrect: "off", autocomplete: "off", spellcheck: "false" });
  assert.deepEqual(touchSinkAttributes, Object.fromEntries(attributes));
  assert.equal(enableTouchKeyboard({ shadowRoot: null }), false);
  assert.equal(enableTouchKeyboard({ shadowRoot: { querySelector: () => null } }), false);
});

test("a touch device is one with a coarse pointer or touch points", () => {
  const win = (coarse: boolean, points: number) => ({ matchMedia: () => ({ matches: coarse }) as MediaQueryList, navigator: { maxTouchPoints: points } });
  assert.equal(isTouchDevice(win(true, 0)), true);
  assert.equal(isTouchDevice(win(false, 5)), true);
  assert.equal(isTouchDevice(win(false, 0)), false);
});

import { keyboardInset, scrollToClearPad } from "../components/physics/keyboard-dock";

test("the pad docks only when the keyboard height can be read, and only if the field stays clear of it", () => {
  assert.equal(keyboardInset(undefined, 800), null);
  assert.equal(keyboardInset({ height: Number.NaN, offsetTop: 0 }, 800), null);
  assert.equal(keyboardInset({ height: 0, offsetTop: 0 }, 800), null);
  assert.equal(keyboardInset({ height: 790, offsetTop: 0 }, 800), null, "an address bar is not a keyboard");
  assert.equal(keyboardInset({ height: 500, offsetTop: 0 }, 800), 300);
  assert.equal(keyboardInset({ height: 500, offsetTop: 40 }, 800), 260, "iOS scrolls the visual viewport down");
  const viewport = { height: 500, offsetTop: 0 };
  assert.equal(scrollToClearPad({ top: 100, bottom: 150 }, viewport, 150), 0, "already clear");
  assert.equal(scrollToClearPad({ top: 400, bottom: 460 }, viewport, 150), 118, "scroll up by the overlap and the margin");
  assert.equal(scrollToClearPad({ top: 20, bottom: 480 }, viewport, 150), null, "a field taller than the space stays inline");
  assert.equal(scrollToClearPad({ top: 100, bottom: 100.4 }, { height: 400.4 - 0, offsetTop: 0 }, 0, 0) !== null, true);
});
