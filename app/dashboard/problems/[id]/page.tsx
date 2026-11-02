import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Layout from "@/components/kokonutui/layout";
import { ProblemReader } from "@/components/physics/problem-reader";
import { problems } from "@/lib/physics";
import { practiceProblemDescription } from "@/lib/problem-meta";
import { catalogProblems } from "@/lib/corpus-catalog";
import { ImportedProblemRoute } from "@/components/physics/imported-problem-route";
import { ArenaProblemReader } from "@/components/physics/arena-problem-reader";
import arena from "@/lib/arena/index.json";
import type { ArenaCatalogEntry } from "@/lib/arena-schema";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const problem = problems.find((item) => item.id === id);
  const imported = catalogProblems.find((item) => item.id === id);
  const arenaProblem = arena.problems.find((item) => item.id === id);
  return {
    title: problem?.title ?? imported?.title ?? arenaProblem?.title ?? "Problem not found",
    description: arenaProblem?.summary ?? (problem ? (practiceProblemDescription(problem.id) ?? problem.prompt) : undefined) ?? (imported ? `${imported.competition} ${imported.year} ${imported.code}: original English problem and solution PDFs, with plain-text solution submission.` : undefined),
  };
}

export default async function PracticeProblemPage({ params }: Props) {
  const { id } = await params;
  const arenaProblem = arena.problems.find((item) => item.id === id);
  if (arenaProblem) return <Layout view="problems"><ArenaProblemReader problem={arenaProblem as ArenaCatalogEntry} /></Layout>;
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
