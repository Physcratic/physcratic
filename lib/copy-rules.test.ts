import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findCopyProblems } from "./copy-rules";
import { articles, COACHING_LINE } from "./learn/articles";
import { visibleStrings } from "./learn/reading";

describe("findCopyProblems", () => {
  it("passes plain copy", () => {
    assert.deepEqual(findCopyProblems("Practise each day. Rest, then review."), []);
  });
  it("flags em dashes, en dashes and semicolons", () => {
    const rules = findCopyProblems("a — b – c; d").map((p) => p.rule);
    assert.deepEqual(rules, ["em dash", "en dash", "semicolon"]);
  });
  it("flags each banned phrase, ignoring case and curly apostrophes", () => {
    const phrases = [
      "delve",
      "unlock",
      "elevate",
      "in today’s",
      "journey",
      "game-changer",
      "seamless",
      "dive into",
      "look no further",
    ];
    for (const phrase of phrases) {
      const found = findCopyProblems(`Some ${phrase.toUpperCase()} text`);
      assert.equal(found.length, 1, phrase);
    }
  });
  it("reports every repeat", () => {
    assert.equal(findCopyProblems("a; b; c").length, 2);
  });
});

describe("learn articles obey the copy rules", () => {
  it("has no flagged text in any string", () => {
    const failures: string[] = [];
    for (const article of articles) {
      for (const text of visibleStrings(article)) {
        for (const problem of findCopyProblems(text)) {
          failures.push(`${article.slug}: ${problem.rule} in "${text.slice(0, 60)}"`);
        }
      }
    }
    assert.deepEqual(failures, []);
  });
});

describe("the coaching line at the end of every guide", () => {
  it("has the agreed words, links to /coaching and obeys the copy rules", () => {
    assert.equal(`${COACHING_LINE.lead} ${COACHING_LINE.linkLabel}`, "Want a coach who has sat these exams? Meet our medallist coaches.");
    assert.equal(COACHING_LINE.href, "/coaching");
    for (const text of [COACHING_LINE.lead, COACHING_LINE.linkLabel]) assert.deepEqual(findCopyProblems(text), []);
  });
});
