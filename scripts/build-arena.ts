import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { arenaProblemSchema, arenaProvenance } from "../lib/arena-schema";
import { arenaCardImageAlts } from "../lib/arena/card-images";
import { buildCardImage, firstStatementFigure } from "../lib/arena/card-image";
import { source01 } from "../lib/arena/source-01";
import { source02 } from "../lib/arena/source-02";
import { source03 } from "../lib/arena/source-03";
import { source04 } from "../lib/arena/source-04";
import { source05 } from "../lib/arena/source-05";
import { source06 } from "../lib/arena/source-06";
import { source07 } from "../lib/arena/source-07";
import { source08 } from "../lib/arena/source-08";

import { olympiadDefinitions } from "../lib/olympiad/keys";
import { archiveDefinitions, publicArchiveMetadata } from "../lib/archive-grading/catalog";

const gradingFolder = join(process.cwd(), "public/corpus/grading");
mkdirSync(gradingFolder, { recursive: true });
for (const definition of [...archiveDefinitions, ...olympiadDefinitions]) {
  writeFileSync(join(gradingFolder, `${definition.problemId}.json`), JSON.stringify(publicArchiveMetadata(definition), null, 2) + "\n");
}

const seeds = [...source01, ...source02, ...source03, ...source04, ...source05, ...source06, ...source07, ...source08];
const folder = join(process.cwd(), "public/corpus/arena");
mkdirSync(folder, { recursive: true });

async function main() {
  const unknown = Object.keys(arenaCardImageAlts).filter((id) => !seeds.some((seed) => seed.id === id));
  if (unknown.length) throw new Error(`lib/arena/card-images.ts names problems that do not exist: ${unknown.join(", ")}`);
  const problems = [];
  for (const seed of seeds) {
    const problem = arenaProblemSchema.parse({ ...seed, solutionFile: seed.solutionFile ?? seed.statementFile?.replace("_Problem.pdf", "_Solution.pdf"), importedOn: seed.importedOn ?? "2026-10-31" });
    writeFileSync(join(folder, `${problem.id}.json`), JSON.stringify(problem, null, 2) + "\n");
    const { statement, solution, ...metadata } = problem;
    // The card shows the first statement figure only. Its size comes from the public file, so the card can reserve its box.
    const src = firstStatementFigure(statement);
    const meta = src ? await sharp(join(process.cwd(), "public", src)).metadata() : undefined;
    const image = buildCardImage(problem.id, statement, arenaCardImageAlts[problem.id], meta?.width && meta.height ? { width: meta.width, height: meta.height } : undefined);
    problems.push({ ...metadata, path: `/corpus/arena/${problem.id}.json`, ...(image ? { image } : {}) });
  }
  writeFileSync(join(process.cwd(), "lib/arena/index.json"), JSON.stringify({ collection: "Physcratic Arena", provenance: arenaProvenance, count: problems.length, problems }, null, 2) + "\n");
  console.log(`Published ${problems.length} native Arena statements and worked solutions.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
