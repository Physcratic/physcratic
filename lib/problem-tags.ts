import { physicsTopics, physicsTagLabel } from "./physics-taxonomy";

export function tagLabel(tag: string): string {
  return physicsTagLabel(tag);
}

export function getProblemTags(problem: {
  topic?: string;
  topics?: readonly string[];
  tags?: readonly string[];
  concept?: string;
  importLanguage?: "en" | "ru";
}) {
  const languageTag =
    problem.importLanguage === "en"
      ? "English"
      : problem.importLanguage === "ru"
        ? "Russian"
        : undefined;

  return [
    ...new Set(
      [
        ...(problem.topics ?? (problem.topic ? [problem.topic] : [])),
        ...(problem.tags ?? (problem.concept ? [problem.concept] : [])),
        ...(languageTag ? [languageTag] : []),
      ].map((value) => tagLabel(value)),
    ),
  ];
}

export function filterProblemsByTag<
  T extends Parameters<typeof getProblemTags>[0],
>(problems: readonly T[], tag?: string): T[] {
  return problems.filter(
    (problem) =>
      !tag || tag === "all" || getProblemTags(problem).includes(tagLabel(tag)),
  );
}

export function getTagOptions(
  problems: Parameters<typeof getProblemTags>[0][],
) {
  const subjects: string[] = physicsTopics.map(({ label }) => label);
  const concepts = [...new Set(problems.flatMap(getProblemTags))]
    .filter((tag) => !subjects.includes(tag))
    .sort((a, b) => a.localeCompare(b));
  return [...subjects, ...concepts];
}
