import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Layout from "@/components/kokonutui/layout";
import { ProblemReader } from "@/components/physics/problem-reader";
import { problems } from "@/lib/physics";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const problem = problems.find((item) => item.id === id);
  return {
    title: problem?.title ?? "Problem not found",
    description: problem?.prompt,
  };
}

export default async function PracticeProblemPage({ params }: Props) {
  const { id } = await params;
  const problem = problems.find((item) => item.id === id);
  if (!problem) notFound();
  return (
    <Layout view="problems">
      <ProblemReader key={problem.id} problem={problem} />
    </Layout>
  );
}
