import "server-only";
import { createHash } from "node:crypto";
import { archiveMetadataSchema, type ArchiveMetadata } from "../archive-grading-contracts";
import { problems } from "../physics";
import { source01 } from "../arena/source-01";
import { source02 } from "../arena/source-02";
import { source03 } from "../arena/source-03";
import { source04 } from "../arena/source-04";
import { source05 } from "../arena/source-05";
import { source06 } from "../arena/source-06";
import { keys01 } from "./source-01";
import { keys02 } from "./source-02";
import { keys03 } from "./source-03";
import { keys04 } from "./source-04";
import { keys05 } from "./source-05";
import { keys06 } from "./source-06";
import { numeric, type ArchiveDefinition } from "./definitions";

const arenaKeys = { ...keys01, ...keys02, ...keys03, ...keys04, ...keys05, ...keys06 };
export const archiveDefinitions: ArchiveDefinition[] = [
  ...[...source01, ...source02, ...source03, ...source04, ...source05, ...source06].map((seed) => {
    const parts = arenaKeys[seed.id];
    if (!parts?.length) throw new Error(`Missing Arena grading disposition: ${seed.id}`);
    return { problemId: seed.id, keyVersion: 1, content: JSON.stringify(seed), parts: parts.map((part) => ({ ...part, sourceReference: `${seed.solutionFile ?? seed.statementFile.replace("_Problem.pdf", "_Solution.pdf")} § ${part.sourcePart}` })) };
  }),
  ...problems.map((problem) => ({ problemId: problem.id, keyVersion: 1, content: JSON.stringify(problem), parts: [
    { ...numeric("answer", "Final answer", problem.answer, problem.unit, { sourcePart: "Answer", help: "Use the displayed unit, without a unit suffix. Tolerance: 1% relative. No unit conversion." }), sourceReference: `lib/physics.ts: ${problem.id}, worked solution` },
  ] })),
];
const byId = new Map(archiveDefinitions.map((definition) => [definition.problemId, definition]));
export function getArchiveDefinition(problemId: string) { return byId.get(problemId); }
export function archiveVersion(definition: ArchiveDefinition): string {
  return createHash("sha256").update(JSON.stringify({ engine: "sampled-v1", ...definition })).digest("hex");
}
export function publicArchiveMetadata(definition: ArchiveDefinition): ArchiveMetadata {
  return archiveMetadataSchema.parse({ problemId: definition.problemId, version: archiveVersion(definition), parts: definition.parts.map((part) => ({
    id: part.id, sourcePart: part.sourcePart, label: part.label, kind: part.kind,
    unit: part.unit, symbols: part.symbols.map((symbol) => symbol.latex), help: part.help,
  })) });
}
