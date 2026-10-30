import threeBody from "./corpus/ipho-2011-t1.json";
import solar from "./corpus/ipho-2015-t1.json";
import assets from "../public/corpus-assets.json";
import { iphoPapers, iphoSubproblems } from "./ipho-archive";
import { corpusProblemSchema, type CorpusProblem } from "./corpus-schema";
import { getProblemTags, tagLabel } from "./problem-tags";

const topicMap: Record<string, CorpusProblem["topics"]> = {
  t1: ["Modern", "Mechanics"],
  t2: ["Mechanics", "Thermodynamics"],
  t3: ["Thermodynamics", "Waves"],
};
const tagMap: Record<string, string[]> = {
  t1: [
    "Bohr model",
    "Hydrogen spectrum",
    "Rotation curves",
    "Dark matter",
    "MOND",
  ],
  t2: [
    "Hydrostatics",
    "Vapour pressure",
    "Barometric clock",
    "Friction",
    "Energy harvesting",
  ],
  t3: [
    "Surface tension",
    "Henry’s law",
    "Bubble dynamics",
    "Acoustics",
    "Ideal gases",
  ],
};

const theory2025 = iphoPapers
  .filter((paper) => paper.kind === "Theory")
  .map((paper) => ({
    id: `ipho-2025-${paper.id}`,
    year: 2025,
    code: paper.code,
    title: paper.title,
    topics: topicMap[paper.id],
    tags: tagMap[paper.id],
    summary: paper.introduction,
    attribution: `55th International Physics Olympiad, France, 2025, ${paper.code}. Original statements, figures, answer sheets, and solutions are credited to the IPhO 2025 organisers. See the original paper for contributor and image credits.`,
    sourceUrl: "https://www.ipho2025.fr/sujets-officiels-ipho-france-2025",
    pages: paper.pages,
    solutionPages: paper.solutionPages,
    sections: paper.sections.map((section) => ({
      id: section.letter,
      title: section.title,
    })),
    context: [{ type: "text", value: paper.introduction }],
    parts: iphoSubproblems
      .filter((part) => part.paperId === paper.id)
      .map((part) => ({
        id: part.part,
        section: part.part[0],
        title: part.title,
        points: part.points,
        page: part.page,
        solutionPage: part.solutionPage,
        prompt: part.prompt,
        ...(part.model ? { model: part.model } : {}),
      })),
  }));

export const corpusProblems = [threeBody, solar, ...theory2025].map(
  (problem) => {
    const documents =
      assets.documents[problem.id as keyof typeof assets.documents];
    if (!documents)
      throw new Error(`Missing explicit document assets: ${problem.id}`);
    return corpusProblemSchema.parse({
      ...problem,
      competition: "IPhO",
      totalPoints: 10,
      documents,
    });
  },
);

export function corpusDocument(
  problem: CorpusProblem,
  kind: "questions" | "solutions",
  page = 1,
) {
  const document = problem.documents[kind];
  const count = document.images.length;
  const safePage = Number.isInteger(page)
    ? Math.max(1, Math.min(count, page))
    : 1;
  return {
    pdf: `${document.pdf}#page=${safePage}`,
    image: document.images[safePage - 1],
    pages: count,
    page: safePage,
  };
}

export function filterCorpus({
  query = "",
  topic = "all",
  difficulty = "all",
}: {
  query?: string;
  topic?: string;
  difficulty?: string;
}) {
  const search = query.trim().toLowerCase();
  return corpusProblems.filter(
    (problem) =>
      (topic === "all" || getProblemTags(problem).includes(tagLabel(topic))) &&
      (difficulty === "all" || difficulty === "unrated") &&
      [
        problem.title,
        problem.year,
        problem.code,
        problem.competition,
        problem.summary,
        ...getProblemTags(problem),
        ...problem.parts.map((part) => `${part.title} ${part.prompt}`),
      ]
        .join(" ")
        .toLowerCase()
        .includes(search),
  );
}

export const corpusPilot = {
  schemaVersion: "1.0.0",
  batchId: "ipho-theory-pilot-001",
  status: "source-fidelity-pilot",
  importedAt: null,
  provenanceCheckedOn: "2026-10-28",
  notes:
    "Five existing official-source PDFs indexed across IPhO 2011, 2015, and 2025. No claim of cross-competition coverage. Native text is an editorial restatement, not a complete verbatim transcription. Original pages remain authoritative for shared context, constants, figures, and tables. No publication date is fabricated for existing files.",
  reuse: {
    status: "permission-review-required",
    license: null,
    evidenceUrls: [
      "https://www.ipho-new.org/documentations/",
      "https://www.ipho2025.fr/mentions-legales",
    ],
    notes:
      "No explicit redistribution or commercial-use permission was verified. Public access is not a reuse license. Do not treat this pilot, including embedded third-party figures, as cleared for wider republication.",
  },
  grading: {
    mode: "self-review",
    rated: false,
    elo: null,
    notes:
      "No automatic correctness, accepted-solution, leaderboard, or Elo claims. Existing isolated calculator adaptations are not full-problem judges.",
  },
  review: {
    status: "cofounder-review-pending",
    checks: [
      "Original assets and subpart/point counts validated",
      "2011 equal-mass assumption and 2015 constants checked visually",
    ],
    remaining: [
      "Independent physics review of all restatements and solution-page mappings",
      "Full native transcription of shared setup and figures",
      "Rights clearance before expansion or wider republication",
    ],
  },
  problems: corpusProblems.map((problem) => ({
    ...problem,
    statement: {
      mode: "original-pages-with-editorial-index",
      pdf: corpusDocument(problem, "questions").pdf.split("#")[0],
      pages: Array.from(
        { length: problem.pages },
        (_, i) => corpusDocument(problem, "questions", i + 1).image,
      ),
    },
    solution: {
      mode: "official-pdf",
      pdf: corpusDocument(problem, "solutions").pdf.split("#")[0],
      pages: Array.from(
        { length: problem.solutionPages },
        (_, i) => corpusDocument(problem, "solutions", i + 1).image,
      ),
    },
    rating: { elo: null, status: "uncalibrated" },
    importedAt: null,
  })),
  integrity: assets,
};
