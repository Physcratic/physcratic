import assert from "node:assert/strict";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MathPad } from "../components/physics/math-pad";
import { ConditionsLine, InlineMath } from "../components/physics/inline-math";
import { ArenaDocument } from "../components/physics/arena-document";
import { ResultLine } from "../components/physics/solve-ui";
import { WorkedSolution } from "../components/authored/worked-solution";
import { conditionPhrases, symbolItems } from "../components/physics/answer-palette";

// Components are compiled with the classic JSX runtime under tsx, which looks for a global React.
(globalThis as { React?: typeof React }).React = React;
const html = (node: React.ReactElement) => renderToStaticMarkup(node);
const noop = () => {};
const pad = (items: ReturnType<typeof symbolItems>) => html(createElement(MathPad, { items, mode: "answer", onInsert: noop, tour: false }));
const count = (text: string, part: string) => text.split(part).length - 1;

test("symbol chips are typeset as maths and keep their name and their 44px target", () => {
  const out = pad(symbolItems(["m_A", "m_B", "L"]));
  assert.equal(count(out, 'class="katex"'), 3, "three chips, three typeset symbols");
  assert.match(out, /<annotation encoding="application\/x-tex">m_\{A\}<\/annotation>/);
  for (const name of ["m_A symbol", "m_B symbol", "L symbol"]) assert.match(out, new RegExp(`aria-label="${name}"`));
  assert.equal(count(out, "min-h-11 min-w-11"), 3, "every chip keeps the 44px minimum");
  // The typeset symbol is hidden from screen readers, so the button's own name is what is read, once.
  assert.match(out, /<span aria-hidden="true"><span><span class="katex">/);
});

test("a chip that fails to parse falls back to its plain text and shows no error", () => {
  const [item] = symbolItems(["x"]);
  const out = pad([{ ...item, label: "x_bad", name: "x_bad symbol", latex: "\\frac{" }]);
  assert.match(out, /<span aria-hidden="true"><span>x_bad<\/span><\/span>/);
  assert.equal(count(out, "katex"), 0);
  assert.doesNotMatch(out, /ParseError|KaTeX parse error|Expected|undefined/i);
  assert.match(out, /aria-label="x_bad symbol"/);
});

test("the conditions line is typeset, with the plain text as the fallback", () => {
  const phrases = conditionPhrases([
    { symbol: "m_A", assumptions: ["positive"] },
    { symbol: "u", assumptions: [], min: 50, max: 150 },
    { symbol: "x", assumptions: ["nonzero"] },
  ]);
  assert.deepEqual(phrases.map((p) => p.text), ["m_A > 0", "50 ≤ u ≤ 150", "x ≠ 0"]);
  assert.deepEqual(phrases.map((p) => p.latex), ["m_{A} > 0", "50 \\le u \\le 150", "x \\ne 0"]);
  const out = html(createElement(ConditionsLine, { phrases }));
  assert.match(out, /^<p class="text-sm text-muted-foreground">Conditions:/);
  assert.equal(count(out, 'class="katex"'), 3);
  assert.match(out, /, /);
  assert.equal(html(createElement(ConditionsLine, { phrases: [] })), "");
  const broken = html(createElement(ConditionsLine, { phrases: [{ text: "k > 0", latex: "\\frac{" }] }));
  assert.match(broken, /Conditions: <span>k &gt; 0<\/span>\.<\/p>$/);
  assert.equal(count(broken, "katex"), 0);
});

test("InlineMath never throws on bad LaTeX and never shows the parser's message", () => {
  for (const latex of ["\\frac{", "\\unknownmacro{x}", "}{", "x^", "\\", ""]) {
    const out = html(createElement(InlineMath, { latex, fallback: "plain" }));
    assert.equal(out, "<span>plain</span>", latex);
  }
  assert.equal(count(html(createElement(InlineMath, { latex: "L", fallback: "plain" })), 'class="katex"'), 1);
});

test("a different value shows Not correct once, and a match shows Correct once", () => {
  const different = "Not correct. Your answer gives a different value from the reference answer for some test values. Check signs, factors and which symbols you used.";
  const out = html(createElement(ResultLine, { status: "incorrect", message: different }));
  assert.equal(count(out, "Not correct"), 1, out);
  assert.match(out, /<strong class="font-semibold">Not correct\.<\/strong> Your answer gives a different value/);
  const match = "Correct. Your answer matches the reference answer for every set of test values. Your derivation has not been graded.";
  assert.equal(count(html(createElement(ResultLine, { status: "correct", message: match })), "Correct"), 1);
  // A message that does not repeat the label is shown whole.
  assert.match(html(createElement(ResultLine, { status: "incorrect", message: "Not quite. Check your calculation." })), /Not quite\. Check your calculation\./);
});

test("an unanswered part shows its status once, in words, and keeps the guidance", () => {
  const out = html(createElement(ResultLine, { status: "unanswered", message: "Unanswered. You can check this part later.", id: "r" }));
  assert.equal(count(out, "Not answered"), 1, out);
  assert.equal(count(out, "nswered"), 1, "no second Unanswered or Not answered");
  assert.match(out, /<strong class="font-semibold">Not answered\.<\/strong> You can check this part later\./);
  // Words carry the status and an icon sits beside them, so colour is never the only signal.
  assert.match(out, /<svg[^>]*aria-hidden="true"/);
  assert.match(out, /^<p id="r"/);
});

test("Arena part headings show a, b without brackets and keep Part a as the accessible name", () => {
  const out = html(createElement(ArenaDocument, { content: "Setup.\n\n## (a) Find the speed.\n\nText.\n\n## (b)\n\nMore text.", staticFigures: true }));
  assert.doesNotMatch(out, />\(a\)</);
  assert.doesNotMatch(out, />\(b\)</);
  assert.equal(count(out, '<span aria-hidden="true">a</span><span class="sr-only">Part a</span>'), 1);
  assert.equal(count(out, '<span aria-hidden="true">b</span><span class="sr-only">Part b</span>'), 1);
});

test("a worked solution for a part labelled (a) reads Part a", () => {
  const out = html(createElement(WorkedSolution, { problemId: "p", revisionId: "r", partId: "x", partLabel: "(a)", partColour: 0, onStale: noop, onAuth: noop } as never));
  assert.match(out, /Part a</);
  assert.doesNotMatch(out, /Part \(a\)/);
});
