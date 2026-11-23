import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PartProgressBar, SolvedBanner, SolvedWatcher, partsCorrectText, type BarPart } from "../components/physics/part-progress";
import { FeedbackBox, PartChip, ResultLine, partBorder, partStyle } from "../components/physics/solve-ui";
import { SolvedSummary } from "../components/physics/progress-summary";
import { assignPartColors, partTokenNames } from "../lib/part-colors";
import type { FeedbackStatus } from "../lib/solve-feedback";

(globalThis as { React?: unknown }).React = React;
const html = (node: React.ReactElement) => renderToStaticMarkup(node);
const text = (markup: string) => markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const expectedName = (index: number) => ["teal", "violet", "amber", "blue"][index % 4];
const parts = (flags: boolean[]): BarPart[] => flags.map((correct, index) => ({ id: `p${index}`, colorIndex: index, correct }));
const segments = (markup: string) => [...markup.matchAll(/<span [^>]*data-part-token="[^"]*"[^>]*>/g)].map((match) => match[0]);

test("the bar has one segment per part, fills the correct ones, and says the same in words", () => {
  const out = html(createElement(PartProgressBar, { parts: parts([true, false, true]) }));
  assert.match(out, /role="img" aria-label="2 of 3 parts correct"/);
  const found = segments(out);
  assert.equal(found.length, 3);
  assert.deepEqual(found.map((tag) => /data-filled="true"/.test(tag)), [true, false, true]);
  for (const [flags, words] of [[[false, false], "0 of 2 parts correct"], [[true, true, true, true], "4 of 4 parts correct"]] as const) {
    const bar = html(createElement(PartProgressBar, { parts: parts([...flags]) }));
    assert.match(bar, new RegExp(`aria-label="${words}"`));
    assert.equal(segments(bar).length, flags.length);
  }
  assert.equal(partsCorrectText(1, 1), "1 of 1 part correct");
  assert.equal(html(createElement(PartProgressBar, { parts: parts([true]) })), "", "one part needs no bar");
});

test("a filled segment is the strong colour and an open one is the tint with an outline, in the part's own token", () => {
  const found = segments(html(createElement(PartProgressBar, { parts: parts([true, false]) })));
  assert.match(found[0], /class="[^"]*\bbg-part-teal\b[^"]*"/);
  assert.match(found[1], /class="[^"]*\bbg-part-violet-tint\b[^"]*"/);
  assert.match(found[1], /\bborder\b/);
});

test("a part's chip, stripe and bar segment use the same colour token, and the colours repeat after four parts", () => {
  assert.deepEqual([...partTokenNames], ["teal", "violet", "amber", "blue"]);
  for (let index = 0; index < 10; index++) {
    const name = expectedName(index);
    const others = ["teal", "violet", "amber", "blue"].filter((other) => other !== name);
    const style = partStyle(index) as Record<string, string>;
    const chip = html(createElement(PartChip, { index } as React.ComponentProps<typeof PartChip>, "b"));
    const segment = segments(html(createElement(PartProgressBar, { parts: [...parts([false, false]).slice(0, 1), { id: "x", colorIndex: index, correct: true }] })))[1];
    assert.equal(style["--pb"], `hsl(var(--part-${name}))`, `stripe ${index}`);
    assert.equal(style["--pc-bg"], `hsl(var(--part-${name}-tint))`, `chip tint ${index}`);
    assert.equal(style["--pc-fg"], `hsl(var(--part-${name}-ink))`, `chip text ${index}`);
    assert.match(chip, new RegExp(`--pc-bg:hsl\\(var\\(--part-${name}-tint\\)\\)`), `chip markup ${index}`);
    assert.match(segment, new RegExp(`data-part-token="${name}"`), `bar ${index}`);
    assert.match(segment, new RegExp(`\\bbg-part-${name}\\b`), `bar fill ${index}`);
    for (const other of others) {
      assert.doesNotMatch(chip, new RegExp(`part-${other}`), `chip ${index} is not ${other}`);
      assert.doesNotMatch(segment, new RegExp(`part-${other}`), `bar ${index} is not ${other}`);
      assert.ok(!String(style["--pb"]).includes(`part-${other}`), `stripe ${index} is not ${other}`);
    }
  }
  assert.match(partBorder, /border-l-4/);
  assert.deepEqual(assignPartColors(["a", "b", "c", "d", "e"]).map(expectedName), ["teal", "violet", "amber", "blue", "teal"]);
});

test("every result state says its status in words beside an icon, not by colour alone", () => {
  const words: Record<FeedbackStatus, string> = { correct: "Correct", incorrect: "Not correct", invalid: "Could not read this answer", inconclusive: "Could not be decided", "self-review": "Check this one yourself", unanswered: "Not answered" };
  for (const status of Object.keys(words) as FeedbackStatus[]) {
    const out = html(createElement(ResultLine, { status, message: "A message." }));
    assert.match(out, /<svg[^>]*aria-hidden="true"/, `${status} has an icon`);
    assert.ok(text(out).startsWith(`${words[status]}.`), `${status} starts with its words`);
    assert.ok(text(out).includes("A message."), `${status} keeps the grader's message`);
  }
  for (const tone of ["success", "error", "warning", "neutral"] as const) {
    const out = html(createElement(FeedbackBox, { tone, title: "Words here" }));
    assert.match(out, /<svg[^>]*aria-hidden="true"/, `${tone} box has an icon`);
    assert.ok(text(out).includes("Words here"));
  }
  assert.match(html(createElement(ResultLine, { status: "correct", message: "" })), /text-success-ink/);
  assert.match(html(createElement(ResultLine, { status: "incorrect", message: "" })), /text-danger-ink/);
});

test("the Solved note appears on the change to solved, not for a problem that is solved when it first shows", () => {
  const loadedSolved = new SolvedWatcher(true);
  assert.equal(loadedSolved.next(true), false, "an initial solved render shows nothing");
  assert.equal(loadedSolved.next(true), false);
  const watcher = new SolvedWatcher(false);
  assert.equal(watcher.next(false), false);
  assert.equal(watcher.next(true), true, "the change to solved shows it");
  assert.equal(watcher.next(true), true, "a redraw keeps it");
  assert.equal(watcher.next(false), false, "an edit that undoes it hides it");
  assert.equal(watcher.next(true), true, "and solving again shows it again");
  const banner = html(createElement(SolvedBanner));
  assert.equal(text(banner), "Solved");
  assert.match(banner, /<svg[^>]*aria-hidden="true"/);
  assert.match(banner, /role="status"/);
});

test("the Solved note fades in only when motion is allowed, and has no confetti or pressure wording", () => {
  const banner = html(createElement(SolvedBanner));
  assert.match(banner, /motion-safe:animate-in/);
  const classes = /class="([^"]*)"/.exec(banner)![1].split(" ");
  assert.ok(!classes.some((name) => /^(animate-|fade-in|duration-)/.test(name)), "no motion class without motion-safe");
  assert.doesNotMatch(text(banner), /streak|keep going|don't|confetti/i);
});

test("the zero state of the solved summary is neutral grey with a neutral icon and no green", () => {
  const zero = html(createElement(SolvedSummary, { solved: 0, recent: 0 }));
  assert.equal(text(zero), "0 solved");
  assert.match(zero, /border-idle bg-idle-tint/);
  assert.match(zero, /text-idle-ink/);
  assert.match(zero, /<svg[^>]*aria-hidden="true"/);
  assert.doesNotMatch(zero, /success/);
  const some = html(createElement(SolvedSummary, { solved: 1, recent: 0 }));
  assert.match(some, /border-success bg-success-tint/);
  assert.doesNotMatch(some, /idle/);
  assert.notEqual(/<svg[^>]*class="([^"]*)"/.exec(zero)![1].includes("lucide-circle-check"), /<svg[^>]*class="([^"]*)"/.exec(some)![1].includes("lucide-circle-check"), "the icon differs");
});
