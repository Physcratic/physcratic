import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { arenaProblemSchema, arenaProvenance } from "../lib/arena-schema";
import { source01 } from "../lib/arena/source-01";
import { source02 } from "../lib/arena/source-02";
import { source03 } from "../lib/arena/source-03";
import { source04 } from "../lib/arena/source-04";
import { source05 } from "../lib/arena/source-05";
import { source06 } from "../lib/arena/source-06";

import { olympiadDefinitions } from "../lib/olympiad/keys";
import { archiveDefinitions, publicArchiveMetadata } from "../lib/archive-grading/catalog";

const gradingFolder = join(process.cwd(), "public/corpus/grading");
mkdirSync(gradingFolder, { recursive: true });
for (const definition of [...archiveDefinitions, ...olympiadDefinitions]) {
  writeFileSync(join(gradingFolder, `${definition.problemId}.json`), JSON.stringify(publicArchiveMetadata(definition), null, 2) + "\n");
}

const seeds = [...source01, ...source02, ...source03, ...source04, ...source05, ...source06];
const folder = join(process.cwd(), "public/corpus/arena");
mkdirSync(folder, { recursive: true });
const problems = seeds.map((seed) => {
  const problem = arenaProblemSchema.parse({ ...seed, solutionFile: seed.solutionFile ?? seed.statementFile.replace("_Problem.pdf", "_Solution.pdf"), importedOn: "2026-10-31" });
  writeFileSync(join(folder, `${problem.id}.json`), JSON.stringify(problem, null, 2) + "\n");
  const { statement, solution, ...metadata } = problem;
  return { ...metadata, path: `/corpus/arena/${problem.id}.json` };
});
writeFileSync(join(process.cwd(), "lib/arena/index.json"), JSON.stringify({ collection: "Physcratic Arena", provenance: arenaProvenance, count: problems.length, problems }, null, 2) + "\n");
console.log(`Published ${problems.length} native Arena statements and worked solutions.`);
