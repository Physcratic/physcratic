import assert from "node:assert/strict";
import test from "node:test";
import { shortcutsFor, typingShortcuts } from "../components/physics/math-typing";

const defaults = { sin: "\\sin", log: "\\log_{#?}", dx: "\\differentialD x", "<=": "\\le", phi: { value: "\\phi", after: "nothing" } };

test("every name the owner listed turns into maths", () => {
  const table = shortcutsFor(defaults, []);
  for (const name of ["sin", "cos", "tan", "sec", "csc", "cot", "arcsin", "arccos", "arctan", "sinh", "cosh", "tanh", "ln", "log", "exp", "sqrt", "pi", "infinity", "alpha", "beta", "theta", "omega", "Gamma", "Delta", "Omega"])
    assert.ok(table[name], name);
  assert.equal(table.sin, "\\sin");
  assert.equal(table.log, "\\log", "log is the plain function, not a log with a base");
  assert.equal(table.theta, "\\theta");
  assert.equal(table.infinity, "\\infty");
  assert.equal(table.sqrt, "\\sqrt{#?}");
  assert.equal(table.phi, "\\varphi", "the letter the pad shows, with no condition");
  assert.equal(table.arcsec, "\\operatorname{arcsec}");
  assert.equal(table["<="], "\\le", "MathLive's symbol shortcuts are kept");
});

test("a declared symbol stays a symbol, except a Greek name, which is its own letter", () => {
  const table = shortcutsFor(defaults, ["pi", "exp", "dx", "rho", "\\theta_0", "k"]);
  assert.equal(table.pi, undefined, "a variable called pi is not converted");
  assert.equal(table.exp, undefined);
  assert.equal(table.dx, undefined, "a default shortcut that clashes is dropped too");
  assert.equal(table.rho, "\\rho", "a declared rho still becomes the letter rho");
  assert.equal(table.theta, "\\theta");
  assert.equal(table.sin, "\\sin");
  assert.ok(Object.keys(typingShortcuts).length > 40);
});
