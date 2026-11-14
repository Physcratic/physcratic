import "server-only";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { importedProblemSchema, type ImportedNode } from "../lib/imported-corpus-schema";
import { nativeOlympiadContent } from "../lib/olympiad/native-content";
import "../lib/olympiad/native-2012";
import { olympiadDefinitions } from "../lib/olympiad/keys";
import { publicArchiveMetadata } from "../lib/archive-grading/catalog";

const load = (file: string) => JSON.parse(readFileSync(file, "utf8"));
const save = (file: string, value: unknown) => { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, JSON.stringify(value, null, 2) + "\n"); };
const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const text = (nodes: ImportedNode[]): string => nodes.map(n => n.type === "text" ? n.text : n.tag === "img" ? "" : text(n.children ?? [])).join("\n");
const figures = (nodes: ImportedNode[]): string[] => nodes.flatMap(n => n.type === "text" ? [] : n.tag === "img" ? [n.src!] : figures(n.children ?? []));
const index = load("lib/corpus/import-index.json");
const manifest = load("lib/corpus/import-manifest.json");
const collection = load("public/corpus/collection.json");
const changedAssets = new Set<string>();
const ledger = [];

for (const [id, content] of Object.entries(nativeOlympiadContent)) {
  const entry = index.problems.find((p: { id: string }) => p.id === id);
  if (!entry) throw Error("Unknown archive identity: " + id);
  const file = "public" + entry.path;
  const record = load(file);
  for (const kind of ["statement", "solution"] as const) {
    const original = record[kind];
    const referencePdf = original.pdf ?? original.referencePdf;
    if (!referencePdf) throw Error("Missing original PDF: " + id);
    const sourceBytes = readFileSync("public" + referencePdf);
    ledger.push({ id, kind, originalPdf: referencePdf, originalSha256: hash(sourceBytes), nodes: content[kind].length, figures: figures(content[kind]), review: "transcribed-and-page-compared", independentReview: "pending" });
    record[kind] = { format: "html", referencePdf, nodes: content[kind], text: text(content[kind]), figures: figures(content[kind]), shared: false };
    entry[kind + "Format"] = "html";
    for (const figure of figures(content[kind])) changedAssets.add(figure);
  }
  importedProblemSchema.parse(record);
  save(file, record);
  changedAssets.add(entry.path);
  const at = collection.problems.findIndex((p: { id: string }) => p.id === id);
  if (at < 0) throw Error("Missing collection member: " + id);
  collection.problems[at] = record;
  const metadata = publicArchiveMetadata(olympiadDefinitions.find(d => d.problemId === id)!);
  const gradingPath = "/corpus/grading/" + id + ".json";
  save("public" + gradingPath, metadata);
  changedAssets.add(gradingPath);
}
save("lib/corpus/import-index.json", index);
save("public/corpus/collection.json", collection);
changedAssets.add("/corpus/collection.json");
const byPath = new Map(manifest.assets.map((a: { path: string }) => [a.path, a]));
for (const asset of changedAssets) {
  const data = readFileSync("public" + asset);
  byPath.set(asset, { path: asset, bytes: data.length, sha256: hash(data) });
}
save("lib/corpus/import-manifest.json", { ...manifest, problems: index.problems, assets: [...byPath.values()].sort((a, b) => (a as { path: string }).path.localeCompare((b as { path: string }).path, "en")) });
save("docs/engineering/native-archive-batch-1-sources.json", ledger);
save("docs/engineering/native-archive-inventory.json", {
  baseline: "bcc132eb44b01d67402910015972b594b08810c2",
  total: index.count,
  native: index.problems.filter((p: { statementFormat: string; solutionFormat: string }) => p.statementFormat === "html" && p.solutionFormat === "html").length,
  problems: index.problems.map((p: { id: string; path: string; statementFormat: string; solutionFormat: string }) => ({
    id: p.id, path: p.path, statementFormat: p.statementFormat, solutionFormat: p.solutionFormat,
    answerFields: Object.hasOwn(nativeOlympiadContent, p.id),
    next: Object.hasOwn(nativeOlympiadContent, p.id) ? "source-review" : p.statementFormat === "html" ? "answer-field-review" : "statement-and-solution-transcription",
  })),
});
console.log("Built five native olympiad records and their public answer metadata. Originals retained.");
