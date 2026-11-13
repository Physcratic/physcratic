import assert from "node:assert/strict";
import test from "node:test";
import { convertPlainNames, mayGrow, planRun, type ConvertibleField } from "../components/physics/mathfield-convert";

/** A stand-in for a MathLive field: one entry per atom, and a plain letter is one atom that reads as that letter. */
class FakeField implements ConvertibleField {
  atoms: string[];
  position: number;
  private range: [number, number] = [0, 0];
  constructor(text: string[], caret = text.length) {
    this.atoms = text;
    this.position = caret;
  }
  get lastOffset() { return this.atoms.length; }
  set selection(value: { ranges: [number, number][] } | number) {
    this.range = typeof value === "number" ? [value, value] : value.ranges[0];
  }
  get selection() { return { ranges: [this.range] as [number, number][] }; }
  getValue(start: number, end: number) { return this.atoms.slice(start, end).join(""); }
  insert(latex: string, options: Record<string, unknown>) {
    const added = latex.includes("#?") ? [latex.replace("{#?}", ""), "", ""] : [latex];
    this.atoms.splice(this.range[0], this.range[1] - this.range[0], ...added);
    this.position = options.selectionMode === "placeholder" ? this.range[0] + 2 : this.range[0] + added.length;
    return true;
  }
  get text() { return this.atoms.join(""); }
}
const typed = (text: string) => new FakeField(Array.from(text));
const run = (field: FakeField, declared: string[] = [], settled = true) => convertPlainNames(field, declared, settled);

test("sin and theta become the command, and the caret stays right after it", () => {
  for (const [text, expected] of [["sin", "\\sin"], ["theta", "\\theta"], ["cos", "\\cos"], ["arctan", "\\arctan"], ["Delta", "\\Delta"], ["infinity", "\\infty"], ["ln", "\\ln"], ["exp", "\\exp"], ["pi", "\\pi"], ["phi", "\\varphi"], ["sinh", "\\sinh"], ["sech", "\\operatorname{sech}"]] as string[][]) {
    const field = typed(text);
    assert.equal(run(field).changed, true, text);
    assert.equal(field.text, expected, text);
    assert.equal(field.position, 1, `${text}: the caret is after the command`);
  }
});

test("every Greek name converts", () => {
  for (const name of ["alpha", "beta", "gamma", "delta", "zeta", "eta", "kappa", "lambda", "mu", "nu", "xi", "rho", "sigma", "tau", "upsilon", "chi", "psi", "omega", "Gamma", "Theta", "Lambda", "Sigma", "Phi", "Psi", "Omega"]) {
    const field = typed(name);
    run(field);
    assert.ok(field.text.startsWith("\\") && field.atoms.length === 1, name);
  }
});

test("sin next to a declared symbol converts, and the symbol stays", () => {
  const field = typed("sinx");
  assert.equal(run(field, ["x"]).changed, true);
  assert.deepEqual(field.atoms, ["\\sin", "x"]);
  assert.equal(field.position, 2);
  const other = typed("sinx");
  assert.equal(run(other, []).changed, false, "x is not declared, so sinx is a longer word");
  assert.equal(other.text, "sinx");
});

test("a declared symbol named pi stays letters, a declared Greek name still converts", () => {
  const pi = typed("pi");
  assert.equal(run(pi, ["pi"]).changed, false);
  assert.equal(pi.text, "pi");
  const theta = typed("theta");
  run(theta, ["theta"]);
  assert.equal(theta.text, "\\theta");
  const exp = typed("exp");
  assert.equal(run(exp, ["exp"]).changed, false, "a variable called exp is not the function");
});

test("pasted text converts each name and leaves the rest", () => {
  const field = typed("sin(kz)");
  run(field);
  assert.deepEqual(field.atoms, ["\\sin", "(", "k", "z", ")"]);
  assert.equal(field.position, 5, "the caret was at the end and stays at the end");
  const mixed = typed("kz+sin(z)+cos(theta)");
  run(mixed);
  assert.equal(mixed.text, "kz+\\sin(z)+\\cos(\\theta)");
});

