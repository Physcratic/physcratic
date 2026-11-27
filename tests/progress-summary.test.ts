import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Card } from "../components/ui/card";
import { PartsMeter, ProgressCardHeader, SolvedSummary, checkedInLastWeek, progressStatus, type ProgressStatus } from "../components/physics/progress-summary";

(globalThis as { React?: unknown }).React = React;
const html = (node: React.ReactElement) => renderToStaticMarkup(node);
const text = (markup: string) => markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const statuses = ["solved", "in-progress", "not-graded"] as const satisfies readonly ProgressStatus[];

test("every status badge says its status in words, with an icon and the count in text, never colour alone", () => {
  const words = { solved: "All checkable answers correct", "in-progress": "Checks unfinished", "not-graded": "Not graded" } as const;
  for (const status of statuses) {
    const out = html(createElement(Card, null, createElement(ProgressCardHeader, { status, count: 3 })));
    assert.match(out, new RegExp(`<h2[^>]*>.*${words[status]} .*>3</span></h2>`), status);
    assert.equal(text(/<h2[^>]*>[\s\S]*?<\/h2>/.exec(out)![0]), `${words[status]} 3`, "the heading reads the status then the count");
    assert.match(out, /<svg[^>]*aria-hidden="true"/, `${status} has an icon`);
    assert.doesNotMatch(out, /tint/, `${status} header stays on the plain card, so three tinted bands do not stack`);
    assert.match(out, new RegExp(`<svg[^>]*class="[^"]*${progressStatus[status].ink}`), `${status} icon is in its ink colour`);
    assert.match(out, new RegExp(`class="[^"]*${progressStatus[status].badge.split(" ")[0]}[^"]*"[^>]*>3</span>`), `${status} badge is coloured with the number in text`);
  }
  // Three statuses, three different colours and three different icons.
  assert.equal(new Set(statuses.map((s) => progressStatus[s].badge)).size, 3);
  assert.equal(new Set(statuses.map((s) => progressStatus[s].Icon)).size, 3);
});

test("red is kept for something wrong, so no progress list uses it", () => {
  for (const status of statuses) assert.doesNotMatch(JSON.stringify(Object.values(progressStatus[status]).filter((v) => typeof v === "string")), /danger|destructive/);
});

test("the solved summary shows the big number with its word, and the recent line only when there is one", () => {
  const some = html(createElement(SolvedSummary, { solved: 5, recent: 2 }));
  assert.equal(text(some), "5 with all checkable answers correct 2 checked in the last 7 days");
  assert.match(some, /text-4xl/);
  assert.match(some, /<svg[^>]*aria-hidden="true"/);
  assert.equal(text(html(createElement(SolvedSummary, { solved: 0, recent: 0 }))), "0 with all checkable answers correct");
});

test("checked in the last 7 days counts only dates inside the week, and only what the page already has", () => {
  const now = Date.parse("2026-11-23T12:00:00Z");
  const day = 24 * 60 * 60 * 1000;
  const at = (offset: number) => ({ lastCheckedAt: new Date(now - offset).toISOString() });
  assert.equal(checkedInLastWeek([], now), 0);
  assert.equal(checkedInLastWeek([at(0), at(6 * day), at(7 * day), at(7 * day + 1000), at(30 * day)], now), 3);
  assert.equal(checkedInLastWeek([{ lastCheckedAt: "not a date" }, at(-day)], now), 0, "an invalid or future date is not counted");
});

test("the parts bar is decoration beside the words and stays within 0 to 100 percent", () => {
  const bar = (done: number, total: number) => html(createElement(PartsMeter, { done, total }));
  assert.match(bar(1, 4), /aria-hidden="true"/);
  assert.match(bar(1, 4), /width:25%/);
  assert.match(bar(9, 4), /width:100%/);
  assert.match(bar(-1, 4), /width:0%/);
  assert.equal(bar(0, 0), "", "nothing to show without required parts");
});
