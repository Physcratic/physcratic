import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { GET } from "../app/api/corpus/route";
import {
  catalogCoverage,
  catalogExport,
  catalogProblems,
  catalogProblemSchema,
  competitions,
  filterCatalog,
} from "./corpus-catalog";
import { corpusProblems, corpusDocument } from "./corpus-pilot";
import { corpusProblemSchema } from "./corpus-schema";

// These are schema fixtures only, never published as catalog problems.
function alternateImport() {
  const source = corpusProblems[0];
  return {
    ...source,
    id: "apho-2024-t4",
    competition: "APhO",
    year: 2024,
    code: "T4",
    totalPoints: 20,
    parts: source.parts.map((part) => ({ ...part, points: part.points * 2 })),
    documents: {
      questions: {
        pdf: "/apho/source-questions.pdf",
        images: source.documents.questions.images.map(
          (_, index) => `/apho/statement-${index + 1}.webp`,
        ),
      },
      solutions: {
        pdf: "/apho/source-solutions.pdf",
        images: source.documents.solutions.images.map(
          (_, index) => `/apho/solution-${index + 1}.webp`,
        ),
      },
    },
  };
}

test("catalog contains exactly 100 unique full problems across the agreed competitions", () => {
  assert.equal(catalogProblems.length, 100);
  assert.equal(new Set(catalogProblems.map((problem) => problem.id)).size, 100);
  assert.deepEqual(
    competitions.map(
      (competition) =>
        catalogProblems.filter((problem) => problem.competition === competition)
          .length,
    ),
    [40, 35, 25],
  );
  for (const problem of catalogProblems) {
    assert.equal(
      problem.id,
      `${problem.competition.toLowerCase()}-${problem.year}-${problem.code.toLowerCase()}`,
    );
    assert.match(problem.code, /^T[1-9]\d*$/);
    assert.ok(catalogProblemSchema.safeParse(problem).success);
  }
  const mechanics = catalogProblems.find(
    (problem) => problem.id === "ipho-2016-t1",
  )!;
  assert.equal(mechanics.title, "Two Problems in Mechanics");
  assert.equal(
    catalogProblems.filter((problem) => problem.id.startsWith(mechanics.id))
      .length,
    1,
  );
});

