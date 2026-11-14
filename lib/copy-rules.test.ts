import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findBannedWords, findCopyProblems } from "./copy-rules";
import { articles, COACHING_LINE } from "./learn/articles";
import { visibleStrings } from "./learn/reading";
import { KNOWN_SEMICOLON_OFFENDERS, PROSE_SEMICOLON, scanCopy, sourceFiles, stringsIn } from "./copy-scan";
import { archiveDefinitions } from "./archive-grading/catalog";
import { source01 } from "./arena/source-01";
import { source02 } from "./arena/source-02";
import { source03 } from "./arena/source-03";
import { source04 } from "./arena/source-04";
import { source05 } from "./arena/source-05";
import { source06 } from "./arena/source-06";
import { source07 } from "./arena/source-07";
import { source08 } from "./arena/source-08";
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
  it("covers all 33 problems and their answer boxes", () => {
    assert.equal(arenaSeeds.length, 33);
    const parts = archiveDefinitions.filter((d) => d.problemId.startsWith("arena-")).reduce((sum, d) => sum + d.parts.length, 0);
    assert.equal(parts, 197);
    assert.ok(arenaTexts().length >= 33 * 4 + parts * 2 + 44 * 3);
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
