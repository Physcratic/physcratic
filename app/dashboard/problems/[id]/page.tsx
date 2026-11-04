import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Layout from "@/components/kokonutui/layout";
import { ProblemReader } from "@/components/physics/problem-reader";
import { problems } from "@/lib/physics";
import { problemPageMetadata } from "@/lib/seo/problem-descriptions";
import { catalogProblems } from "@/lib/corpus-catalog";
import { ImportedProblemRoute } from "@/components/physics/imported-problem-route";
import { ArenaProblemReader } from "@/components/physics/arena-problem-reader";
import arena from "@/lib/arena/index.json";
import type { ArenaCatalogEntry } from "@/lib/arena-schema";

import {communityProblemStatsEnabled} from '@/lib/community/problem-stats-route';
import {communityCommentsEnabled} from '@/lib/community/comments-route';
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const problem = problems.find((item) => item.id === id);
  const imported = catalogProblems.find((item) => item.id === id);
  const arenaProblem = arena.problems.find((item) => item.id === id);
  const selected = problem ?? imported ?? arenaProblem;
  return selected ? problemPageMetadata(selected) : { title: "Problem not found" };
}

export default async function PracticeProblemPage({ params }: Props) {
  const { id } = await params;
  const arenaProblem = arena.problems.find((item) => item.id === id);
  if (arenaProblem) return <Layout view="problems"><ArenaProblemReader commentsEnabled={communityCommentsEnabled()} statsEnabled={communityProblemStatsEnabled()} problem={arenaProblem as ArenaCatalogEntry} /></Layout>;
  const problem = problems.find((item) => item.id === id);
  if (!problem) {
    const imported = catalogProblems.find((item) => item.id === id);
    if (!imported) notFound();
    return <Layout view="problems"><ImportedProblemRoute problem={imported} /></Layout>;
  }
  return (
    <Layout view="problems">
      <ProblemReader key={problem.id} problem={problem} />
    </Layout>
  );
}
