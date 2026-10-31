import type { LucideIcon } from "lucide-react";
import { competitions, catalogProblems, filterCatalog } from "../../lib/corpus-catalog";
import { iphoPapers, iphoSubproblems } from "../../lib/ipho-archive";
import { problems, topics } from "../../lib/physics";
import { tagLabel } from "../../lib/problem-tags";

/** Every number on the landing page is derived here from the real data. */
const byCompetition = competitions.map((name) => ({
  name,
  count: catalogProblems.filter((problem) => problem.competition === name).length,
}));

const theoryPapers = iphoPapers.filter((paper) => paper.kind === "Theory").length;

export const counts = {
  olympiad: catalogProblems.length,
  byCompetition,
  iphoPapers: iphoPapers.length,
  theoryPapers,
  experimentPapers: iphoPapers.length - theoryPapers,
  iphoSubproblems: iphoSubproblems.length,
  topics: topics.length,
  warmUps: problems.length,
};

export const competitionBreakdown = byCompetition
  .map((item) => `${item.count} ${item.name}`)
  .join(", ");

export interface TopicCard {
  /** URL value, unchanged (for example "Modern"). */
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
  count: number;
  href: string;
}

export const topicCards: TopicCard[] = topics.map((topic) => ({
  value: topic.name,
  label: tagLabel(topic.name),
  description: topic.description,
  icon: topic.icon,
  count:
    problems.filter((problem) => problem.topic === topic.name).length +
    filterCatalog({ topic: topic.name }).length,
  href: `/dashboard?view=problems&topic=${encodeURIComponent(topic.name)}`,
}));

/** One per topic that has practice problems, then two more. */
export const warmUpIds = [
  "incline",
  "circuit",
  "string",
  "heat",
  "projectile",
  "gas",
] as const;

export const warmUps = warmUpIds.map((id) => {
  const problem = problems.find((item) => item.id === id);
  if (!problem) throw new Error(`Landing page warm-up is missing: ${id}`);
  return {
    id,
    title: problem.title,
    topic: tagLabel(problem.topic),
    minutes: problem.minutes,
    href: `/dashboard/problems/${id}`,
  };
});

export const links = {
  problems: "/dashboard?view=problems",
  contests: "/dashboard?view=contests",
  firstWarmUp: `/dashboard/problems/${warmUpIds[0]}`,
} as const;
