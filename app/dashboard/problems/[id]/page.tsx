import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Layout from "@/components/kokonutui/layout";
import { ProblemReader } from "@/components/physics/problem-reader";
import { problems } from "@/lib/physics";
import { catalogProblems } from "@/lib/corpus-catalog";
import { ImportedProblemRoute } from "@/components/physics/imported-problem-route";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const problem = problems.find((item) => item.id === id);
  const imported = catalogProblems.find((item) => item.id === id);
  return {
    title: problem?.title ?? imported?.title ?? "Problem not found",
    description: problem?.prompt ?? (imported ? `${imported.competition} ${imported.year} ${imported.code}: original English problem and solution PDFs, with plain-text solution submission.` : undefined),
  };
}

export default async function PracticeProblemPage({ params }: Props) {
  const { id } = await params;
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
