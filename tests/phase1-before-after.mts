// Phase 1 audit: how many problems fail their own reference answer, and rewritten forms of it, before and after.
//   pnpm exec tsx --conditions=react-server tests/phase1-before-after.mts dump cases.json   (needs lib/answer-reader.ts)
//   pnpm exec tsx --conditions=react-server tests/phase1-before-after.mts run cases.json    (any version of lib/archive-grading.ts)
import { readFileSync, writeFileSync } from "node:fs";

const [mode, file] = process.argv.slice(2);
type Case = { problemId: string; partId: string; text: string; kind: "key" | "rewrite" | "wrong" };

if (mode === "dump") {
  const { archiveDefinitions } = await import("../lib/archive-grading/catalog");
  const { numberVariants, variantsOf } = await import("./answer-rewrites");
  const hash = (text: string) => [...text].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
  const cases: Case[] = [];
  for (const d of archiveDefinitions) for (const part of d.parts) {
    if (part.kind === "self-review" || part.kind === "special") continue;
    const add = (text: string, kind: Case["kind"]) => cases.push({ problemId: d.problemId, partId: part.id, text, kind });
    if (part.kind === "numeric") {
      add(String(part.target), "key");
      for (const text of numberVariants(part.target)) add(text, "rewrite");
      continue;
    }
    for (const reference of [part.canonical, ...part.alternatives]) {
      add(reference, "key");
      const variants = variantsOf(reference, part.symbols.map((s) => s.latex), part.symbols.map((s) => s.latex), hash(`${d.problemId}/${part.id}`));
      for (const text of variants?.equal ?? []) add(text, "rewrite");
      if (reference === part.canonical) for (const text of variants?.wrong ?? []) add(text, "wrong");
    }
  }
  writeFileSync(file, JSON.stringify(cases));
  console.log(cases.length, "cases written");
} else {
  const { getArchiveDefinition } = await import("../lib/archive-grading/catalog");
  const { checkArchivePart } = await import("../lib/archive-grading");
  const cases: Case[] = JSON.parse(readFileSync(file, "utf8"));
  const failedKey = new Set<string>(), failedAny = new Set<string>(), wrongPassed = new Set<string>();
  const parts = new Set<string>(), partsKeyFailed = new Set<string>(), partsAnyFailed = new Set<string>();
  let keyCases = 0, rewriteCases = 0, rewriteFailed = 0, keyFailed = 0;
  for (const c of cases) {
    const part = getArchiveDefinition(c.problemId)!.parts.find((p) => p.id === c.partId)!;
    const status = (checkArchivePart as (p: unknown, t: string, id: string) => { status: string })(part, c.text, c.problemId).status;
    parts.add(`${c.problemId}/${c.partId}`);
    if (c.kind === "wrong") { if (status === "correct") wrongPassed.add(c.problemId); continue; }
    if (c.kind === "key") keyCases++; else rewriteCases++;
    if (status !== "correct") {
      failedAny.add(c.problemId); partsAnyFailed.add(`${c.problemId}/${c.partId}`);
      if (c.kind === "key") { failedKey.add(c.problemId); partsKeyFailed.add(`${c.problemId}/${c.partId}`); keyFailed++; } else rewriteFailed++;
    }
  }
  const problems = new Set(cases.map((c) => c.problemId)).size;
  console.log(JSON.stringify({
    problems, parts: parts.size, keyCases, keyFailed, rewriteCases, rewriteFailed,
    problemsFailingTheirOwnKey: failedKey.size, partsFailingTheirOwnKey: partsKeyFailed.size,
    problemsFailingKeyOrRewrite: failedAny.size, partsFailingKeyOrRewrite: partsAnyFailed.size,
    problemsWhereAWrongFormPassed: wrongPassed.size,
  }, null, 1));
}
