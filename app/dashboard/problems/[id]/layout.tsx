import type { Metadata } from "next";
import { baseOpenGraph } from "@/lib/site";
import {
  jsonLdScript,
  problemGraph,
  problemSummary,
} from "@/lib/seo/json-ld";
import { findPublicProblem } from "@/lib/seo/public-routes";

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

// Title and description stay with page.tsx. Next replaces openGraph wholesale,
// so og:title/og:description are set here too.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const problem = findPublicProblem(id);
  if (!problem) return {};
  const path = `/dashboard/problems/${problem.id}`;
  return {
    alternates: { canonical: path },
    openGraph: {
      ...baseOpenGraph,
      type: "article",
      title: problem.title,
      description: problemSummary(problem),
      url: path,
    },
  };
}

export default async function ProblemLayout({ children, params }: Props) {
  const { id } = await params;
  const problem = findPublicProblem(id);
  return (
    <>
      {problem ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(problemGraph(problem)) }}
        />
      ) : null}
      {children}
    </>
  );
}
