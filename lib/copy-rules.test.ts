import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findBannedWords, findCopyProblems } from "./copy-rules";
import { articles, COACHING_LINE } from "./learn/articles";
import { visibleStrings } from "./learn/reading";
import { KNOWN_SEMICOLON_OFFENDERS, PROSE_SEMICOLON, designFindingsIn, scanCopy, scanDesign, sourceFiles, stringsIn, type DesignFinding } from "./copy-scan";
import { archiveDefinitions } from "./archive-grading/catalog";
import { source01 } from "./arena/source-01";
import { source02 } from "./arena/source-02";
import { source03 } from "./arena/source-03";
import { source04 } from "./arena/source-04";
import { source05 } from "./arena/source-05";
import { source06 } from "./arena/source-06";
import { source07 } from "./arena/source-07";
import { source08 } from "./arena/source-08";
import arenaIndex from "./arena/index.json";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const arenaSeeds = [...source01, ...source02, ...source03, ...source04, ...source05, ...source06, ...source07, ...source08];

describe("findCopyProblems", () => {
  it("passes plain copy", () => {
    assert.deepEqual(findCopyProblems("Practise each day. Rest, then review."), []);
  });
  it("flags em dashes, en dashes and semicolons", () => {
    const rules = findCopyProblems("a — b – c; d").map((p) => p.rule);
    assert.deepEqual(rules, ["em dash", "en dash", "semicolon"]);
  });
  it("flags each banned phrase, ignoring case and curly apostrophes", () => {
    const phrases = [
      "delve",
      "unlock",
      "elevate",
      "in today’s",
      "journey",
      "game-changer",
      "seamless",
      "dive into",
      "look no further",
    ];
    for (const phrase of phrases) {
      const found = findCopyProblems(`Some ${phrase.toUpperCase()} text`);
      assert.equal(found.length, 1, phrase);
    }
  });
  it("flags the banned words as whole words only", () => {
    for (const word of ["elegant", "worth", "craft", "effortless", "next-level"]) {
      assert.equal(findBannedWords(`A ${word.toUpperCase()} thing`).length, 1, word);
    }
    for (const word of ["journey", "unlock", "seamless"]) {
      assert.equal(findCopyProblems(`A ${word.toUpperCase()} thing`).length, 1, word);
    }
    assert.deepEqual(findBannedWords("An aircraft, a worthwhile Wentworth and a handicraft"), []);
  });
  it("reports every repeat", () => {
    assert.equal(findCopyProblems("a; b; c").length, 2);
  });
});

describe("learn articles obey the copy rules", () => {
  it("has no flagged text in any string", () => {
    const failures: string[] = [];
    for (const article of articles) {
      for (const text of visibleStrings(article)) {
        for (const problem of findCopyProblems(text)) {
          failures.push(`${article.slug}: ${problem.rule} in "${text.slice(0, 60)}"`);
        }
      }
    }
    assert.deepEqual(failures, []);
  });
});

describe("the coaching line at the end of every guide", () => {
  it("has the agreed words, links to /coaching and obeys the copy rules", () => {
    assert.equal(`${COACHING_LINE.lead} ${COACHING_LINE.linkLabel}`, "Want a coach who has sat these exams? Meet our medallist coaches.");
    assert.equal(COACHING_LINE.href, "/coaching");
    for (const text of [COACHING_LINE.lead, COACHING_LINE.linkLabel]) assert.deepEqual(findCopyProblems(text), []);
  });
});