test("a longer word is not touched, and neither is something already converted", () => {
  for (const word of ["tangent", "using", "cosine", "single", "thetax", "xsin", "asinb"]) {
    const field = typed(word);
    assert.equal(run(field).changed, false, word);
    assert.equal(field.text, word);
  }
  const done = new FakeField(["\\sin", "(", "x", ")"]);
  assert.equal(run(done).changed, false);
  const operator = new FakeField(["", "\\mathrm{s}", "\\mathrm{i}", "\\mathrm{n}", ""]);
  assert.equal(run(operator).changed, false, "letters inside an operator name are not plain letters");
});

test("it never converts twice", () => {
  const field = typed("sin(theta)");
  assert.equal(run(field).changed, true);
  const after = field.text;
  assert.equal(run(field).changed, false);
  assert.equal(field.text, after);
  assert.equal(after, "\\sin(\\theta)");
});

test("a name that a longer one starts with waits while it may still grow, then converts", () => {
  const field = typed("sin");
  const first = run(field, [], false);
  assert.deepEqual(first, { changed: false, pending: true });
  assert.equal(field.text, "sin");
  assert.equal(run(field, [], true).changed, true, "after a pause it is settled");
  assert.equal(field.text, "\\sin");
  const next = typed("sinh");
  assert.equal(run(next, [], false).changed, true, "sinh cannot grow, so it converts at once");
  assert.equal(next.text, "\\sinh");
  assert.equal(mayGrow("sin", []), true);
  assert.equal(mayGrow("theta", []), false);
  assert.equal(mayGrow("arcsin", []), true);
});

test("a name that is not at the caret converts at once, even if it could grow", () => {
  const field = typed("sin(x)");
  assert.equal(run(field, [], false).changed, true);
  assert.equal(field.text, "\\sin(x)");
  const mid = new FakeField(Array.from("sin+x"), 3);
  assert.equal(run(mid, [], false).changed, false, "the caret is right after sin, so it waits");
  assert.equal(run(new FakeField(Array.from("sin+x"), 5), [], false).changed, true);
});

test("log10 becomes base 10, and log alone becomes log", () => {
  const ten = typed("log10");
  run(ten);
  assert.equal(ten.text, "\\log_{10}");
  const bare = typed("log(x)");
  run(bare);
  assert.equal(bare.text, "\\log(x)");
  const hundred = typed("log100");
  run(hundred);
  assert.equal(hundred.text, "\\log100");
  const growing = typed("log1");
  assert.deepEqual(run(growing, [], false), { changed: false, pending: true });
});

test("the caret keeps its place when a name is converted before it or around it", () => {
  const before = new FakeField(Array.from("sin(x)+y"), 8);
  run(before);
  assert.equal(before.text, "\\sin(x)+y");
  assert.equal(before.position, before.atoms.length, "still at the end");
  const inside = new FakeField(Array.from("sin(x)+y"), 5);
  run(inside);
  assert.equal(inside.position, 3, "after (x, the same place with sin now one atom");
  const after = new FakeField(Array.from("a+theta"), 1);
  run(after);
  assert.equal(after.position, 1, "left of the name stays where it was");
});

test("a square root goes in with its slot, and the caret goes into the slot", () => {
  const field = typed("sqrt");
  run(field);
  assert.deepEqual(field.atoms, ["\\sqrt", "", ""]);
  assert.equal(field.position, 2);
});

test("a name on the object prototype is not a function", () => {
  for (const word of ["constructor", "toString", "valueOf"]) {
    assert.equal(planRun(word, []), null, word);
    assert.equal(run(typed(word)).changed, false, word);
  }
});

test("a group boundary between letters keeps them apart", () => {
  const field = new FakeField(["", "s", "i", "", "n", ""]);
  assert.equal(run(field).changed, false);
});
