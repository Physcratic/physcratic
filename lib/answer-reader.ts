// One reader for every typed expression or number answer on the site.
// It accepts LaTeX as MathLive writes it and the plain typing people use anyway, and turns both into a function
// that can be evaluated for a set of symbol values. It knows nothing about any problem, symbol or answer form.
//
// Conventions (also in docs/engineering/answer-checking.md):
// - `*`, `\cdot`, `\times` and writing two things next to each other all multiply. `/` and juxtaposition have the same
//   precedence and associate to the left, so `1/2 m v^2` is (1/2)·m·v² and `a/bc` is (a/b)·c.
// - `^` binds tighter than unary minus and is right-associative: -x^2 = -(x^2), 2^3^2 = 2^9.
// - A function without brackets takes the symbols written next to it: `sin kz` is sin(kz), `sin x cos x` is two functions.
// - `ln` is the natural logarithm. In a key, a bare `log` is also the natural logarithm. In a student's answer a bare `log` is refused,
//   and `\log_{10}`, `log10`, `log_10` and `log₁₀` are base 10. `e` and `pi` are constants unless the problem declares them as symbols.
// - Symbols are matched by name after folding spelling: `\theta_0`, `theta_0`, `θ_0` and `θ₀` are one symbol. The letter o
//   is not a zero.
// No dependency on the server, so the browser can use the same reader later.

export type Assumption = "positive" | "nonnegative" | "nonzero";
export type SymbolDecl = { name: string; assumptions?: readonly Assumption[]; min?: number; max?: number; aliases?: readonly string[] };
export type AngleUnit = "radians" | "degrees";

export class AnswerReadError extends Error {
  constructor(
    message: string,
    readonly kind: "syntax" | "symbol" | "limit",
    readonly symbol?: string,
    readonly suggestion?: string,
  ) {
    super(message);
  }
}

/** What a student sees for a bare log, and what a new key in Studio sees too. */
export const bareLogMessage = "Write ln for the natural log, or log₁₀ for base 10.";

/** `key` reads a bare log as ln, so saved keys keep their meaning. `answer` refuses it. */
export type LogRole = "key" | "answer";

export const readerLimits = Object.freeze({ characters: 1024, tokens: 400, nodes: 300, depth: 64, brackets: 16, rootIndex: 8 });

// ---------------------------------------------------------------------------------------------------------------------
// Names

const GREEK = [
  "alpha", "beta", "gamma", "delta", "epsilon", "varepsilon", "zeta", "eta", "theta", "vartheta", "iota", "kappa",
  "lambda", "mu", "nu", "xi", "omicron", "pi", "rho", "varrho", "sigma", "varsigma", "tau", "upsilon", "phi", "varphi",
  "chi", "psi", "omega", "Gamma", "Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma", "Upsilon", "Phi", "Psi", "Omega",
  "hbar", "ell",
];
const GREEK_SET = new Set(GREEK);
const GREEK_UNICODE: Record<string, string> = {
  α: "alpha", β: "beta", γ: "gamma", δ: "delta", ε: "epsilon", ζ: "zeta", η: "eta", θ: "theta", ι: "iota", κ: "kappa",
  λ: "lambda", μ: "mu", ν: "nu", ξ: "xi", π: "pi", ρ: "rho", σ: "sigma", ς: "varsigma", τ: "tau", υ: "upsilon", φ: "phi",
  χ: "chi", ψ: "psi", ω: "omega", ϑ: "vartheta", ϕ: "varphi", ϵ: "varepsilon", ħ: "hbar", ℏ: "hbar", ℓ: "ell",
  Γ: "Gamma", Δ: "Delta", Θ: "Theta", Λ: "Lambda", Ξ: "Xi", Π: "Pi", Σ: "Sigma", Φ: "Phi", Ψ: "Psi", Ω: "Omega",
};
const SUBSCRIPT_DIGITS = "₀₁₂₃₄₅₆₇₈₉";
const SUPERSCRIPT_DIGITS: Record<string, string> = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-" };
const FUNCTIONS: Record<string, string> = {
  sin: "sin", cos: "cos", tan: "tan", cot: "cot", sec: "sec", csc: "csc", sinh: "sinh", cosh: "cosh", tanh: "tanh",
  exp: "exp", ln: "ln", log: "ln", log10: "log10", abs: "abs", sqrt: "sqrt",
  arcsin: "asin", arccos: "acos", arctan: "atan", asin: "asin", acos: "acos", atan: "atan",
};
const FUNCTION_NAMES = Object.keys(FUNCTIONS).sort((a, b) => b.length - a.length);
const GREEK_DISPLAY: Record<string, string> = Object.fromEntries(Object.entries(GREEK_UNICODE).map(([glyph, name]) => [name, glyph]));