describe("Arena problem text obeys the copy rules", () => {
  // Prose only: maths ($$...$$ and $...$), code spans and image addresses are removed first.
  const prose = (text: string) =>
    text
      .replace(/\$\$[\s\S]*?\$\$/g, " ")
      .replace(/\$[^$\n]*\$/g, " ")
      .replace(/`[^`\n]*`/g, " ")
      .replace(/\]\([^)\n]*\)/g, "]");
  const arenaTexts = () => {
    const out: { where: string; text: string }[] = [];
    for (const seed of arenaSeeds) {
      for (const field of ["title", "summary", "statement", "solution"] as const) out.push({ where: `${seed.id} ${field}`, text: seed[field] });
      for (const tag of seed.tags) out.push({ where: `${seed.id} tag`, text: tag });
      for (const [part, hints] of Object.entries(seed.hints ?? {})) for (const hint of hints) out.push({ where: `${seed.id} hint ${part}`, text: hint });
    }
    for (const definition of archiveDefinitions) {
      if (!definition.problemId.startsWith("arena-")) continue;
      for (const part of definition.parts) {
        // "domain" is never shown to a student, so it is not scanned.
        for (const field of ["label", "help"] as const) out.push({ where: `${definition.problemId} ${part.id} ${field}`, text: part[field] });
        if (part.kind === "self-review") out.push({ where: `${definition.problemId} ${part.id} reason`, text: part.reason });
      }
    }
    return out;
  };
  it("covers every Arena problem in the catalogue and its answer boxes", () => {
    assert.equal(arenaSeeds.length, arenaIndex.count);
    const parts = archiveDefinitions.filter((d) => d.problemId.startsWith("arena-")).reduce((sum, d) => sum + d.parts.length, 0);
    const hints = arenaSeeds.reduce((sum, seed) => sum + Object.values(seed.hints ?? {}).flat().length, 0);
    assert.ok(parts >= 197 && hints >= 44 * 3);
    assert.ok(arenaTexts().length >= arenaSeeds.length * 4 + parts * 2 + hints);
  });
  it("has no dashes, semicolons, banned words or banned phrases in titles, statements, solutions, part headings, answer help or condition lines", () => {
    const failures: string[] = [];
    for (const { where, text } of arenaTexts()) {
      for (const problem of [...findCopyProblems(prose(text)), ...findBannedWords(prose(text))]) failures.push(`${where}: ${problem.rule} in "${prose(text).trim().slice(0, 80)}"`);
    }
    assert.deepEqual(failures, []);
  });
  it("leaves maths alone: a semicolon or LaTeX spacing inside it is not flagged", () => {
    assert.deepEqual(findCopyProblems(prose(String.raw`The field $$E_\theta(S;L)=0$$ and $a\;b$ vanish.`)), []);
    assert.equal(findCopyProblems(prose("Two clauses; joined")).length, 1);
  });
});

describe("copy scanner", () => {
  it("reads string literals, template text and JSX text but not comments", () => {
    const source = [
      "// comment — ignored",
      "const a = \"one — two\";",
      "const b = `three – ${a}`;",
      "export const c = <p>four — five</p>;",
    ].join("\n");
    const texts = stringsIn("sample.tsx", source).map((s) => s.text);
    assert.deepEqual(texts, ["one — two", "three – ", "four — five"]);
  });
});

describe("no em dashes or en dashes in the app", () => {
  it("has none in any string literal or JSX text under app/ and components/", () => {
    const failures = scanCopy(process.cwd(), ["app", "components"])
      .filter((f) => f.rule === "em dash" || f.rule === "en dash")
      .map((f) => `${f.file}:${f.line} ${f.rule}: ${f.text}`);
    assert.deepEqual(failures, []);
  });
});

describe("no banned words or joined clauses in the app", () => {
  it("has no banned phrases or words in any string literal or JSX text under app/ and components/", () => {
    const failures = scanCopy(process.cwd(), ["app", "components"])
      .filter((f) => f.rule.startsWith("phrase") || f.rule.startsWith("banned word"))
      .map((f) => `${f.file}:${f.line} ${f.rule}: ${f.text}`);
    assert.deepEqual(failures, []);
  });
  const proseSemicolons = () => {
    const found: { file: string; line: number; text: string }[] = [];
    for (const dir of ["app", "components"]) {
      for (const file of sourceFiles(process.cwd(), dir)) {
        for (const { text, line } of stringsIn(file, readFileSync(join(process.cwd(), file), "utf8"))) {
          if (PROSE_SEMICOLON.test(text.replace(/&[a-z]+;/g, "")) && !/[=<>{}]|charset|base64|path=/.test(text)) {
            found.push({ file, line, text: text.trim().slice(0, 70) });
          }
        }
      }
    }
    return found;
  };
  it("has no semicolons joining clauses of prose under app/ and components/", () => {
    const failures = proseSemicolons()
      .filter((f) => !KNOWN_SEMICOLON_OFFENDERS.includes(f.file))
      .map((f) => `${f.file}:${f.line} ${f.text}`);
    assert.deepEqual(failures, []);
  });
  it("keeps the known offenders list honest", () => {
    const files = new Set(proseSemicolons().map((f) => f.file));
    for (const file of KNOWN_SEMICOLON_OFFENDERS) assert.ok(files.has(file), `${file} has no semicolon left, remove it from KNOWN_SEMICOLON_OFFENDERS`);
  });
  it("catches a semicolon followed by a space and any character", () => {
    for (const text of ["one; two", "20 a day; 20 in total", "binds first; ^ is right-associative", "a;  b"]) assert.ok(PROSE_SEMICOLON.test(text), text);
    for (const text of ["no semicolon here", "&amp; entity", "trailing;", "a;b"]) assert.ok(!PROSE_SEMICOLON.test(text.replace(/&[a-z]+;/g, "")), text);
  });
});

// Design rules: no separator glyph between words, one typeface for interface text, no wide-tracked uppercase labels.
// D2 removed every older offender except the one file below. A file may not go above its count, and may not stay above
// the real count either (fix one, lower the number).
// The Settings page still has one wide-tracked uppercase label.
const DESIGN_BASELINE: Record<DesignFinding["rule"], Record<string, number>> = {
  "separator glyph": {},
  "font-mono outside code and kbd": {},
  "uppercase with tracking": { "components/community/account-settings.tsx": 1 },
};

describe("design rule scanner", () => {
  const rules = (source: string, file = "sample.tsx") => designFindingsIn(file, source).map((f) => f.rule);
  it("flags a middle dot, bullet or similar glyph in string literals, template text and JSX text", () => {
    for (const glyph of ["·", "•", "∙", "⋅", "‧", "&middot;", "&bull;"]) {
      assert.deepEqual(rules(`export const a = "600 ${glyph} Beginner";`), ["separator glyph"], glyph);
      assert.deepEqual(rules(`export const b = <p>IPhO ${glyph} 2026</p>;`), ["separator glyph"], glyph);
    }
    assert.deepEqual(rules("export const c = `${a} · ${b}`;"), ["separator glyph"]);
    assert.deepEqual(rules('export const d = <span aria-hidden="true">·</span>;'), ["separator glyph"], "an aria-hidden span is not exempt");
  });
  it("ignores comments and text without a glyph", () => {
    assert.deepEqual(rules("// 600 · Beginner\n/* • */\nexport const a = 'IPhO, 2026';"), []);
  });
  it("flags font-mono outside code and kbd, and allows it inside them", () => {
    assert.deepEqual(rules('export const a = <p className="font-mono text-sm">x</p>;'), ["font-mono outside code and kbd"]);
    assert.deepEqual(rules('export const a = <div className={cn("a", cond && "md:font-mono")}>x</div>;'), ["font-mono outside code and kbd"]);
    assert.deepEqual(rules('export const a = <code className="font-mono">x</code>;'), []);
    assert.deepEqual(rules('export const a = <kbd className="rounded font-mono">x</kbd>;'), []);
    assert.deepEqual(rules('export const a = <code><span className="font-mono">x</span></code>;'), []);
    assert.deepEqual(rules('export const a = <p className="font-monospace-ish text-sm">x</p>;'), []);
  });
  it("flags uppercase with a tracking-[...], wide, wider or widest class, in one string or one className", () => {
    assert.deepEqual(rules('export const a = <p className="text-xs uppercase tracking-[0.18em]">x</p>;'), ["uppercase with tracking"]);
    for (const tracking of ["tracking-wide", "tracking-wider", "tracking-widest", "sm:tracking-wide"]) {
      assert.deepEqual(rules(`export const a = <p className="uppercase ${tracking}">x</p>;`), ["uppercase with tracking"], tracking);
    }
    assert.deepEqual(rules('export const a = <p className={cn("text-xs uppercase", open && "tracking-widest")}>x</p>;'), ["uppercase with tracking"]);
    assert.deepEqual(rules('export const a = <p className="uppercase">x</p>;'), []);
    assert.deepEqual(rules('export const a = <p className="tracking-wide">x</p>;'), []);
    assert.deepEqual(rules('export const a = <p className="uppercase tracking-tight">x</p>;'), []);
  });
});

describe("design rules in the app", () => {
  const found = scanDesign(process.cwd(), ["app", "components"]);
  const count = (rule: DesignFinding["rule"]) => {
    const byFile = new Map<string, DesignFinding[]>();
    for (const f of found.filter((x) => x.rule === rule)) byFile.set(f.file, [...(byFile.get(f.file) ?? []), f]);
    return byFile;
  };
  for (const rule of Object.keys(DESIGN_BASELINE) as DesignFinding["rule"][]) {
    const baseline = DESIGN_BASELINE[rule];
    it(`has no new "${rule}" under app/ and components/`, () => {
      const failures: string[] = [];
      for (const [file, list] of count(rule)) {
        const allowed = baseline[file] ?? 0;
        if (list.length > allowed) for (const f of list.slice(allowed)) failures.push(`${f.file}:${f.line} ${rule}: ${f.text}`);
      }
      assert.deepEqual(failures, []);
    });
    it(`keeps the "${rule}" baseline honest`, () => {
      const stale: string[] = [];
      const real = count(rule);
      for (const [file, allowed] of Object.entries(baseline)) {
        const now = real.get(file)?.length ?? 0;
        if (now < allowed) stale.push(`${file} has ${now}, baseline says ${allowed}. Lower or remove it in DESIGN_BASELINE`);
      }
      assert.deepEqual(stale, []);
    });
  }
  it("covers the D1 files with no baseline entry", () => {
    for (const file of ["components/physics/problem-card.tsx", "components/physics/problem-heading.tsx", "components/physics/problem-room.tsx", "components/physics/problem-library.tsx", "components/physics/problem-collection.tsx", "components/physics/olympiad-problem-card.tsx", "components/physics/corpus-collection.tsx", "components/physics/unified-arena-collection.tsx"]) {
      for (const baseline of Object.values(DESIGN_BASELINE)) assert.equal(baseline[file], undefined, `${file} is fixed, it must not be in the baseline`);
    }
  });
});
