// Typing in a maths field: names turn into maths as you type (sin, theta, pi, sqrt), and \ starts a LaTeX command that
// finishes on Space, Enter or Tab. Pure helpers, so the table can be tested without a browser.
import { normaliseName } from "@/lib/answer-reader";

type Shortcut = string | { after?: string; value: string };

const plain = ["sin", "cos", "tan", "sec", "csc", "cot", "sinh", "cosh", "tanh", "coth", "arcsin", "arccos", "arctan", "ln", "log", "exp"];
// No LaTeX command for these, so they are written as operator names.
const named = ["sech", "csch", "arccot", "arcsec", "arccsc", "arsinh", "arcosh", "artanh", "arcsinh", "arccosh", "arctanh"];
const greekLower = [
  "alpha", "beta", "gamma", "delta", "zeta", "eta", "theta", "iota", "kappa", "lambda", "mu", "nu", "xi", "rho", "sigma", "tau", "upsilon", "chi", "psi", "omega",
];
const greekUpper = ["Gamma", "Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma", "Upsilon", "Phi", "Psi", "Omega"];

/** Names that turn into maths. Where a Greek letter has two shapes, the one the Math Pad shows. */
export const typingShortcuts: Record<string, string> = {
  ...Object.fromEntries(plain.map((name) => [name, `\\${name}`])),
  ...Object.fromEntries(named.map((name) => [name, `\\operatorname{${name}}`])),
  ...Object.fromEntries([...greekLower, ...greekUpper].map((name) => [name, `\\${name}`])),
  epsilon: "\\varepsilon",
  phi: "\\varphi",
  pi: "\\pi",
  infinity: "\\infty",
  // log stays a bare \log. Only a written 10 makes it base 10.
  log10: "\\log_{10}",
  sqrt: "\\sqrt{#?}",
};

const isGreek = (name: string) => greekLower.includes(name) || greekUpper.includes(name) || ["epsilon", "phi"].includes(name);

/**
 * MathLive's own shortcuts with ours on top, minus any name the problem declares as a symbol. A declared Greek name
 * (rho, theta) still turns into its letter, because that letter is the symbol. pi and the function names do not: a
 * variable called pi or exp stays the letters you typed.
 */
export function shortcutsFor(defaults: Record<string, Shortcut>, declared: readonly string[]): Record<string, Shortcut> {
  const table: Record<string, Shortcut> = { ...defaults, ...typingShortcuts };
  for (const raw of declared) {
    const name = normaliseName(raw);
    if (!name) continue;
    if (isGreek(name) && name !== "pi") continue;
    delete table[name];
  }
  return table;
}
