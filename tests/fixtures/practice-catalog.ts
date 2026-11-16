import { practiceCheckCatalog } from "../../lib/practice-check-catalog";
import { getArchiveDefinition, publicArchiveMetadata } from "../../lib/archive-grading/catalog";
import { problems } from "../../lib/physics";

/** Explicit historical fixture for the retained legacy reader/replay harnesses only. */
export function practiceCatalogWithLegacyFixture() {
  const problem = problems.find(entry => entry.id === "incline")!;
  return [
    ...practiceCheckCatalog(),
    { kind: "practice" as const, title: problem.title, metadata: publicArchiveMetadata(getArchiveDefinition(problem.id)!) },
  ];
}
