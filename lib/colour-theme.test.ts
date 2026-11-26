import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { applyColour, colourChoice, colourOptions, colourScript, colourStorageKey, defaultColour, readColour } from "./colour-theme";

test("there are three colour themes and Ink is the default", () => {
  assert.deepEqual(colourOptions.map((o) => o.value), ["paper", "ink", "sky"]);
  assert.deepEqual(colourOptions.map((o) => o.label), ["Paper", "Ink", "Sky"]);
  assert.equal(defaultColour, "ink");
});

test("a stored colour theme is used and anything unknown falls back to Ink", () => {
  for (const value of ["paper", "ink", "sky"]) assert.equal(colourChoice(value), value);
  for (const value of ["", "PAPER", "dark", "light", "sky ", "constructor", "__proto__", null, undefined]) assert.equal(colourChoice(value as string | null | undefined), "ink", String(value));
  assert.equal(readColour({ getItem: () => "sky" }), "sky");
  assert.equal(readColour({ getItem: () => "blue" }), "ink");
  assert.equal(readColour({ getItem: () => null }), "ink");
  assert.equal(readColour(undefined), "ink");
  assert.equal(readColour({ getItem: () => { throw new Error("blocked"); } }), "ink", "blocked storage shows Ink");
});

test("a choice is kept on this device and put on the page, and blocked storage still applies it", () => {
  const set: [string, string][] = [];
  const stored: [string, string][] = [];
  applyColour("paper", { setAttribute: (k, v) => set.push([k, v]) }, { setItem: (k, v) => stored.push([k, v]) });
  assert.deepEqual(set, [["data-colour", "paper"]]);
  assert.deepEqual(stored, [[colourStorageKey, "paper"]]);
  const again: [string, string][] = [];
  applyColour("sky", { setAttribute: (k, v) => again.push([k, v]) }, { setItem: () => { throw new Error("full"); } });
  assert.deepEqual(again, [["data-colour", "sky"]]);
});

// The head script is what keeps the page from flashing, so it is run here the way a browser runs it.
function runScript(storage: { getItem(key: string): string | null } | "throws") {
  const attributes: Record<string, string> = {};
  const context = {
    document: { documentElement: { setAttribute: (k: string, v: string) => { attributes[k] = v; } } },
    localStorage: storage === "throws" ? { getItem: () => { throw new Error("blocked"); } } : storage,
  };
  vm.runInNewContext(colourScript, context);
  return attributes["data-colour"];
}
test("the first paint script sets the stored colour theme and falls back to Ink for anything else", () => {
  assert.equal(runScript({ getItem: (k) => (k === colourStorageKey ? "sky" : null) }), "sky");
  assert.equal(runScript({ getItem: () => "paper" }), "paper");
  assert.equal(runScript({ getItem: () => "ink" }), "ink");
  assert.equal(runScript({ getItem: () => "neon" }), "ink", "an unknown stored value shows Ink");
  assert.equal(runScript({ getItem: () => null }), "ink");
  assert.equal(runScript("throws"), "ink", "blocked storage shows Ink");
});

test("the script is in the page head, before the body, so the theme is set before the first paint", () => {
  const layout = readFileSync("app/layout.tsx", "utf8");
  const script = layout.indexOf("__html: colourScript");
  assert.ok(layout.includes('import { colourScript } from "@/lib/colour-theme"'));
  assert.ok(layout.indexOf("<head>") > 0 && script > layout.indexOf("<head>") && script < layout.indexOf("</head>") && layout.indexOf("</head>") < layout.indexOf("<body"));
});
