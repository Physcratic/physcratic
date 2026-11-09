import "server-only";
import {
  archiveDefinitions,
  archiveVersion,
  publicArchiveMetadata,
} from "./archive-grading/catalog";
import type { ContestProblemOption } from "./contest-contracts";

export function contestProblemSnapshot(id: string) {
  const definition = archiveDefinitions.find((item) => item.problemId === id);
  if (
    !definition ||
    definition.parts.some((part) => part.kind === "self-review")
  )
    return null;
  const content = JSON.parse(definition.content) as {
    title: string;
    topic: string;
    statement?: string;
    prompt?: string;
  };
  const statement = content.statement ?? content.prompt;
  if (!statement) return null;
  return {
    problemId: id,
    title: content.title,
    topic: content.topic,
    statement,
    version: archiveVersion(definition),
    metadata: publicArchiveMetadata(definition),
    definition,
  };
}
export function contestProblemOptions(): ContestProblemOption[] {
  return archiveDefinitions.flatMap((definition) => {
    const problem = contestProblemSnapshot(definition.problemId);
    return problem
      ? [
          {
            id: problem.problemId,
            title: problem.title,
            topic: problem.topic,
            points: problem.metadata.parts.length,
          },
        ]
      : [];
  });
}
