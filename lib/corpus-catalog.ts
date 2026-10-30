import { z } from "zod";
import sources from "./corpus/catalog-sources.json";
import originalTitles from "./corpus/original-titles.json";
import englishTitleReferences from "./corpus/english-title-references.json";
import imports from "./corpus/import-index.json";
import translationIndex from "./corpus/translation-index.json";
import {
  catalogSelection,
  catalogTopics,
  type Competition,
} from "./corpus/catalog-selection";
import { corpusProblems } from "./corpus-pilot";
import { tagLabel } from "./problem-tags";

const httpsUrl = z.string().url().startsWith("https://");
const catalogSourceSchema = z.object({
  id: z.string().regex(/^(ipho|apho|eupho)-\d{4}-t[1-9]\d*$/),
  checkedOn: z.string().date(),
  sourceTitle: z.string().nullable(),
  statementUrl: httpsUrl,
  solutionUrl: z.union([
    httpsUrl,
    z.string().regex(/^\/ipho\/\d{4}-t[123]-solutions\.pdf$/),
  ]),
  sourceHost: z.enum(["eupho.ee", "ipho-new.org", "ipho2025.fr", "pho.rs"]),
  language: z.enum(["en", "ru"]),
  sourceKind: z.enum([
    "official-pdf",
    "official-bundle",
    "imported-official",
    "mirror",
  ]),
  discoveryUrl: httpsUrl,
});

export const catalogProblemSchema = catalogSourceSchema
  .extend({
    competition: z.enum(["IPhO", "APhO", "EuPhO"]),
    year: z.number().int().min(1967).max(2026),
    code: z.string().regex(/^T[1-9]\d*$/),
    title: z.string().min(1),
    titleLanguage: z.enum(["en", "ru"]),
    titleOrigin: z.enum([
      "original-document",
      "source-title",
      "problem-identifier",
    ]),
    titleSourceUrl: httpsUrl,
    searchAliases: z.array(z.string()),
    primaryTopic: z.enum(catalogTopics),
    topics: z.array(z.enum(catalogTopics)).min(1),
    tags: z.array(z.string().min(1)).min(2).max(5),
    availability: z.literal("imported"),
    hasPilotGuide: z.boolean(),
    importPath: z
      .string()
      .regex(/^\/corpus\/problems\/(ipho|apho|eupho)-\d{4}-t\d+\.json$/),
    importLanguage: z.enum(["en", "ru"]),
    attribution: z.string().min(20),
    reviewStatus: z.literal("independent-review-pending"),
    rightsStatus: z.literal("permission-review-required"),
    rating: z.object({ status: z.literal("unrated"), elo: z.null() }),
  })
  .superRefine((problem, context) => {
    if (
      problem.id !==
      `${problem.competition.toLowerCase()}-${problem.year}-${problem.code.toLowerCase()}`
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Identity does not match competition, year and full problem code",
      });
    if (
      new Set(problem.tags).size !== problem.tags.length ||
      !problem.topics.includes(problem.primaryTopic)
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duplicate concepts or missing primary topic",
      });
  });

export type CatalogProblem = z.infer<typeof catalogProblemSchema>;
const sourceById = new Map(
  sources.problems.map((source) => [
    source.id,
    catalogSourceSchema.parse(source),
  ]),
);
const importedById = new Map(
  corpusProblems.map((problem) => [problem.id, problem]),
);
const documentById = new Map(
  imports.problems.map((problem) => [problem.id, problem]),
);

