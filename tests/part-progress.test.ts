import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { PartProgressBar, SolvedBanner, SolvedWatcher, partsCorrectText, type BarPart } from "../components/physics/part-progress";
import { ArenaDocument } from "../components/physics/arena-document";
import { FeedbackBox, PartChip, ResultLine, answerCardClass, invalidFieldText } from "../components/physics/solve-ui";
import { SolvedSummary } from "../components/physics/progress-summary";
import type { FeedbackStatus } from "../lib/solve-feedback";

(globalThis as { React?: unknown }).React = React;
const html = (node: React.ReactElement) => renderToStaticMarkup(node);
const text = (markup: string) => markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const partColour = /part-(teal|violet|amber|blue)|--pb\b|--pc-(bg|fg)/;
const parts = (flags: boolean[]): BarPart[] => flags.map((correct, index) => ({ id: `p${index}`, correct }));
const segments = (markup: string) => [...markup.matchAll(/<span [^>]*data-filled="[^"]*"[^>]*>/g)].map((match) => match[0]);

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

test("bar segments are an outlined neutral track until the part is correct, then the success colour, never a part colour", () => {
  const found = segments(html(createElement(PartProgressBar, { parts: parts([true, false]) })));
  assert.match(found[0], /class="[^"]*\bbg-success\b[^"]*"/);
  assert.match(found[0], /\bborder-success\b/);
  assert.match(found[1], /class="[^"]*\bbg-idle-tint\b[^"]*"/);
  assert.match(found[1], /\bborder\b[^"]*\bborder-border\b|\bborder-border\b/);
  for (const tag of found) assert.doesNotMatch(tag, partColour);
});

test("no part colour appears in the solve page or the Arena page, in the rendered markup or the source", () => {
  const statement = ["Bob and Jeff stand on frictionless ice. Each pulls a sled and the two sleds are joined by one light rope. Jeff pulls with a constant force.", "## (a) Find the acceleration of Jeff's sled.", "Give the answer in metres per second squared.", "## (b) Find the tension.", "State it in newtons.", "## (c) Find the time.", "Use the rope.", "## (d) Find the distance.", "Measure from the start.", "## (e) Check the sign.", "Compare with part (a)."].join("\n\n");
  const markup = [
    html(createElement(ArenaDocument, { content: statement, staticFigures: true })),
    html(createElement(PartProgressBar, { parts: parts([true, false, false, true, false]) })),
    html(createElement(FeedbackBox, { tone: "success", title: "Correct" })),
    html(createElement(SolvedBanner)),
    ...(["correct", "incorrect", "invalid", "inconclusive", "self-review", "unanswered"] as const).map((status) => html(createElement(ResultLine, { status, message: "A message." }))),
    html(createElement(PartChip, null, "b")),
    answerCardClass(false), answerCardClass(true),
  ].join("\n");
  assert.equal((markup.match(/Part /g) ?? []).length >= 5, true, "the Arena document rendered its part chips");
  assert.doesNotMatch(markup, partColour);
  for (const file of ["components/physics/archive-answer-panel.tsx", "components/physics/arena-document.tsx", "components/physics/part-progress.tsx", "components/physics/solve-ui.tsx", "components/physics/progress-summary.tsx"]) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, partColour, `${file} has no part colour class or variable`);
  }
});

test("a part chip is a neutral badge with a border, the same for every part", () => {
  const chips = [html(createElement(PartChip, null, "b"))];
  assert.match(chips[0], /\bborder\b/);
  assert.match(chips[0], /\bborder-border\b/);
  assert.match(chips[0], /\bbg-idle-tint\b/);
  assert.match(chips[0], /\btext-foreground\b/);
  assert.match(chips[0], /\bfont-bold\b/);
  assert.equal(text(chips[0]), "b");
});

test("an answer card is the plain card, a correct part is green only on its result line, and the next part is only outlined", () => {
  for (const next of [false, true]) {
    const card = answerCardClass(next);
    assert.match(card, /\bbg-card\b/);
    assert.match(card, /\bborder\b/);
    assert.doesNotMatch(card, /tint|success|danger|border-l|border-2|stripe|shadow/, `next ${next}`);
  }
  assert.doesNotMatch(answerCardClass(false), /outline/);
  assert.match(answerCardClass(true), /\boutline-2\b/);
  assert.match(answerCardClass(true), /\boutline-ring\b/);
  const correct = html(createElement(ResultLine, { status: "correct", message: "Your answer matches." }));
  assert.match(correct, /\bbg-success-tint\b/);
  assert.match(correct, /\btext-success-ink\b/);
  assert.match(correct, /<svg[^>]*aria-hidden="true"/);
  for (const status of ["incorrect", "invalid", "inconclusive", "self-review", "unanswered"] as const) assert.doesNotMatch(html(createElement(ResultLine, { status, message: "" })), /tint/, status);
});

test("the invalid field and the Not correct line use the same danger ink, and nothing else is orange-brown", () => {
  assert.match(invalidFieldText, /text-danger-ink/);
  assert.doesNotMatch(invalidFieldText, /destructive/);
  const wrong = html(createElement(ResultLine, { status: "incorrect", message: "Your answer gives a different value." }));
  assert.match(wrong, /\btext-danger-ink\b/);
  assert.equal(/\btext-danger-ink\b/.exec(invalidFieldText)![0], /\btext-danger-ink\b/.exec(wrong)![0]);
  const panel = readFileSync("components/physics/archive-answer-panel.tsx", "utf8");
  assert.match(panel, /className=\{invalidFieldText\}/);
  assert.doesNotMatch(panel, /invalid[^"`]*destructive/, "the invalid field adds no destructive colour of its own");
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
  assert.equal(text(banner), "All checkable answers correct");
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

test("the zero state of the solved summary is the plain card with a neutral icon and no green", () => {
  const zero = html(createElement(SolvedSummary, { solved: 0, recent: 0 }));
  assert.equal(text(zero), "0 with all checkable answers correct");
  assert.match(zero, /border-border bg-card/);
  assert.match(zero, /text-idle-ink/);
  assert.match(zero, /<svg[^>]*aria-hidden="true"/);
  assert.doesNotMatch(zero, /success|tint/);
  const some = html(createElement(SolvedSummary, { solved: 1, recent: 0 }));
  assert.match(some, /border-success bg-success-tint/);
  assert.doesNotMatch(some, /idle/);
  assert.equal(text(some), "1 with all checkable answers correct");
  assert.notEqual(/<svg[^>]*class="([^"]*)"/.exec(zero)![1].includes("lucide-circle-check"), /<svg[^>]*class="([^"]*)"/.exec(some)![1].includes("lucide-circle-check"), "the icon differs");
});
