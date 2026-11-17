import arena from "../arena/index.json";
import { catalogProblems } from "../corpus-catalog";
import { archiveTitle, arenaMetaTitle } from "./problem-titles";

/** Only public catalogue metadata. Images need no statements, solutions or database access. */
export function findProblemImage(id: string): { metaTitle: string; topic: string } | undefined {
  const arenaProblem = arena.problems.find((problem) => problem.id === id);
  if (arenaProblem) return { metaTitle: arenaMetaTitle(arenaProblem.title), topic: arenaProblem.topic };
  const archiveProblem = catalogProblems.find((problem) => problem.id === id);
  if (archiveProblem) return { metaTitle: archiveTitle(archiveProblem).metaTitle, topic: archiveProblem.primaryTopic };
  return undefined;
}
