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

/** Banned words, matched as whole words (and their endings) so "aircraft" and "Wentworth" pass. */
const WORDS: { word: string; pattern: RegExp }[] = [
  { word: "elegant", pattern: /\belegan(?:t|tly|ce)\b/gi },
  { word: "worth", pattern: /\bworth\b/gi },
  { word: "craft", pattern: /\bcraft(?:ed|ing|s)?\b/gi },
  { word: "effortless", pattern: /\beffortless(?:ly)?\b/gi },
  { word: "next-level", pattern: /\bnext[- ]level\b/gi },
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

/**
 * Words banned from interface copy (headings, taglines, intros, empty states). They are not applied
 * to the reviewed Learn guides, where "worth" can mean points in a contest.
 */
export function findBannedWords(text: string): CopyProblem[] {
  const problems: CopyProblem[] = [];
  for (const { word, pattern } of WORDS) {
    for (const m of text.matchAll(pattern)) {
      problems.push({ rule: `banned word "${word}"`, match: m[0], index: m.index ?? 0 });
    }
  }
  return problems.sort((a, b) => a.index - b.index);
}
