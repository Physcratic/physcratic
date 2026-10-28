import { topics } from "./physics";

export function tagLabel(tag: string) {
  return tag === "Modern" ? "Modern physics" : tag;
}

export function getProblemTags(problem: {
  topic?: string;
  topics?: readonly string[];
  tags?: readonly string[];
  concept?: string;
}) {
  return [
    ...new Set(
      [
        ...(problem.topics ?? (problem.topic ? [problem.topic] : [])),
        ...(problem.tags ?? (problem.concept ? [problem.concept] : [])),
      ].map(tagLabel),
    ),
  ];
}

export function getTagOptions(
  problems: Parameters<typeof getProblemTags>[0][],
) {
  const subjects = topics.map(({ name }) => tagLabel(name));
  const concepts = [...new Set(problems.flatMap(getProblemTags))]
    .filter((tag) => !subjects.includes(tag))
    .sort((a, b) => a.localeCompare(b));
  return [...subjects, ...concepts];
}
