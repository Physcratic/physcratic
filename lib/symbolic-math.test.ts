import assert from "node:assert/strict";
import test from "node:test";
import { demoRankings, risingStreak } from "./contest-demo";
import { iphoTasks } from "./ipho-demo";
import { checkSymbolicAnswer, parseAnswer } from "./symbolic-math";

for (const task of iphoTasks) {
  test(`reference answer and preview parse: ${task.id}`, () => {
    const variables = task.variables.map((variable) => variable.name);
    assert.ok(parseAnswer(task.expected, variables).toTex());
    assert.equal(checkSymbolicAnswer(task.expected, task.expected, variables), true);
  });
}

test("accepts reordered factors, rational coefficients, and regrouped denominators", () => {
  const task = iphoTasks[1];
  for (const value of ["-G*M*M*3/(R*5)", "-(3/5)*M^2*G/R", "-0.6*G*M^2/R"]) {
    assert.equal(checkSymbolicAnswer(value, task.expected, ["G", "M", "R"]), true, value);
  }
  assert.equal(checkSymbolicAnswer("(3/5)*G*M^2/R/L", iphoTasks[2].expected, ["G", "M", "R", "L"]), true);
});

test("normalizes square roots and fractional powers consistently", () => {
  assert.equal(checkSymbolicAnswer("(G*(m+M)/(r+R)^3)^(1/2)", iphoTasks[0].expected, ["G", "M", "m", "R", "r"]), true);
});

test("does not match wrong signs, omitted factors, or accidental numbers", () => {
  for (const value of ["3*G*M^2/(5*R)", "-G*M^2/R", "-0.6"]) {
    assert.equal(checkSymbolicAnswer(value, iphoTasks[1].expected, ["G", "M", "R"]), false, value);
  }
});

test("rejects unknown variables, assignments, commands, accessors, arrays, and excessive exponents", () => {
  for (const value of ["g*M/R", "G=3", "a[1]", "G.constructor", "[1,2]", "import(1)", "evaluate(1)", "sin(G)", "sqrt", "G^100", "G^(2^3)", "G^(1/0)", "G!", "G;M", "G_R"]) {
    assert.throws(() => parseAnswer(value, ["G", "M", "R"]), Error, value);
  }
});

test("rejects empty and oversized expressions", () => {
  for (const value of ["", " ", "M+".repeat(100), "(".repeat(40) + "M" + ")".repeat(40)]) {
    assert.throws(() => parseAnswer(value, ["M"]), Error, value);
  }
});

test("consecutive rating streak resets on a loss or a flat round", () => {
  assert.equal(risingStreak([-4, 12, 24, 32]), 3);
  assert.equal(risingStreak([4, 12, -1]), 0);
  assert.equal(risingStreak([4, 0, 12]), 1);
  assert.equal(risingStreak([]), 0);
  for (const row of demoRankings) assert.equal(row.recentChanges.at(-1), row.change);
});
