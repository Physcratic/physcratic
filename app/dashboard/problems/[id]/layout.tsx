import { jsonLdScript, problemPageGraph } from "@/lib/seo/json-ld";
import { findProblemPage } from "@/lib/seo/problem-pages";

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

// Title, description, canonical and robots come from page.tsx. This layout only adds the structured data
// (BreadcrumbList and LearningResource), built from the same problem model as the page.
export default async function ProblemLayout({ children, params }: Props) {
  const { id } = await params;
  const page = findProblemPage(id);
  return (
    <>
      {page ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(problemPageGraph(page)) }} />
      ) : null}
      {children}
    </>
  );
}
