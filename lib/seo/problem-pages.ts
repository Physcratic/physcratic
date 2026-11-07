/**
 * One model of every public problem page: the 12 practice problems, the Arena problems and the 100 archive
 * problems. The sitemap, llms.txt, the library pages, metadata and structured data all read from it, so a
 * problem cannot be listed in one place and missing from another. Published authored problems are not here on
 * purpose: they stay noindex and out of every list (see docs/engineering/SEARCH_AND_AI_VISIBILITY.md).
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import arena from "../arena/index.json";
import { catalogProblems, type CatalogProblem } from "../corpus-catalog";
import { problems as practiceProblems } from "../physics";
import { physicsTopics, physicsTagLabel } from "../physics-taxonomy";
import { practiceProblemDescription } from "../problem-meta";
import { sentences, sharedSection, statementDescription, statementParagraphs } from "./statement-text";

export type ProblemKind = "practice" | "arena" | "archive";

export interface ProblemPage {
  id: string;
  kind: ProblemKind;
  /** The one canonical path. Archive problems keep their existing /dashboard/problems/<id> URL. */
  path: string;
  /** Heading shown on the page, the official title for archive problems. */
  title: string;
  /** The <title> without the site suffix, short enough that "<metaTitle> | Physcratic" is 60 characters or fewer. */
  metaTitle: string;
  /** 70 to 160 characters, says what the problem asks. */
  description: string;
  topic: string;
  topicSlug: string;
  tags: string[];
  competition?: "IPhO" | "APhO" | "EuPhO";
  year?: number;
  code?: string;
  number?: number;
  /** YYYY-MM-DD from the data. Missing when the data holds no date. */
  lastmod?: string;
  /** Archive only. Plain-text source line and the link to the official file. */
  source?: { line: string; officialUrl: string; officialLabel: string };
  /** False when the page is kept out of search results and the sitemap. */
  indexable: boolean;
  /** True when the page has too little statement text to be worth indexing even when archive indexing is on. */
  thin: boolean;
}

/**
 * Owner decision, 7 November 2026: every archive problem page is noindex and out of the sitemap and llms-full.txt until
 * the team confirms the rights review of the organisers' problems. The pages stay public and linked. Flip this to
 * true only with that confirmation (see docs/engineering/SEARCH_AND_AI_VISIBILITY.md).
 */
export const ARCHIVE_INDEXABLE = false;

export const META_TITLE_BUDGET = 60 - " | Physcratic".length;

export const topicSlug = (name: string): string =>
  physicsTopics.find((topic) => topic.label === name || (topic.aliases as readonly string[]).includes(name))?.id ??
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export const topicName = (slug: string): string | undefined => physicsTopics.find((topic) => topic.id === slug)?.label;

export const problemPath = (id: string) => `/dashboard/problems/${id}`;

/** The copy rules ban en dashes, em dashes and semicolons in text we write, so official titles and statement leads get plain forms. */
export function plainPunctuation(text: string): string {
  return text.replace(/\s*[–—]\s*/g, " - ").replace(/\s*;\s*/g, ", ");
}

/**
 * "WATER-POWERED RICE-POUNDING MORTAR" becomes "Water-Powered Rice-Pounding Mortar" in the <title>. The page heading keeps
 * the official title as written. One-word titles such as "LIGO-GW150914" are acronyms and stay as they are.
 */
