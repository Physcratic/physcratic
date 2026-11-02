export interface CopyProblem {
  rule: string;
  match: string;
  index: number;
}

const CHARACTERS: { rule: string; pattern: RegExp }[] = [
  { rule: "em dash", pattern: /—/g },
  { rule: "en dash", pattern: /–/g },
  { rule: "semicolon", pattern: /;/g },
];

const PHRASES = [
  "delve",
  "unlock",
  "elevate",
  "in today's",
  "journey",
  "game-changer",
  "seamless",
  "dive into",
  "look no further",
];

/** Flags the copy rules in CONTRIBUTING.md plus a list of filler phrases. */
export function findCopyProblems(text: string): CopyProblem[] {
  const problems: CopyProblem[] = [];
  for (const { rule, pattern } of CHARACTERS) {
    for (const m of text.matchAll(pattern)) {
      problems.push({ rule, match: m[0], index: m.index ?? 0 });
    }
  }
  // Curly apostrophes become straight ones and case is ignored, same length.
  const folded = text.replace(/’/g, "'").toLowerCase();
  for (const phrase of PHRASES) {
    let from = 0;
    for (;;) {
      const at = folded.indexOf(phrase, from);
      if (at === -1) break;
      problems.push({
        rule: `phrase "${phrase}"`,
        match: text.slice(at, at + phrase.length),
        index: at,
      });
      from = at + phrase.length;
    }
  }
  return problems.sort((a, b) => a.index - b.index);
}
