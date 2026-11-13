// Turns plain letters that spell a function or a Greek name into the command, by looking at what the field holds after an
// input. It does not depend on key presses, so it works for one letter at a time, autocomplete, predictive text, paste and
// dictation, and for phone keyboards that send text without keys. The key shortcuts on desktop stay as they are.
import { normaliseName } from "@/lib/answer-reader";
import { shortcutsFor } from "./math-typing";

/** The part of a MathLive field this needs. Offsets count atoms, and a plain letter is one atom that reads as that letter. */
export interface ConvertibleField {
  readonly lastOffset: number;
  position: number;
  selection: { ranges: [number, number][]; direction?: "forward" | "backward" | "none" } | number;
  getValue(start: number, end: number, format: "latex"): string;
  insert(latex: string, options: Record<string, unknown>): boolean;
}

type Table = Record<string, string>;
const letter = /^[A-Za-z]$/;
const digit = /^\d$/;
const has = (table: Table, word: string) => Object.prototype.hasOwnProperty.call(table, word);
const cache = new Map<string, Table>();

/** Names that turn into maths for these declared symbols. A declared Greek name still turns into its letter. */
export function nameTable(declared: readonly string[]): Table {
  const key = declared.join("\u0000");
  let table = cache.get(key);
  if (!table) {
    table = shortcutsFor({}, declared) as Table;
    if (cache.size > 50) cache.clear();
    cache.set(key, table);
  }
  return table;
}

/** Declared symbols that are plain letters, so they can sit next to a function name, as the x in sinx. */
function passThrough(declared: readonly string[], table: Table): Set<string> {
  const names = new Set<string>();
  for (const raw of declared) {
    const name = normaliseName(raw);
    if (name && /^[A-Za-z]+$/.test(name) && !has(table, name)) names.add(name);
  }
  return names;
}

export interface NameToken {
  start: number;
  end: number;
  name: string;
}

/**
 * Splits one run of letters into function and Greek names and declared symbols, with the fewest pieces. Returns the names
 * (with where they sit in the run) or null when the run is not made only of those, which makes it a longer word or a
 * symbol of its own, and it is left alone.
 */
export function planRun(run: string, declared: readonly string[]): NameToken[] | null {
  const table = nameTable(declared);
  if (has(table, run)) return [{ start: 0, end: run.length, name: run }];
  const symbols = passThrough(declared, table);
  if (symbols.has(run)) return null;
  const best: ({ pieces: number; cut: number; name: string | null } | null)[] = Array(run.length + 1).fill(null);
  best[0] = { pieces: 0, cut: 0, name: null };
  for (let end = 1; end <= run.length; end++) {
    for (let start = 0; start < end; start++) {
      const from = best[start];
      if (!from) continue;
      const word = run.slice(start, end);
      const isName = has(table, word);
      if (!isName && !symbols.has(word)) continue;
      const pieces = from.pieces + 1;
      const now = best[end];
      // Fewest pieces, then the longer last piece.
      if (!now || pieces < now.pieces || (pieces === now.pieces && start < now.cut)) best[end] = { pieces, cut: start, name: isName ? word : null };
    }
  }
  if (!best[run.length]) return null;
  const tokens: NameToken[] = [];
  for (let end = run.length; end > 0; ) {
    const step = best[end]!;
    if (step.name) tokens.unshift({ start: step.cut, end, name: step.name });
    end = step.cut;
  }
  return tokens.length > 0 ? tokens : null;
}

/** A name that a longer name starts with (sin and sinh, log and log10), so one more letter may still be coming. */
export function mayGrow(text: string, declared: readonly string[]): boolean {
  const table = nameTable(declared);
  return Object.keys(table).some((name) => name.length > text.length && name.startsWith(text));
}

interface Replacement {
  start: number;
  end: number;
  latex: string;
  /** The caret was just after this run, so what it spells may still be growing. */
  atCaret: boolean;
  name: string;
}

export interface ConvertResult {
  changed: boolean;
  /** A name at the caret that could still become a longer one. Ask again after a pause, or when typing moves on. */
  pending: boolean;
}

/** The atoms are read this far back from the end. Longer fields are rare, and an answer is a short expression. */
const WINDOW = 600;

/**
 * Looks at the atoms of the field and replaces each run of plain letters that spells a function or Greek name with its
 * command. A run that is part of a longer word, or is a declared symbol, is left. With `settled` false, a name at the caret
 * that a longer name starts with (sin, as sinh may follow) is left for now and reported as pending.
 */
export function convertPlainNames(field: ConvertibleField, declared: readonly string[], settled: boolean): ConvertResult {
  const none: ConvertResult = { changed: false, pending: false };
  const caret = field.position;
  const last = field.lastOffset;
  const first = Math.max(0, last - WINDOW);
  const atoms: string[] = [];
  for (let offset = first; offset < last; offset++) atoms.push(field.getValue(offset, offset + 1, "latex"));
  const table = nameTable(declared);

  const plan: Replacement[] = [];
  let pending = false;
  for (let i = 0; i < atoms.length; ) {
    if (!letter.test(atoms[i])) { i++; continue; }
    let j = i;
    while (j < atoms.length && letter.test(atoms[j])) j++;
    // The run is the atoms i to j. Check that it reads as plain letters in one piece, with no group between them.
    const start = first + i;
    let end = first + j;
    const run = atoms.slice(i, j).join("");
    if (field.getValue(start, end, "latex") !== run) { i = j; continue; }
    // log10 is written as log, then a 1 and a 0 and no other digit.
    let spelled = run;
    if (run.endsWith("log") && atoms[j] === "1") {
      if (atoms[j + 1] === "0" && !digit.test(atoms[j + 2] ?? "")) {
        spelled = `${run}10`;
        end += 2;
        j += 2;
      } else if (atoms[j + 1] === undefined && end + 1 === caret) {
        // log1 at the caret: the 0 may be next.
        if (!settled) pending = true;
        i = j;
        continue;
      }
    }
    const tokens = planRun(spelled, declared);
    const caretHere = caret === end;
    if (tokens) {
      for (const token of tokens) {
        const lastToken = token.end === spelled.length;
        if (lastToken && caretHere && !settled && mayGrow(token.name, declared)) { pending = true; continue; }
        plan.push({
          start: start + token.start,
          end: start + token.end,
          latex: table[token.name],
          atCaret: lastToken && caretHere,
          name: token.name,
        });
      }
    }
    i = j;
  }
  if (plan.length === 0) return { ...none, pending };

  // Right to left, so the offsets of the runs still to do stay right.
  let where = caret;
  plan.sort((a, b) => b.start - a.start);
  for (const item of plan) {
    const before = field.lastOffset;
    field.selection = { ranges: [[item.start, item.end]], direction: "forward" };
    // A square root keeps its empty slot, and the caret goes into it, when it is the name just typed.
    const intoSlot = item.atCaret && item.latex.includes("#?");
    field.insert(item.latex, {
      format: "latex",
      insertionMode: "replaceSelection",
      selectionMode: intoSlot ? "placeholder" : "after",
      focus: false,
      feedback: false,
      scrollIntoView: false,
    });
    const shift = field.lastOffset - before;
    if (intoSlot) where = field.position;
    else if (where >= item.end) where += shift;
    else if (where > item.start) where = item.start + (item.end - item.start) + shift;
  }
  field.position = Math.max(0, Math.min(where, field.lastOffset));
  return { changed: true, pending };
}