export function displayTitle(title: string): string {
  if (title !== title.toUpperCase() || !/[A-Z]/.test(title) || !/\s/.test(title.trim())) return title;
  return title.toLowerCase().replace(/(^|[\s(-])([a-z])/g, (_, lead: string, letter: string) => lead + letter.toUpperCase());
}

export function archiveMetaTitle(title: string, competition: string, year: number, number: number, identifierOnly: boolean): string {
  const long = `${competition} ${year} Problem ${number}`;
  if (identifierOnly) return long;
  const short = `${competition} ${year} P${number}`;
  for (const label of [long, short]) {
    const full = `${title}, ${label}`;
    if (full.length <= META_TITLE_BUDGET) return full;
  }
  const room = META_TITLE_BUDGET - `…, ${short}`.length;
  const cut = title.slice(0, room);
  const space = cut.lastIndexOf(" ");
  return `${cut.slice(0, space > 12 ? space : room).replace(/[\s,;:-]+$/, "")}…, ${short}`;
}

export interface PdfStatement {
  importedOn?: string;
  /** The text for this problem only. For a shared PDF it is the part between this problem's number and the next. */
  text: string;
  shared: boolean;
  pdf?: string;
  /** Page numbers of the shared PDF that hold this problem. */
  sourcePages: number[];
  /** True when a shared PDF could not be split, so the text would repeat on several pages. */
  unsplit: boolean;
}

export function pdfStatement(problem: CatalogProblem): PdfStatement {
  const file = path.join(process.cwd(), "public", problem.importPath);
  const parsed = JSON.parse(readFileSync(file, "utf8")) as {
    importedOn?: string;
    statement: { text?: string; pdf?: string; format: string; shared?: boolean; sourcePages?: number[] };
  };
  const raw = parsed.statement.text ?? "";
  const shared = Boolean(parsed.statement.shared);
  const section = shared ? sharedSection(raw, Number(problem.code.slice(1))) : raw;
  return { importedOn: parsed.importedOn, text: section ?? "", shared, pdf: parsed.statement.pdf, sourcePages: parsed.statement.sourcePages ?? [], unsplit: shared && section === undefined };
}

const THIN_STATEMENT = 400;

function fit(description: string, fallback: string): string {
  const text = description.replace(/\s+/g, " ").trim();
  if (text.length >= 70 && text.length <= 160) return text;
  if (text.length > 160) {
    const cut = text.slice(0, 159);
    const space = cut.lastIndexOf(" ");
    return `${cut.slice(0, space > 100 ? space : 159).replace(/[\s,;:(-]+$/, "")}…`;
  }
  return `${text} ${fallback}`.replace(/\s+/g, " ").trim().slice(0, 160);
}

function archivePage(problem: CatalogProblem): ProblemPage {
  const number = Number(problem.code.slice(1));
  const identifierOnly = problem.titleOrigin === "problem-identifier";
  const title = identifierOnly ? `${problem.competition} ${problem.year} Problem ${number}` : problem.title;
  const imported = pdfStatement(problem);
  const text = imported.text;
  const body = statementParagraphs(text, problem.title).join(" ");
  const thin = body.length < THIN_STATEMENT;
  const concepts = problem.tags.slice(0, 3).map((tag) => physicsTagLabel(tag)).join(", ");
  const prefix = `${problem.competition} ${problem.year} problem ${number}, ${problem.primaryTopic.toLowerCase()}:`;
  const description = thin
    ? fit(`${problem.competition} ${problem.year} theory problem ${number} on ${concepts || problem.primaryTopic.toLowerCase()}. Open the official problem and check your own working.`, "")
    : plainPunctuation(statementDescription(text, prefix, problem.title));
  return {
    id: problem.id,
    kind: "archive",
    path: problemPath(problem.id),
    title,
    metaTitle: archiveMetaTitle(plainPunctuation(displayTitle(title)), problem.competition, problem.year, number, identifierOnly),
    description,
    topic: problem.primaryTopic,
    topicSlug: topicSlug(problem.primaryTopic),
    tags: [...problem.tags],
    competition: problem.competition,
    year: problem.year,
    code: problem.code,
    number,
    lastmod: imported.importedOn ?? problem.checkedOn,
    source: {
      line: `${problem.competition} ${problem.year}, Problem ${number}.`,
      officialUrl: problem.statementUrl,
      officialLabel: "Official problem (PDF)",
    },
    indexable: ARCHIVE_INDEXABLE && !thin,
    thin,
  };
}

function arenaPage(entry: (typeof arena.problems)[number]): ProblemPage {
  return {
    id: entry.id,
    kind: "arena",
    path: problemPath(entry.id),
    title: entry.title,
    metaTitle: entry.title.length <= META_TITLE_BUDGET ? entry.title : `${entry.title.slice(0, META_TITLE_BUDGET - 1).trimEnd()}…`,
    description: fit(entry.summary, `A Physcratic Arena ${entry.topic.toLowerCase()} problem with a worked solution.`),
    topic: entry.topic,
    topicSlug: topicSlug(entry.topic),
    tags: [...entry.tags],
    lastmod: entry.importedOn,
    indexable: true,
    thin: false,
  };
}

function practicePage(problem: (typeof practiceProblems)[number]): ProblemPage {
  const known = practiceProblemDescription(problem.id);
  return {
    id: problem.id,
    kind: "practice",
    path: problemPath(problem.id),
    title: problem.title,
    metaTitle: problem.title,
    description: fit(known ?? problem.prompt, `A ${problem.topic.toLowerCase()} practice problem with a checked numerical answer.`),
    topic: problem.topic,
    topicSlug: topicSlug(problem.topic),
    tags: [problem.concept],
    lastmod: problem.addedAt,
    indexable: true,
    thin: false,
  };
}

let cache: ProblemPage[] | undefined;

/** Every public problem page: practice, then Arena, then the archive in catalogue order. */
export function allProblemPages(): ProblemPage[] {
  cache ??= [...practiceProblems.map(practicePage), ...arena.problems.map(arenaPage), ...catalogProblems.map(archivePage)];
  return cache;
}

export function findProblemPage(id: string): ProblemPage | undefined {
  return allProblemPages().find((page) => page.id === id);
}

export function problemsInTopic(slug: string): ProblemPage[] {
  return allProblemPages().filter((page) => page.topicSlug === slug);
}

/** Topics that have at least one problem, in the taxonomy's order. */
export function topicsWithProblems(): { slug: string; name: string; count: number }[] {
  return physicsTopics
    .map((topic) => ({ slug: topic.id, name: topic.label, count: problemsInTopic(topic.id).length }))
    .filter((topic) => topic.count > 0);
}

/**
 * 3 to 5 related problems. Same olympiad and year first (other papers of that exam), then the same topic with the
 * most shared tags, then the same topic in catalogue order, wrapping round from this problem so that each page
 * links to different neighbours and no page is left out.
 */
export function relatedProblems(page: ProblemPage, limit = 5): ProblemPage[] {
  // Every page is public, so related links include archive pages even while they are noindex. Pages with no text are skipped.
  const all = allProblemPages().filter((other) => other.id !== page.id && !other.thin);
  const sameExam = page.competition
    ? all.filter((other) => other.competition === page.competition && other.year === page.year)
    : [];
  const sameTopic = all.filter((other) => other.topicSlug === page.topicSlug);
  const score = (other: ProblemPage) => other.tags.filter((tag) => page.tags.includes(tag)).length;
  const ranked = [...sameTopic].sort((a, b) => score(b) - score(a));
  const order = all.map((other) => other.id);
  const here = allProblemPages().findIndex((other) => other.id === page.id);
  const rest = all.filter((other) => !sameExam.includes(other) && !ranked.includes(other));
  rest.sort((a, b) => ((order.indexOf(a.id) - here + all.length) % all.length) - ((order.indexOf(b.id) - here + all.length) % all.length));
  const picked: ProblemPage[] = [];
  const take = (list: ProblemPage[], max: number) => {
    for (const other of list) {
      if (picked.length >= Math.min(limit, max)) return;
      if (!picked.includes(other)) picked.push(other);
    }
  };
  take(sameExam, 2);
  take(ranked, limit);
  take(rest, limit);
  return picked.slice(0, limit);
}

export function firstSentenceOf(page: ProblemPage, text: string): string {
  const paragraph = statementParagraphs(text, page.title)[0] ?? "";
  return sentences(paragraph)[0] ?? paragraph;
}

export interface ArchiveStatementView {
  /** The statement as paragraphs of text taken from the official PDF. */
  paragraphs: string[];
  /** Rendered pages of the official PDF that hold the problem, with alt text. Figures and equations are in these. */
  pageImages: { src: string; alt: string }[];
  /** The copy of the official PDF stored on this site. */
  pdfHref?: string;
}

export function archiveStatementView(page: ProblemPage): ArchiveStatementView | undefined {
  const problem = catalogProblems.find((item) => item.id === page.id);
  if (!problem) return undefined;
  const statement = pdfStatement(problem);
  const folder = statement.pdf?.replace(/\/document\.pdf$/, "");
  const label = `${page.title}, ${page.competition} ${page.year} Problem ${page.number}`;
  const numbers = statement.sourcePages.length ? statement.sourcePages.map((_, index) => index + 1) : [];
  const pageImages = folder
    ? numbers
        .filter((n) => existsSync(path.join(process.cwd(), "public", folder, `page-${n}.webp`)))
        .map((n) => ({ src: `${folder}/page-${n}.webp`, alt: `${label}, statement page ${n} of ${numbers.length}, with the figures and equations` }))
    : [];
  return { paragraphs: statementParagraphs(statement.text, problem.title), pageImages, pdfHref: statement.pdf };
}

/** The Arena statement as source text, read at build time so it is in the HTML. */
export function arenaStatementText(id: string): string | undefined {
  const entry = arena.problems.find((item) => item.id === id);
  if (!entry) return undefined;
  const parsed = JSON.parse(readFileSync(path.join(process.cwd(), "public", entry.path), "utf8")) as { statement?: string };
  return parsed.statement;
}

/** Title and description of a topic page, shared by the page and the metadata guard test. */
export function topicPageCopy(name: string, count: number) {
  return {
    title: `${name} physics olympiad problems`,
    description: `${count} ${name.toLowerCase()} problems from IPhO, APhO, EuPhO, Physcratic Arena and practice sets, each with its own page and a checked answer where there is one.`,
  };
}