export const catalogProblems: CatalogProblem[] = (
  Object.entries(catalogSelection) as [
    Competition,
    (typeof catalogSelection)[Competition],
  ][]
).flatMap(([competition, selection]) =>
  selection.map(([year, code, title, primaryTopic, tags]) => {
    const id = `${competition.toLowerCase()}-${year}-${code.toLowerCase()}`;
    const imported = importedById.get(id);
    const source = sourceById.get(id);
    if (!source) throw new Error(`Missing verified catalog source: ${id}`);
    const document = documentById.get(id);
    if (!document)
      throw new Error(`Missing imported statement and solution: ${id}`);
    const englishReference = (
      englishTitleReferences as Record<
        string,
        { title: string; url: string; untitled?: boolean }
      >
    )[id];
    const originalTitle =
      englishReference?.title ?? (originalTitles as Record<string, string>)[id];
    const sourceTitle = source.sourceTitle?.includes("�")
      ? null
      : source.sourceTitle;
    const displayTitle =
      originalTitle ?? sourceTitle ?? `${competition} ${year} ${code}`;
    return catalogProblemSchema.parse({
      ...source,
      competition,
      year,
      code,
      title: displayTitle,
      titleLanguage: /[А-Яа-яЁё]/.test(displayTitle) ? "ru" : "en",
      titleOrigin: englishReference?.untitled
        ? "problem-identifier"
        : originalTitle
          ? "original-document"
          : sourceTitle
            ? "source-title"
            : "problem-identifier",
      titleSourceUrl: englishReference?.url ?? source.statementUrl,
      searchAliases: [title],
      primaryTopic,
      tags,
      topics: [
        ...new Set([primaryTopic, ...(imported?.topics.map(tagLabel) ?? [])]),
      ],
      availability: "imported",
      hasPilotGuide: Boolean(imported),
      importPath: document.path,
      importLanguage: document.language,
      attribution: `${competition} ${year}, theoretical problem ${code}. Original problem credited to the competition organisers. ${source.sourceKind === "mirror" ? "Russian statement and solution hosted by pho.rs. Translation and solution authorship require review." : "Linked from the competition’s source archive. See the original documents for contributor credits."}`,
      reviewStatus: "independent-review-pending",
      rightsStatus: "permission-review-required",
      rating: { status: "unrated", elo: null },
    });
  }),
);

export const competitions = ["IPhO", "APhO", "EuPhO"] as const;
export const coverageTargets = {
  Mechanics: 20,
  Electromagnetism: 20,
  Waves: 15,
  Thermodynamics: 15,
  Optics: 15,
  "Modern physics": 15,
};
export const catalogCoverage = catalogTopics.map((topic) => ({
  topic,
  target: coverageTargets[topic],
  count: catalogProblems.filter((problem) => problem.primaryTopic === topic)
    .length,
  byCompetition: Object.fromEntries(
    competitions.map((competition) => [
      competition,
      catalogProblems.filter(
        (problem) =>
          problem.primaryTopic === topic && problem.competition === competition,
      ).length,
    ]),
  ),
}));

export function filterCatalog({
  query = "",
  topic = "all",
  competition = "all",
  difficulty = "all",
}: {
  query?: string;
  topic?: string;
  competition?: string;
  difficulty?: string;
}) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return catalogProblems.filter((problem) => {
    const searchable = [
      problem.title,
      problem.sourceTitle,
      ...problem.searchAliases,
      problem.id,
      problem.competition,
      problem.year,
      problem.code,
      ...problem.topics,
      ...problem.tags,
    ]
      .join(" ")
      .toLocaleLowerCase();
    return (
      (competition === "all" || problem.competition === competition) &&
      (difficulty === "all" || difficulty === "unrated") &&
      (topic === "all" ||
        [...problem.topics, ...problem.tags].includes(tagLabel(topic))) &&
      words.every((word) => searchable.includes(word))
    );
  });
}

export const catalogExport = {
  schemaVersion: "2.0.0",
  collection: "olympiad-imported-corpus-100",
  checkedOn: sources.checkedOn,
  verification: sources.verification,
  notes:
    "100 distinct imported theory statements: 40 IPhO, 35 APhO, 25 EuPhO. Local source JSON, diagrams, PDF layouts and shared material are retained. Some imported mirror solution pages contain only repeated questions, not worked derivations. See the solution-readiness audit. English drafts are stored separately and retain original source hashes. Includes the original five structured pilot guides. No imported source is an approved grading rubric. Independent physics, translation and rights reviews remain pending.",
  publication: {
    mode: "imported-local-corpus",
    rightsStatus: "permission-review-required",
    license: null,
  },
  grading: { mode: "self-review", rated: false, elo: null },
  counts: {
    total: catalogProblems.length,
    imported: imports.count,
    importedPilot: importedById.size,
    sourceLinked: 0,
  },
  coverage: catalogCoverage,
  problems: catalogProblems,
  checks: sources.checks,
  imports,
  translations: translationIndex,
};
