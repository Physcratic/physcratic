import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToString } from "katex";
import { demoRankings, risingStreak } from "./contest-demo";
import { iphoTasks } from "./ipho-demo";
import { checkSymbolicAnswer, parseAnswer } from "./symbolic-math";

for (const task of iphoTasks) {
  test(`reference answer and preview parse: ${task.id}`, () => {
    const variables = task.variables.map((variable) => variable.name);
    assert.ok(parseAnswer(task.expected, variables).toTex());
    assert.equal(checkSymbolicAnswer(task.expected, task.expected, variables), true);
    for (const formula of [task.answerTex, ...task.solution.map((step) => step.formula)]) {
      assert.doesNotThrow(() => renderToString(formula.slice(2, -2), { throwOnError: true }));
    }
  });
}

test("collection contains only 2025 tasks and all three official theory papers", () => {
  assert.ok(iphoTasks.every((task) => task.year === 2025));
  assert.deepEqual(iphoTasks.map((task) => task.paper), [1, 2, 3]);
  for (const task of iphoTasks) {
    for (const kind of ["questions", "solutions"]) {
      const pdf = readFileSync(`public/ipho/${task.year}-t${task.paper}-${kind}.pdf`);
      assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
      assert.ok(pdf.length > 10000);
    }
  }
});

test("accepts reordered factors, rational coefficients, and regrouped denominators", () => {
  for (const value of ["-G*M*M*3/(R*5)", "-(3/5)*M^2*G/R", "-0.6*G*M^2/R"]) {
    assert.equal(checkSymbolicAnswer(value, "-3*G*M^2/(5*R)", ["G", "M", "R"]), true, value);
  }
  assert.equal(checkSymbolicAnswer("(3/5)*G*M^2/R/L", "3*G*M^2/(5*R*L)", ["G", "M", "R", "L"]), true);
});

test("accepts alternate forms of the 2025 timepiece and bubble answers", () => {
  for (const value of ["g*(rho*h*S+m)", "m*g+rho*S*h*g"]) {
    assert.equal(checkSymbolicAnswer(value, iphoTasks[1].expected, ["m", "rho", "S", "h", "g"]), true, value);
  }
  assert.equal(checkSymbolicAnswer("2*sigma*c0/(P*(c-c0))", iphoTasks[2].expected, ["sigma", "P", "c", "c0"]), true);
});

test("normalizes square roots and fractional powers consistently", () => {
  assert.equal(checkSymbolicAnswer("(e^2/(r*m*epsilon*pi*4))^(1/2)", iphoTasks[0].expected, ["e", "epsilon", "m", "r"]), true);
  assert.equal(checkSymbolicAnswer("(G*(m+M)/(r+R)^3)^(1/2)", "sqrt(G*(M+m)/(R+r)^3)", ["G", "M", "m", "R", "r"]), true);
});

test("does not match wrong signs, omitted factors, or accidental numbers", () => {
  for (const value of ["-(m+rho*S*h)*g", "rho*S*h*g", "9.8"]) {
    assert.equal(checkSymbolicAnswer(value, iphoTasks[1].expected, ["m", "rho", "S", "h", "g"]), false, value);
  }
  assert.equal(checkSymbolicAnswer("4*sigma/(P*(c/c0-1))", iphoTasks[2].expected, ["sigma", "P", "c", "c0"]), false);
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
