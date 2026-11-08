import assert from "node:assert/strict";
import test from "node:test";
import { checkArchivePartExactly as checkArchivePart } from "./archive-exact-grading";
import { archiveDefinitions } from "./archive-grading/catalog";
import { expression, numeric } from "./archive-grading/definitions";

test("every canonical and curated symbolic form still passes the independent exact grader", () => {
  for (const definition of archiveDefinitions) {
    for (const part of definition.parts) {
      if (part.kind !== "expression") continue;
      for (const answer of [part.canonical, ...part.alternatives]) {
        assert.equal(checkArchivePart(part, answer).status, "correct", `${definition.problemId}/${part.id}: ${answer}`);
      }
    }
  }
});

test("LaTeX spacing commands preserve numeric and symbolic answer meaning", () => {
  const key = numeric("r", "Result", 4.9, "1");
  const polynomial = expression("p", "Polynomial", "x^2", "x", "All real x");
  for (const command of [",", ":", ";", "!", " ", "quad", "qquad", "enspace", "thinspace", "medspace", "thickspace"]) {
    const space = `\\${command} `;
    for (const value of [`${space}\\frac{49}{10}`, `\\frac{49}{10}${space}`, `\\frac{49${space}}{10}`, `4.9${space}`]) {
      assert.equal(checkArchivePart(key, value).status, "correct", value);
    }
    assert.equal(checkArchivePart(polynomial, `x${space}x`).status, "correct");
  }
});

test("LaTeX spacing cannot replace fraction, root, or exponent arguments", () => {
  const key = numeric("r", "Result", 4.9, "1");
  for (const command of [",", ":", ";", "!", "quad", "thinspace", "medspace", "thickspace"]) {
    for (const value of [`\\frac\\${command}{49}{10}`, `\\sqrt\\${command}{24.01}`]) {
      assert.equal(checkArchivePart(key, value).status, "invalid", value);
    }
  }
  const polynomial = expression("p", "Polynomial", "x^2", "x", "All real x");
  assert.equal(checkArchivePart(polynomial, String.raw`x^\!2`).status, "invalid");
});

test("dangling LaTeX escapes and bare punctuation are invalid", () => {
  const key = numeric("r", "Result", 4.9, "1");
  for (const value of ["4.9\\", "\\frac{49}{10}\\", "4.9\\\n", "4.9!", "4.9;", String.raw`4.9\\;`, String.raw`4.9\text{units}`, String.raw`4.9\newcommand{\x}{1}`]) {
    assert.equal(checkArchivePart(key, value).status, "invalid", value);
  }
});
