import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProblemRoom } from "@/components/physics/problem-room";
import { ProblemReader } from "@/components/physics/problem-reader";
import { problems } from "@/lib/physics";
import { catalogProblems } from "@/lib/corpus-catalog";
import { ImportedProblemRoute } from "@/components/physics/imported-problem-route";
import { ArenaProblemReader } from "@/components/physics/arena-problem-reader";
import { ArenaDocument } from "@/components/physics/arena-document";
import { ArchiveStatementText } from "@/components/problems/archive-statement";
import { CrumbTrail, RelatedProblems } from "@/components/problems/problem-links";
import arena from "@/lib/arena/index.json";
import type { ArenaCatalogEntry } from "@/lib/arena-schema";
import { problemCrumbs } from "@/lib/seo/json-ld";
import {
  allProblemPages,
  archiveStatementView,
  arenaStatementText,
  findProblemPage,
  relatedProblems,
} from "@/lib/seo/problem-pages";
import { baseOpenGraph } from "@/lib/site";

import {communityModerationUiEnabled} from '@/lib/community/moderation-route';
import {communityProblemStatsEnabled} from '@/lib/community/problem-stats-route';
import {communityDiscussionReady as communityCommentsEnabled} from '@/lib/community/comments-route';
type Props = { params: Promise<{ id: string }> };

// Every practice, Arena and archive problem is built once, at build time, so the statement is in the HTML.
// Published authored problems have their own route and stay dynamic.
export const dynamicParams = false;

export function generateStaticParams() {
  return allProblemPages().map((page) => ({ id: page.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const page = findProblemPage(id);
  if (!page) return { title: "Problem not found" };
  return {
    title: page.metaTitle,
    description: page.description,
    alternates: { canonical: page.path },
    // A page with too little statement text to be useful stays out of search results. Its links still count.
    ...(page.indexable ? {} : { robots: { index: false, follow: true } }),
    openGraph: { ...baseOpenGraph, type: "article", title: page.metaTitle, description: page.description, url: page.path },
  };
}

export default async function PracticeProblemPage({ params }: Props) {
  const { id } = await params;
  const page = findProblemPage(id);
  if (!page) notFound();
  const crumbs = <div className="mx-auto w-full max-w-4xl"><CrumbTrail crumbs={problemCrumbs(page)} /></div>;
  const related = <div className="mx-auto mt-8 w-full max-w-4xl"><RelatedProblems page={page} related={relatedProblems(page)} /></div>;

  const arenaProblem = arena.problems.find((item) => item.id === id);
  if (arenaProblem) {
    const text = arenaStatementText(id);
    return (
      <ProblemRoom>
        {crumbs}
        <ArenaProblemReader
          moderationEnabled={communityModerationUiEnabled()}
          commentsEnabled={communityCommentsEnabled()}
          statsEnabled={communityProblemStatsEnabled()}
          problem={arenaProblem as ArenaCatalogEntry}
          statement={text ? <ArenaDocument content={text} staticFigures /> : undefined}
        />
        {related}
      </ProblemRoom>
    );
  }
  const problem = problems.find((item) => item.id === id);
  if (!problem) {
    const imported = catalogProblems.find((item) => item.id === id);
    if (!imported) notFound();
    const view = archiveStatementView(page);
    return (
      <ProblemRoom>
        {crumbs}
        <ImportedProblemRoute problem={imported.titleOrigin === "problem-identifier" ? { ...imported, title: page.title, titleLanguage: "en" } : imported} initialData={view?.native} />
        <div className="mx-auto mt-8 flex w-full max-w-4xl flex-col gap-8">
          {view && !view.native && <ArchiveStatementText page={page} view={view} />}
        </div>
        {related}
      </ProblemRoom>
    );
  }
  return (
    <ProblemRoom>
      {crumbs}
      <ProblemReader key={problem.id} problem={problem} />
      {related}
    </ProblemRoom>
  );
}
