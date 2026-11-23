import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Checkbox } from "../components/ui/checkbox";

(globalThis as { React?: unknown }).React = React;

test("the checkbox corner is a fixed 4px radius, well under half of its 16px box", () => {
  const html = renderToStaticMarkup(createElement(Checkbox, { id: "box", "aria-label": "Box" }));
  const classes = /<button[^>]*class="([^"]*)"/.exec(html)?.[1].split(/\s+/) ?? [];
  assert.ok(classes.includes("w-4") && classes.includes("h-4"), "a 16px box");
  const radiusClasses = classes.filter((name) => /^rounded/.test(name));
  assert.deepEqual(radiusClasses, ["rounded-[4px]"], "one radius class, no theme token");
  // What that class resolves to in the real stylesheet, which is where rounded-sm became 8px.
  const css = join(mkdtempSync(join(tmpdir(), "physcratic-checkbox-")), "style.css");
  execFileSync("node_modules/.bin/tailwindcss", ["-i", "app/globals.css", "-o", css], { stdio: "pipe" });
  const sheet = readFileSync(css, "utf8");
  const radius = /\.rounded-\\\[4px\\\]\s*\{[^}]*border-radius:\s*([0-9.]+)px/.exec(sheet)?.[1];
  assert.equal(Number(radius), 4);
  assert.ok(Number(radius) < 16 / 2, "less than half the box width, so it is not a circle");
});