test("catalog displays original document titles, retains provenance and preserves English search aliases", () => {
  const expected = {
    "ipho-2025-t2": "Cox's Timepiece",
    "ipho-2025-t3": "Champagne!",
    "ipho-2018-t2": "Where is the neutrino?",
    "ipho-2017-t3": "Cosmic Inflation",
    "ipho-2023-t1": "Characterization of Soil Colloids",
    "apho-2025-t3": "Atmospheric Physics",
    "apho-2019-t3": "Tippe top",
    "eupho-2018-t2": "Solenoid",
  };
  for (const [id, title] of Object.entries(expected)) {
    const problem = catalogProblems.find((problem) => problem.id === id)!;
    assert.equal(problem.title, title);
    assert.equal(problem.titleOrigin, "original-document");
    assert.equal(problem.titleLanguage, "en");
    assert.match(problem.titleSourceUrl, /^https:\/\//);
  }
  for (const problem of corpusProblems) {
    assert.equal(
      problem.title,
      catalogProblems.find((entry) => entry.id === problem.id)?.title,
    );
  }
  for (const problem of catalogProblems) {
    assert.equal(problem.titleLanguage, "en", problem.id);
    assert.notEqual(problem.titleOrigin, "source-title", problem.id);
    assert.ok(problem.titleSourceUrl.startsWith("https://"), problem.id);
  }
  assert.equal(filterCatalog({ query: "James Cox" })[0]?.id, "ipho-2025-t2");
  assert.equal(
    filterCatalog({ query: "Cox's Timepiece" })[0]?.id,
    "ipho-2025-t2",
  );
});

test("untitled papers retain question labels instead of invented descriptive titles", () => {
  const untitled = catalogProblems.filter(
    (problem) => problem.titleOrigin === "problem-identifier",
  );
  assert.equal(untitled.length, 5);
  for (const problem of untitled) {
    assert.match(problem.title, /^(?:Theoretical Problem|Question) [123]$/);
    assert.equal(problem.titleLanguage, "en");
  }
});

test("verified local English titles match original PDF text, not editorial paraphrases", () => {
  const titles = JSON.parse(
    readFileSync("lib/corpus/original-titles.json", "utf8"),
  ) as Record<string, string>;
  const imageChecked = new Set(["ipho-2017-t2", "ipho-2017-t3"]);
  const normalize = (text: string) =>
    text.normalize("NFKC").replace(/\s+/g, " ");
  for (const [id, title] of Object.entries(titles)) {
    if (imageChecked.has(id)) continue;
    const document = JSON.parse(
      readFileSync(`public/corpus/problems/${id}.json`, "utf8"),
    );
    assert.ok(
      normalize(document.statement.text).includes(normalize(title)),
      `${id}: ${title}`,
    );
  }
});

test("primary-topic accounting meets every target without counting mixed problems twice", () => {
  assert.equal(
    catalogCoverage.reduce((sum, row) => sum + row.count, 0),
    100,
  );
  for (const row of catalogCoverage) {
    assert.equal(row.count, row.target, row.topic);
    assert.equal(
      Object.values(row.byCompetition).reduce((sum, count) => sum + count, 0),
      row.count,
    );
  }
});

test("all 100 records are imported while pilot guides, review and rights status remain honest", () => {
  assert.deepEqual(
    catalogProblems
      .filter((problem) => problem.hasPilotGuide)
      .map((problem) => problem.id)
      .sort(),
    corpusProblems.map((problem) => problem.id).sort(),
  );
  assert.deepEqual(catalogExport.counts, {
    total: 100,
    imported: 100,
    importedPilot: 5,
    sourceLinked: 0,
  });
  assert.equal(catalogExport.publication.license, null);
  for (const problem of catalogProblems) {
    assert.equal(problem.rightsStatus, "permission-review-required");
    assert.equal(problem.reviewStatus, "independent-review-pending");
    assert.equal(problem.rating.elo, null);
    assert.equal(problem.rating.status, "unrated");
    assert.equal("parts" in problem, false);
    assert.equal("context" in problem, false);
    if (problem.sourceKind === "mirror") {
      assert.equal(problem.language, "ru");
      assert.equal(problem.sourceHost, "pho.rs");
      assert.ok(problem.solutionUrl.endsWith("/s"));
    }
  }
});

test("every external statement and solution has recorded successful URL verification", () => {
  const verified = new Map(
    catalogExport.checks.map((check) => [check.url, check.status]),
  );
  for (const problem of catalogProblems) {
    for (const url of [problem.statementUrl, problem.solutionUrl]) {
      if (url.startsWith("/"))
        assert.equal(
          readFileSync(`public${url}`).subarray(0, 5).toString(),
          "%PDF-",
        );
      else assert.ok(verified.has(url), `${problem.id}: ${url}`);
    }
    assert.equal(problem.checkedOn, problem.sourceKind === "english-archive" ? "2026-10-31" : "2026-10-28");
    if (problem.sourceKind === "official-bundle") {
      assert.equal(problem.statementUrl, problem.solutionUrl);
      assert.match(
        problem.statementUrl,
        /^https:\/\/www\.ipho-new\.org\/download\/\d+\/$/,
      );
    }
  }
});

test("catalog search composes competition, year, concept and unrated filters", () => {
  assert.equal(filterCatalog({ query: " APhO 2025 " }).length, 3);
  assert.equal(filterCatalog({ competition: "EuPhO" }).length, 25);
  assert.equal(filterCatalog({ topic: "Mechanics" }).length >= 20, true);
  assert.ok(
    filterCatalog({ topic: "Normal modes", competition: "EuPhO" }).some(
      (problem) => problem.id === "eupho-2017-t1",
    ),
  );
  assert.equal(filterCatalog({ query: "spaceships" })[0]?.id, "eupho-2024-t2");
  assert.equal(filterCatalog({ topic: "Modern" }).length >= 15, true);
  assert.equal(
    filterCatalog({ competition: "APhO", query: "EuPhO" }).length,
    0,
  );
  assert.equal(filterCatalog({ difficulty: "1600-plus" }).length, 0);
  assert.equal(filterCatalog({ difficulty: "unrated" }).length, 100);
});

test("competition search supports partial names, contest years and combined filters", () => {
  assert.equal(filterCatalog({ competition: "" }).length, 100);
  assert.equal(filterCatalog({ competition: "   " }).length, 100);
  assert.equal(filterCatalog({ competition: " ALL " }).length, 100);
  assert.equal(filterCatalog({ competition: " ipho " }).length, 40);
  assert.equal(filterCatalog({ competition: "apho" }).length, 35);
  assert.equal(filterCatalog({ competition: "euph" }).length, 25);

  for (const competition of [" IPhO 2025 ", "ipho-2025", "2025 IPHO"]) {
    const matches = filterCatalog({ competition });
    assert.equal(matches.length, 3);
    assert.ok(
      matches.every(
        (problem) => problem.competition === "IPhO" && problem.year === 2025,
      ),
    );
  }

  const byYear = filterCatalog({ competition: "2025" });
  assert.ok(byYear.length > 0);
  assert.ok(byYear.every((problem) => problem.year === 2025));
  assert.equal(
    filterCatalog({ competition: "IPhO 2025", query: "Champagne" })[0]?.id,
    "ipho-2025-t3",
  );
  assert.ok(
    filterCatalog({ competition: "IPhO 2025", topic: "Thermodynamics" }).some(
      (problem) => problem.id === "ipho-2025-t3",
    ),
  );
  assert.equal(
    filterCatalog({ competition: "IPhO 2025", difficulty: "1600-plus" }).length,
    0,
  );
  assert.equal(filterCatalog({ competition: "unknown contest" }).length, 0);
});

test("catalog rejects unsafe URLs, inconsistent identity and invented ELO", () => {
  const source = catalogProblems[0];
  for (const change of [
    { statementUrl: "javascript:alert(1)" },
    { solutionUrl: "//example.com/solutions" },
    { competition: "APhO" },
    { code: "T1.1" },
    { rating: { status: "rated", elo: 1600 } },
    { rightsStatus: "cleared" },
  ]) {
    assert.equal(
      catalogProblemSchema.safeParse({ ...source, ...change }).success,
      false,
    );
  }
});

test("generalized imports use declared marks and explicit assets without IPhO path inference", () => {
  const parsed = corpusProblemSchema.parse(alternateImport());
  assert.equal(parsed.totalPoints, 20);
  assert.equal(
    corpusDocument(parsed, "questions", 2).image,
    "/apho/statement-2.webp",
  );
  assert.equal(
    corpusDocument(parsed, "solutions", 999).pdf,
    `/apho/source-solutions.pdf#page=${parsed.solutionPages}`,
  );
  assert.equal(
    corpusProblemSchema.safeParse({ ...parsed, totalPoints: 10 }).success,
    false,
  );
  assert.equal(
    corpusProblemSchema.safeParse({ ...parsed, competition: "EuPhO" }).success,
    false,
  );
  assert.equal(
    corpusProblemSchema.safeParse({
      ...parsed,
      documents: {
        ...parsed.documents,
        questions: { ...parsed.documents.questions, images: [] },
      },
    }).success,
    false,
  );
});

test("catalog export and original pilot endpoint remain separate downloadable JSON collections", async () => {
  const response = GET(
    new Request("https://physcratic.test/api/corpus?collection=catalog"),
  );
  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("Content-Disposition")!,
    /physcratic-olympiad-catalog\.json/,
  );
  const catalog = await response.json();
  assert.equal(catalog.problems.length, 100);
  assert.equal(catalog.counts.imported, 100);
  assert.equal(catalog.counts.sourceLinked, 0);
  assert.equal(catalog.imports.problems.length, 100);
  assert.equal(catalog.grading.rated, false);
  const pilot = await GET(
    new Request("https://physcratic.test/api/corpus"),
  ).json();
  assert.equal(pilot.problems.length, 5);
  assert.equal(pilot.integrity.assets.length, 93);
  assert.equal(
    GET(new Request("https://physcratic.test/api/corpus?collection=unknown"))
      .status,
    400,
  );
});