/** Replaces Unicode maths characters with their LaTeX or ASCII equivalent. */
function fold(text: string): string {
  let out = "";
  let superscript = false;
  for (const ch of text.normalize("NFC")) {
    const raised = SUPERSCRIPT_DIGITS[ch];
    if (raised) { out += (superscript ? "" : "^") + raised; superscript = true; continue; }
    superscript = false;
    if (GREEK_UNICODE[ch]) out += `\\${GREEK_UNICODE[ch]} `;
    else if (SUBSCRIPT_DIGITS.includes(ch)) out += `_${SUBSCRIPT_DIGITS.indexOf(ch)}`;
    else if (ch === "−" || ch === "–" || ch === "—" || ch === "﹣") out += "-";
    else if (ch === "×") out += "\\times ";
    else if (ch === "·" || ch === "⋅" || ch === "∙") out += "\\cdot ";
    else if (ch === "÷") out += "/";
    else if (ch === "√") out += "\\sqrt ";
    else if (ch === "\u00a0" || ch === "\u2009" || ch === "\u202f") out += " ";
    else out += ch;
  }
  return out;
}

/** Folds the spelling of a symbol so that every way of writing it gives one name, such as `theta_0`. */
export function normaliseName(raw: string): string {
  return fold(raw)
    .replace(/\\(?:mathrm|mathit|mathbf|text|operatorname)\b/g, "")
    .replace(/[\\{}\s$]/g, "");
}

const SUBSCRIPT_OUT = (digits: string) => [...digits].map((d) => SUBSCRIPT_DIGITS[Number(d)]).join("");
/** How a symbol is shown to the student: `theta_0` becomes θ₀. */
export function displayName(name: string): string {
  const [base, ...rest] = name.split("_");
  const shown = GREEK_DISPLAY[base] ?? base;
  const sub = rest.join("_");
  if (!sub) return shown;
  return /^\d+$/.test(sub) ? shown + SUBSCRIPT_OUT(sub) : `${shown}_${sub}`;
}

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const held = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = held;
    }
  }
  return row[b.length];
}
/** The declared name closest to a typed one, or undefined when none is close. */
export function nearestName(typed: string, declared: readonly string[]): string | undefined {
  // A bare letter that the problem only uses with a subscript: suggest the subscripted symbol.
  const subscripted = declared.filter((name) => name.startsWith(`${typed}_`)).sort((a, b) => a.length - b.length)[0];
  if (subscripted) return subscripted;
  if (typed.length < 3) return undefined;
  let best: string | undefined;
  let bestDistance = Infinity;
  for (const name of declared) {
    const distance = editDistance(typed, name);
    if (distance < bestDistance) { best = name; bestDistance = distance; }
  }
  const limit = typed.length >= 5 ? 2 : 1;
  return best !== undefined && bestDistance <= limit ? best : undefined;
}

// ---------------------------------------------------------------------------------------------------------------------
// Lexer

type Tok = TokBody & { src?: string };
type TokBody =
  | { k: "num"; v: number; lit?: boolean }
  | { k: "word"; s: string; cmd: boolean }
  | { k: "sub"; s: string; braced: boolean }
  | { k: "op"; s: "+" | "-" | "*" | "/" | "^" }
  | { k: "open"; s: "(" | "[" | "{" }
  | { k: "close"; s: ")" | "]" | "}" }
  | { k: "bar" }
  | { k: "cmd"; s: "frac" | "sqrt" };

const SPACING = /\\(?:left|right|displaystyle|textstyle|bigl|bigr|Bigl|Bigr|biggl|biggr|big|Big|bigg|Bigg|,|;|:|!| )/g;

function syntax(message = "This could not be read as a maths expression. Check the brackets, fractions and operators."): never {
  throw new AnswerReadError(message, "syntax");
}

/** LaTeX lets \frac take the next two characters when there are no brackets: \frac32 is \frac{3}{2}. */
function bracketFractions(text: string): string {
  let from = 0;
  for (;;) {
    const found = /\\[dt]?frac(?![A-Za-z])/.exec(text.slice(from));
    if (!found) return text;
    const start = from + found.index;
    let at = start + found[0].length;
    const args: string[] = [];
    for (let n = 0; n < 2; n++) {
      while (text[at] === " ") at++;
      if (text[at] === "{") {
        let depth = 0, end = at;
        for (; end < text.length; end++) {
          if (text[end] === "{") depth++;
          else if (text[end] === "}" && --depth === 0) break;
        }
        if (end >= text.length) return text;
        args.push(text.slice(at + 1, end));
        at = end + 1;
      } else if (text[at] === "\\") {
        const command = /^\\[A-Za-z]+/.exec(text.slice(at))?.[0];
        if (!command) return text;
        args.push(command);
        at += command.length;
      } else if (text[at] !== undefined && /[A-Za-z0-9]/.test(text[at])) {
        args.push(text[at]);
        at++;
      } else return text;
    }
    const replacement = `\\frac{${args[0]}}{${args[1]}}`;
    text = text.slice(0, start) + replacement + text.slice(at);
    from = start + 6;
  }
}

