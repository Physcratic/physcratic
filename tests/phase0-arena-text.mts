// Phase 0 baseline: counts of semicolons and AI-sounding phrases in Arena text.
// Read only, changes nothing. Run: pnpm exec tsx tests/phase0-arena-text.mts
import { source01 } from "../lib/arena/source-01";
import { source02 } from "../lib/arena/source-02";
import { source03 } from "../lib/arena/source-03";
import { source04 } from "../lib/arena/source-04";
import { source05 } from "../lib/arena/source-05";
import { source06 } from "../lib/arena/source-06";
import { archiveDefinitions } from "../lib/archive-grading/catalog";

const files: [string, any[]][] = [["source-01", source01], ["source-02", source02], ["source-03", source03], ["source-04", source04], ["source-05", source05], ["source-06", source06]];
const banned = /\b(elegant(?:ly)?|worth|journey|unlock\w*|craft\w*|seamless\w*|effortless\w*|next-level|delve|elevate\w*|game-changer|dive into|look no further|tapestry|symphony|dance|whisper\w*|mystery|riddle|secret|treaty|conspiracy|beautiful\w*|magic\w*|remarkabl\w*|fascinating|let's|embark|realm|testament|stunning)\b/gi;
const dashes = /[—–]/g;
const twoPart = /(?:^|[.!?]\s)([A-Z][^.!?\n]{3,60})\.\s+([A-Z][^.!?\n]{3,60})\.(?=\s|$)/g; // short pair of sentences, screened by hand below
const notJust = /\b(?:not (?:just|only|merely)|more than (?:just )?(?:a|an|the)?)\b/gi;
const hints = /(?:^|\n)\s*(?:\*\*)?(?:Hint|Tip)\b/gi;
const heading = /^[ \t]*(?:#{1,6}[ \t]+.{1,120}|\*\*\([a-z]+\)[^\n]{0,120})$/gm;

type Row = { file: string; id: string; field: string; semicolons: number; banned: string[]; dashes: number; notJust: number };
const rows: Row[] = [];
const titles: string[] = [];
const summaries: string[] = [];
const headingSemis: string[] = [];
let headingsTotal = 0, hintLines = 0;
for (const [file, list] of files) for (const p of list) {
  titles.push(`${p.id} | ${p.title}`);
  summaries.push(`${p.id} | ${p.summary}`);
  for (const field of ["title", "summary", "statement", "solution"] as const) {
    const text: string = p[field] ?? "";
    // semicolons inside LaTeX or HTML entities are not prose
    const prose = text.replace(/\$\$[\s\S]*?\$\$/g, " ").replace(/\$[^$\n]*\$/g, " ").replace(/&[a-z#0-9]+;/gi, " ");
    rows.push({ file, id: p.id, field, semicolons: (prose.match(/;/g) ?? []).length, banned: [...prose.matchAll(banned)].map((m) => m[0].toLowerCase()), dashes: (prose.match(dashes) ?? []).length, notJust: (prose.match(notJust) ?? []).length });
    if (field === "statement" || field === "solution") {
      for (const h of prose.match(heading) ?? []) { headingsTotal++; if (h.includes(";")) headingSemis.push(`${p.id} ${field}: ${h.trim()}`); }
      hintLines += (prose.match(hints) ?? []).length;
    }
  }
}
const sum = (f: (r: Row) => number, field?: string) => rows.filter((r) => !field || r.field === field).reduce((s, r) => s + f(r), 0);
console.log(`problems: ${titles.length}`);
for (const field of ["title", "summary", "statement", "solution"]) console.log(`${field.padEnd(10)} semicolons=${sum((r) => r.semicolons, field)} banned=${sum((r) => r.banned.length, field)} dashes=${sum((r) => r.dashes, field)} notJust=${sum((r) => r.notJust, field)}`);
console.log(`TOTAL      semicolons=${sum((r) => r.semicolons)} banned=${sum((r) => r.banned.length)} dashes=${sum((r) => r.dashes)} notJust=${sum((r) => r.notJust)}`);
console.log(`part headings found: ${headingsTotal}, with semicolon: ${headingSemis.length}; hint lines in statement/solution text: ${hintLines}`);
console.log("\nby file (semicolons / banned / dashes):");
for (const [file] of files) { const r = rows.filter((x) => x.file === file); console.log(`  ${file}: ${r.reduce((s, x) => s + x.semicolons, 0)} / ${r.reduce((s, x) => s + x.banned.length, 0)} / ${r.reduce((s, x) => s + x.dashes, 0)}`); }
console.log("\nbanned or poetic hits:");
for (const r of rows) if (r.banned.length) console.log(`  ${r.file} ${r.id} ${r.field}: ${r.banned.join(", ")}`);
console.log("\ntitles:"); titles.forEach((t) => console.log("  " + t));
console.log("\nsummaries:"); summaries.forEach((t) => console.log("  " + t));
console.log("\nwhere the semicolons, dashes and hints are:");
for (const [file, list] of files) for (const p of list) for (const field of ["statement", "solution"] as const) {
  const t: string = p[field].replace(/\$\$[\s\S]*?\$\$/g, " ").replace(/\$[^$\n]*\$/g, " ").replace(/&[a-z#0-9]+;/gi, " ");
  for (const m of t.matchAll(/[^\n]{0,50}(;|[—–]|(?:^|\n)\s*(?:\*\*)?(?:Hint|Tip)\b)[^\n]{0,40}/gi)) console.log(`  ${file} ${p.id} ${field}: ...${m[0].trim()}...`);
}
const fileOf = new Map<string, string>(); for (const [file, list] of files) for (const p of list) fileOf.set(p.id, file.replace("source-", "archive-grading/source-") + ".ts");
const helpByFile: Record<string, number> = {};
let labelSemis = 0, helpSemis = 0, labels = 0, helps = 0, helpBanned = 0, helpDashes = 0;
const helpHits: string[] = [];
for (const def of Object.values(archiveDefinitions) as any[]) for (const part of def.parts) {
  labels++; helps++;
  if ((part.label ?? "").includes(";")) labelSemis++;
  const h = String(part.help ?? "") + " " + String(part.reason ?? "");
  if (h.includes(";")) { helpSemis++; helpByFile[fileOf.get(def.problemId) ?? "practice"] = (helpByFile[fileOf.get(def.problemId) ?? "practice"] ?? 0) + 1; helpHits.push(`${def.problemId} ${part.id}: ${h.trim().slice(0, 120)}`); }
  if (/[—–]/.test(h)) helpDashes++;
  if (banned.test(h)) helpBanned++;
  banned.lastIndex = 0;
}
console.log(`\nanswer-part labels=${labels} with semicolon=${labelSemis}; help/reason lines=${helps} with semicolon=${helpSemis}, with dash=${helpDashes}, banned=${helpBanned}`);
console.log("help lines with a semicolon, by file:", JSON.stringify(helpByFile));
console.log("first three:"); helpHits.slice(0, 3).forEach((h) => console.log("  " + h));
if (headingSemis.length) { console.log("\nheadings with semicolons:"); headingSemis.forEach((h) => console.log("  " + h)); }