/** \log_{10}, log_10, log₁₀ and log10 all become the word log10. */
function baseTen(text: string): string {
  return text.replace(/(?:\\operatorname\{log\}|\\log|(?<![A-Za-z\\])log)\s*(?:_\s*\{\s*10\s*\}|_\s*10(?![0-9])|_1_0(?![0-9_]))/g, " log10 ");
}

function lex(input: string): Tok[] {
  const text = bracketFractions(baseTen(fold(input)).replace(/\$/g, "").replace(SPACING, " ").replace(/\*\*/g, "^").replace(/~/g, " "));
  if (/[^\x20-\x7e]/.test(text)) syntax("Use letters, digits and the symbols + - * / ^ ( ) only.");
  const out: Tok[] = [];
  let i = 0;
  let begin = 0;
  let last: Tok | null = null;
  let lastBegin = 0;
  const push = (token: Tok) => {
    // Each token keeps the text it was read from, so a message can quote the student's own symbols.
    if (last) last.src = text.slice(lastBegin, begin).trim();
    last = token;
    lastBegin = begin;
    out.push(token);
    if (out.length > readerLimits.tokens) throw new AnswerReadError("That answer is too long to check. Simplify it first.", "limit");
  };
  const braced = (open: number): [string, number] => {
    let depth = 0;
    for (let j = open; j < text.length; j++) {
      if (text[j] === "{") depth++;
      else if (text[j] === "}" && --depth === 0) return [text.slice(open + 1, j), j + 1];
    }
    return syntax("Close every curly bracket.");
  };
  while (i < text.length) {
    const ch = text[i];
    if (/\s/.test(ch)) { i++; continue; }
    begin = i;
    const number = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(text.slice(i));
    if (number) {
      const value = Number(number[0]);
      const digits = (text: string) => text.split(/[eE]/)[0].replace(".", "").replace(/^0+/, "").replace(/0+$/, "");
      const significant = digits(number[0]).length;
      // A number must survive binary64 exactly, or two different literals would silently become one value.
      const written = number[0].split(/[eE]/)[0].split(".")[0].replace(/^0+/, "").length;
      if (significant > 17 || written > 15 || (significant > 15 && digits(value.toExponential(significant - 1)) !== digits(number[0])))
        throw new AnswerReadError("That number has more digits than can be checked exactly. Use at most 15 significant digits.", "limit");
      if (!Number.isFinite(value)) syntax("That number is too large.");
      if (value === 0 && /[1-9]/.test(number[0].split(/[eE]/)[0])) syntax("That number is too small to use.");
      push({ k: "num", v: value, lit: true });
      i += number[0].length;
      continue;
    }
    if (/[A-Za-z]/.test(ch)) {
      const word = /^[A-Za-z][A-Za-z0-9]*/.exec(text.slice(i))![0];
      push({ k: "word", s: word, cmd: false });
      i += word.length;
      continue;
    }
    if (ch === "\\") {
      const name = /^\\([A-Za-z]+)/.exec(text.slice(i))?.[1];
      if (!name) syntax("A backslash must start a LaTeX command such as \\frac.");
      i += name!.length + 1;
      if (name === "frac" || name === "dfrac" || name === "tfrac") push({ k: "cmd", s: "frac" });
      else if (name === "sqrt") push({ k: "cmd", s: "sqrt" });
      else if (name === "cdot" || name === "times") push({ k: "op", s: "*" });
      else if (name === "div") push({ k: "op", s: "/" });
      else if (name === "lvert" || name === "rvert" || name === "vert") push({ k: "bar" });
      else if (name === "operatorname" || name === "mathrm" || name === "mathit" || name === "mathbf" || name === "text") {
        let j = i;
        while (text[j] === " ") j++;
        if (text[j] !== "{") syntax(`Write the name after \\${name} in curly brackets.`);
        const [content, end] = braced(j);
        const folded = normaliseName(content);
        if (!/^[A-Za-z][A-Za-z0-9]*$/.test(folded)) syntax(`\\${name} must hold a name.`);
        push({ k: "word", s: folded, cmd: false });
        i = end;
      } else if (name === "infty") throw new AnswerReadError("Infinity can't be used in this answer.", "syntax");
      else if (GREEK_SET.has(name!) || FUNCTIONS[name!]) push({ k: "word", s: name!, cmd: true });
      else throw new AnswerReadError(`The LaTeX command \\${name} is not supported. Use ordinary arithmetic, fractions, roots and functions.`, "syntax");
      continue;
    }
    if (ch === "_") {
      i++;
      while (text[i] === " ") i++;
      if (text[i] === "{") {
        const [content, end] = braced(i);
        const folded = normaliseName(content);
        if (!folded) syntax("A subscript can't be empty.");
        push({ k: "sub", s: folded, braced: true });
        i = end;
      } else {
        const run = /^[A-Za-z0-9]+/.exec(text.slice(i))?.[0];
        if (!run) syntax("A subscript can't be empty.");
        push({ k: "sub", s: run!, braced: false });
        i += run!.length;
      }
      continue;
    }
    if (ch === "+" || ch === "-" || ch === "*" || ch === "/" || ch === "^") push({ k: "op", s: ch });
    else if (ch === "(" || ch === "[" || ch === "{") push({ k: "open", s: ch });
    else if (ch === ")" || ch === "]" || ch === "}") push({ k: "close", s: ch });
    else if (ch === "|") push({ k: "bar" });
    else if (ch === "=" ) syntax("Enter the result only, without an equals sign.");
    else if (ch === ",") syntax("Use a full stop for decimals and don't use commas.");
    else syntax(`The character ${ch} can't be used in an answer.`);
    i++;
  }
  if (last) (last as Tok).src = text.slice(lastBegin).trim();
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// Symbol resolution

type Atom =
  | { k: "num"; v: number; lit?: boolean }
  | { k: "sym"; i: number }
  | { k: "fn"; s: string }
  | { k: "op"; s: "+" | "-" | "*" | "/" | "^" }
  | { k: "open"; s: "(" | "[" | "{" }
  | { k: "close"; s: ")" | "]" | "}" }
  | { k: "bar" }
  | { k: "cmd"; s: "frac" | "sqrt" };

/** The symbols a reading refers to, in index order. Open tables grow when an unknown name is met. */
export class SymbolTable {
  readonly names: string[];
  private readonly aliases = new Map<string, string>();
  /** `aliases` maps another way of writing a symbol to its declared name, such as `u` for `\mu`. */
  constructor(names: readonly string[] = [], readonly open = false, aliases: Record<string, readonly string[]> = {}) {
    this.names = names.map(normaliseName);
    for (const [name, others] of Object.entries(aliases)) for (const other of others) this.aliases.set(normaliseName(other), normaliseName(name));
  }
  /** Every spelling the reader should recognise: the symbols and their aliases. */
  get known(): string[] { return [...this.names, ...this.aliases.keys()]; }
  index(name: string): number { return this.names.indexOf(this.aliases.get(name) ?? name); }
  add(name: string): number {
    const found = this.index(name);
    if (found >= 0) return found;
    this.names.push(name);
    return this.names.length - 1;
  }
}

type Piece = ({ t: "sym"; name: string } | { t: "fn"; s: string } | { t: "const"; v: number } | { t: "num"; v: number } | { t: "unknown"; s: string }) & { text: string };

function unknownSymbol(name: string, table: SymbolTable): never {
  const shown = displayName(name);
  const near = nearestName(name, table.names);
  if (near) throw new AnswerReadError(`${shown} isn't used here. Did you mean ${displayName(near)}?`, "symbol", name, near);
  const listed = table.names.slice(0, 8).map(displayName);
  const tail = listed.length ? ` Use ${listed.join(", ")}${table.names.length > 8 ? " and the others listed" : ""}.` : " This part takes a number.";
  throw new AnswerReadError(`${shown} isn't used here.${tail}`, "symbol", name);
}

/** Splits a run of letters and digits into symbols, functions and constants, using the fewest pieces. */
function splitWord(word: string, table: SymbolTable, forbidFunctions = false): Piece[] {
  const declared = table.known.filter((name) => !name.includes("_")).sort((a, b) => b.length - a.length);
  const declaredAll = new Set(table.known);
  const n = word.length;
  type Cell = { cost: number; pieces: Piece[] } | null;
  const best: Cell[] = Array.from({ length: n + 1 }, () => null);
  best[0] = { cost: 0, pieces: [] };
  const relax = (from: number, to: number, piece: Piece, cost: number) => {
    const base = best[from];
    if (!base) return;
    const total = base.cost + cost;
    if (!best[to] || total < best[to]!.cost) best[to] = { cost: total, pieces: [...base.pieces, piece] };
  };
  for (let p = 0; p < n; p++) {
    if (!best[p]) continue;
    const digits = /^\d+/.exec(word.slice(p))?.[0];
    if (digits) { relax(p, p + digits.length, { t: "num", v: Number(digits), text: digits }, 1); continue; }
    for (const name of declared) if (word.startsWith(name, p)) relax(p, p + name.length, { t: "sym", name, text: name }, 1);
    if (!forbidFunctions) for (const fn of FUNCTION_NAMES) if (word.startsWith(fn, p)) relax(p, p + fn.length, { t: "fn", s: FUNCTIONS[fn], text: fn }, 1.001);
    if (word.startsWith("pi", p) && !declaredAll.has("pi")) relax(p, p + 2, { t: "const", v: Math.PI, text: "pi" }, 1.002);
    if (word[p] === "e" && !declaredAll.has("e")) relax(p, p + 1, { t: "const", v: Math.E, text: "e" }, 1.002);
    // An unknown letter, charged heavily so a full reading is always preferred.
    relax(p, p + 1, { t: "unknown", s: word[p], text: word[p] }, 100);
  }
  return best[n]!.pieces;
}

function resolve(tokens: Tok[], table: SymbolTable, role: LogRole = "key"): { atoms: Atom[]; srcs: string[] } {
  const bareLog = () => { if (role === "answer") throw new AnswerReadError(bareLogMessage, "syntax"); };
  const atoms: Atom[] = [];
  const srcs: string[] = [];
  const out = { push: (atom: Atom, src = "") => { atoms.push(atom); srcs.push(src); } };
  const queue = [...tokens];
  const symbolAtom = (name: string): Atom => {
    const index = table.index(name);
    if (index >= 0) return { k: "sym", i: index };
    if (table.open) return { k: "sym", i: table.add(name) };
    return unknownSymbol(name, table);
  };
  const emit = (pieces: Piece[]) => {
    for (const piece of pieces) {
      if (piece.t === "sym") out.push(symbolAtom(piece.name), piece.text);
      else if (piece.t === "fn") { if (piece.text === "log") bareLog(); out.push({ k: "fn", s: piece.s }, piece.text); }
      else if (piece.t === "const") out.push({ k: "num", v: piece.v }, piece.text);
      else if (piece.t === "num") out.push({ k: "num", v: piece.v }, piece.text);
      else out.push(symbolAtom(piece.s), piece.text);
    }
  };
  while (queue.length) {
    const token = queue.shift()!;
    if (token.k !== "word") {
      if (token.k === "sub") syntax("A subscript must follow a letter, such as r_0.");
      out.push(token as Atom, token.src ?? "");
      continue;
    }
    // A command or word with no subscript.
    if (queue[0]?.k !== "sub") {
      if (token.cmd) {
        if (FUNCTIONS[token.s]) { if (token.s === "log") bareLog(); out.push({ k: "fn", s: FUNCTIONS[token.s] }, token.src ?? token.s); }
        else if (token.s === "pi" && table.index("pi") < 0) out.push({ k: "num", v: Math.PI }, token.src ?? token.s);
        else out.push(symbolAtom(token.s), token.src ?? token.s);
        continue;
      }
      const pieces = splitWord(token.s, table);
      const unknown = pieces.filter((p) => p.t === "unknown");
      if (unknown.length && !table.open) {
        // Name the word when it is one unknown name (theta, rho), otherwise the first unknown letter.
        if (unknown.length === token.s.length && token.s.length >= 3) unknownSymbol(token.s, table);
        if (GREEK_SET.has(token.s)) unknownSymbol(token.s, table);
        unknownSymbol((unknown[0] as { s: string }).s, table);
      }
      if (unknown.length && table.open && GREEK_SET.has(token.s)) { out.push(symbolAtom(token.s), token.s); continue; }
      emit(pieces);
      continue;
    }
    // A word followed by a subscript: the subscript belongs to its last piece.
    const sub = queue.shift() as Extract<Tok, { k: "sub" }>;
    const declaredWithSub = (base: string, subscript: string) => table.index(`${base}_${subscript}`) >= 0;
    let subscript = sub.s;
    let matched: { base: string; head: string } | null = null;
    const tryMatch = (subText: string): boolean => {
      // The last piece is the longest suffix of the word that is a declared base with this subscript.
      for (let q = 0; q < token.s.length; q++) {
        const base = token.s.slice(q);
        if (declaredWithSub(base, subText) && (token.cmd ? q === 0 : true)) { matched = { base, head: token.s.slice(0, q) }; return true; }
      }
      return false;
    };
    if (sub.braced) tryMatch(subscript);
    else {
      for (let len = subscript.length; len >= 1; len--) {
        if (tryMatch(subscript.slice(0, len))) {
          const rest = subscript.slice(len);
          if (rest) {
            // The rest of an unbraced subscript is written next to it, so it starts a new word.
            queue.unshift({ k: "word", s: rest, cmd: false });
          }
          subscript = subscript.slice(0, len);
          break;
        }
      }
    }
    if (matched) {
      const { base, head } = matched as { base: string; head: string };
      if (head) emit(splitWord(head, table));
      out.push({ k: "sym", i: table.index(`${base}_${subscript}`) }, `${token.cmd ? "\\" : ""}${base}_${subscript}`);
      continue;
    }
    // No declared symbol fits. In an open table the subscripted name is created, otherwise it is named in the error.
    const lastGreek = GREEK.filter((g) => token.s.endsWith(g)).sort((a, b) => b.length - a.length)[0];
    const base = token.cmd ? token.s : (lastGreek ?? token.s[token.s.length - 1]);
    const head = token.cmd ? "" : token.s.slice(0, token.s.length - base.length);
    const name = `${base}_${sub.s}`;
    if (table.open) {
      if (head) emit(splitWord(head, table));
      out.push({ k: "sym", i: table.add(name) }, `${token.cmd ? "" : head}${name}`.replace(/^$/, name));
      continue;
    }
    unknownSymbol(name, table);
  }
  return { atoms, srcs };
}

// ---------------------------------------------------------------------------------------------------------------------
// Parser

export type ExprNode =
  | { t: "num"; v: number; lit?: boolean }
  | { t: "sym"; i: number }
  | { t: "neg"; a: ExprNode }
  | { t: "bin"; op: "+" | "-" | "*" | "/" | "^"; a: ExprNode; b: ExprNode }
  | { t: "fn"; f: string; a: ExprNode }
  | { t: "root"; a: ExprNode; n: ExprNode };
type Node = ExprNode;

function parse(atoms: Atom[], srcs: string[]): Node {
  let position = 0;
  let nodes = 0;
  let depth = 0;
  let barDepth = 0;
  const peek = () => atoms[position];
  const make = <T extends Node>(node: T): T => {
    if (++nodes > readerLimits.nodes) throw new AnswerReadError("That answer is too long to check. Simplify it first.", "limit");
    return node;
  };
  const enter = () => {
    if (++depth > readerLimits.depth) throw new AnswerReadError("That answer has too many nested brackets. Simplify it first.", "limit");
  };
  const leave = () => { depth--; };
  const startsAtom = (atom: Atom | undefined) =>
    !!atom && (atom.k === "num" || atom.k === "sym" || atom.k === "fn" || atom.k === "cmd" || (atom.k === "open") || (atom.k === "bar" && barDepth === 0));

  function sum(): Node {
    enter();
    let left = product();
    for (let a = peek(); a?.k === "op" && (a.s === "+" || a.s === "-"); a = peek()) {
      position++;
      left = make({ t: "bin", op: a.s as "+" | "-", a: left, b: product() });
    }
    leave();
    return left;
  }
  const quote = (from: number, to: number) => srcs.slice(from, to).join("");
  /** A number on its own, ignoring a leading sign. */
  const isLiteral = (from: number, to: number) => {
    const items = atoms.slice(from, to).filter((atom, index) => !(index === 0 && atom.k === "op" && (atom.s === "-" || atom.s === "+")));
    return items.length === 1 && items[0].k === "num" && !!items[0].lit;
  };
  /**
   * `a/bc` can mean a/(bc) or (a/b)c, so it is refused with both readings. A divisor in brackets or a fraction of plain
   * numbers before symbols (1/2 m v^2) is clear and stays as it is read: left to right.
   */
  function refuseAmbiguousDivision(termStart: number, runStart: number, slash: number, divisorStart: number, divisorEnd: number) {
    if (!startsAtom(peek())) return;
    let first = divisorStart;
    while (atoms[first]?.k === "op") first++;
    const head = atoms[first];
    if (!head || head.k === "open" || head.k === "cmd") return;
    const dividendFrom = runStart < slash ? runStart : termStart;
    if (isLiteral(dividendFrom, slash) && isLiteral(divisorStart, divisorEnd)) return;
    const restStart = position;
    while (startsAtom(peek())) power();
    const dividend = quote(termStart, slash), divisor = quote(divisorStart, divisorEnd), rest = quote(restStart, position);
    syntax(`Add brackets: ${dividend}/(${divisor}${rest}) or (${dividend}/${divisor})${rest}.`);
  }
  function product(): Node {
    const termStart = position;
    let runStart = position;
    let left = unary();
    for (;;) {
      const a = peek();
      if (a?.k === "op" && (a.s === "*" || a.s === "/")) {
        const slash = position;
        position++;
        const divisorStart = position;
        const right = unary();
        if (a.s === "/") refuseAmbiguousDivision(termStart, runStart, slash, divisorStart, position);
        left = make({ t: "bin", op: a.s, a: left, b: right });
        // After a *, the factor that follows starts a new run. After a /, the whole left side is the dividend of the next /.
        runStart = a.s === "*" ? divisorStart : position;
      } else if (startsAtom(a)) {
        const before = atoms[position - 1];
        if (before?.k === "num" && before.lit && a?.k === "num" && a.lit) syntax("Two numbers next to each other. Put a * or a full stop between them.");
        left = make({ t: "bin", op: "*", a: left, b: power() });
      } else return left;
    }
  }
  function unary(): Node {
    const a = peek();
    if (a?.k === "op" && (a.s === "-" || a.s === "+")) {
      position++;
      enter();
      const inner = unary();
      leave();
      return a.s === "-" ? make({ t: "neg", a: inner }) : inner;
    }
    return power();
  }
  function exponent(): Node {
    const a = peek();
    if (a?.k === "op" && (a.s === "-" || a.s === "+")) {
      position++;
      enter();
      const inner = exponent();
      leave();
      return a.s === "-" ? make({ t: "neg", a: inner }) : inner;
    }
    return power();
  }
  function power(): Node {
    const base = atom();
    const a = peek();
    if (a?.k === "op" && a.s === "^") {
      position++;
      enter();
      const exp = exponent();
      leave();
      return make({ t: "bin", op: "^", a: base, b: exp });
    }
    return base;
  }
  let brackets = 0;
  function group(close: ")" | "]" | "}"): Node {
    if (++brackets > readerLimits.brackets) throw new AnswerReadError("That answer has too many nested brackets. Simplify it first.", "limit");
    const inner = sum();
    brackets--;
    const end = peek();
    if (end?.k !== "close" || end.s !== close) syntax("Close every bracket you open.");
    position++;
    return inner;
  }
  function braced(what: string): Node {
    const a = peek();
    if (a?.k !== "open" || a.s !== "{") syntax(`${what} needs curly brackets, such as \\frac{1}{2}.`);
    position++;
    return group("}");
  }
  function run(): Node {
    // An unbracketed function argument: the things written next to the function, up to the next function or operator.
    let left = power();
    while (startsAtom(peek()) && peek()?.k !== "fn") left = make({ t: "bin", op: "*", a: left, b: power() });
    return left;
  }
  function atom(): Node {
    const a = atoms[position++];
    if (!a) return syntax("The answer stops too soon. Something is missing after the last operator.");
    enter();
    try {
      if (a.k === "num") return make({ t: "num", v: a.v, lit: a.lit });
      if (a.k === "sym") return make({ t: "sym", i: a.i });
      if (a.k === "open") return group(a.s === "(" ? ")" : a.s === "[" ? "]" : "}");
      if (a.k === "bar") {
        barDepth++;
        const inner = sum();
        barDepth--;
        if (peek()?.k !== "bar") syntax("Close the absolute value bars.");
        position++;
        return make({ t: "fn", f: "abs", a: inner });
      }
      if (a.k === "cmd" && a.s === "frac") {
        const top = braced("A fraction");
        const bottom = braced("A fraction");
        return make({ t: "bin", op: "/", a: top, b: bottom });
      }
      if (a.k === "cmd" && a.s === "sqrt") {
        let index: Node | null = null;
        const next = peek();
        if (next?.k === "open" && next.s === "[") { position++; index = group("]"); }
        const arg = peek()?.k === "open" ? atom() : atomOnly();
        if (index && index.t === "num" && !(Number.isInteger(index.v) && index.v >= 2 && index.v <= readerLimits.rootIndex)) syntax(`Use a root index between 2 and ${readerLimits.rootIndex}.`);
        return index ? make({ t: "root", a: arg, n: index }) : make({ t: "fn", f: "sqrt", a: arg });
      }
      if (a.k === "fn") {
        let pre: Node | null = null;
        const caret = peek();
        if (caret?.k === "op" && caret.s === "^") {
          position++;
          pre = exponent();
          if (pre.t === "neg" && pre.a.t === "num" && pre.a.v === 1) syntax("Write arcsin, arccos or arctan for an inverse function.");
        }
        const next = peek();
        let arg: Node;
        if (a.s === "sqrt") arg = next?.k === "open" ? atom() : atomOnly();
        else if (next?.k === "open" && next.s !== "{") arg = atom();
        else if (!startsAtom(next) || next?.k === "fn") return syntax(`${a.s} needs something to work on, such as ${a.s}(x).`);
        else arg = run();
        const call = make({ t: "fn", f: a.s, a: arg });
        return pre ? make({ t: "bin", op: "^", a: call, b: pre }) : call;
      }
      return syntax();
    } finally {
      leave();
    }
  }
  function atomOnly(): Node {
    const next = peek();
    if (!next || (next.k !== "num" && next.k !== "sym")) return syntax("A root needs something under it, such as sqrt(x).");
    return atom();
  }

  const tree = sum();
  if (position < atoms.length) syntax("Check the brackets and operators. Part of the answer could not be used.");
  return tree;
}

// ---------------------------------------------------------------------------------------------------------------------
// Evaluation

export type Evaluator = (values: readonly number[]) => number;

function compile(node: Node, angle: AngleUnit): Evaluator {
  const toRadians = angle === "degrees" ? (x: number) => (x * Math.PI) / 180 : (x: number) => x;
  const fromRadians = angle === "degrees" ? (x: number) => (x * 180) / Math.PI : (x: number) => x;
  const functions: Record<string, (x: number) => number> = {
    sin: (x) => Math.sin(toRadians(x)), cos: (x) => Math.cos(toRadians(x)), tan: (x) => Math.tan(toRadians(x)),
    cot: (x) => 1 / Math.tan(toRadians(x)), sec: (x) => 1 / Math.cos(toRadians(x)), csc: (x) => 1 / Math.sin(toRadians(x)),
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, exp: Math.exp, ln: Math.log, log10: Math.log10, abs: Math.abs, sqrt: Math.sqrt,
    asin: (x) => fromRadians(Math.asin(x)), acos: (x) => fromRadians(Math.acos(x)), atan: (x) => fromRadians(Math.atan(x)),
  };
  const build = (n: Node): Evaluator => {
    switch (n.t) {
      case "num": { const v = n.v; return () => v; }
      case "sym": { const i = n.i; return (values) => values[i]; }
      case "neg": { const a = build(n.a); return (values) => -a(values); }
      case "fn": { const a = build(n.a); const f = functions[n.f]; return (values) => f(a(values)); }
      case "root": {
        const a = build(n.a), index = build(n.n);
        return (values) => {
          const x = a(values), r = index(values);
          if (!Number.isInteger(r) || r < 2 || r > readerLimits.rootIndex) return NaN;
          if (x < 0) return r % 2 === 1 ? -Math.pow(-x, 1 / r) : NaN;
          return Math.pow(x, 1 / r);
        };
      }
      case "bin": {
        const a = build(n.a), b = build(n.b);
        switch (n.op) {
          case "+": return (values) => a(values) + b(values);
          case "-": return (values) => a(values) - b(values);
          // A nonzero result that rounds to zero is treated as undefined, so tiny products can't pass as zero.
          case "*": return (values) => { const x = a(values), y = b(values), r = x * y; return r === 0 && x !== 0 && y !== 0 ? NaN : r; };
          case "/": return (values) => { const x = a(values), y = b(values), r = x / y; return r === 0 && x !== 0 ? NaN : r; };
          default: return (values) => { const x = a(values), y = b(values), r = Math.pow(x, y); return (x === 0 && y === 0) || (r === 0 && x !== 0) ? NaN : r; };
        }
      }
    }
  };
  return build(node);
}

export type Reading = { evaluate: Evaluator; symbols: readonly string[] };

/** Reads an answer or a reference. An open table grows with the symbols the text uses. */
export function readExpression(
  text: string,
  table: SymbolTable,
  options: { angleUnit?: AngleUnit; maxCharacters?: number; logRole?: LogRole } = {},
): Reading {
  const tree = readTree(text, table, options);
  return { evaluate: compile(tree, options.angleUnit ?? "radians"), symbols: table.names };
}

/** The parsed expression, for tools and tests that rewrite or print it. */
export function readTree(text: string, table: SymbolTable, options: { maxCharacters?: number; logRole?: LogRole } = {}): ExprNode {
  const limit = options.maxCharacters ?? readerLimits.characters;
  if (!text.trim()) syntax("Enter an answer first.");
  if (text.length > limit) throw new AnswerReadError(`Enter an answer of at most ${limit} characters.`, "limit");
  const { atoms, srcs } = resolve(lex(text), table, options.logRole);
  return parse(atoms, srcs);
}

/** Reads a number such as 4.9, 3e8, 3×10^8, \frac{1}{2} or \sqrt{13}. Symbols are not allowed. */
export function readNumber(text: string, options: { angleUnit?: AngleUnit; maxCharacters?: number } = {}): number {
  const reading = readExpression(text, new SymbolTable([]), options);
  const value = reading.evaluate([]);
  if (!Number.isFinite(value)) throw new AnswerReadError("That does not give a finite number.", "syntax");
  return value;
}
