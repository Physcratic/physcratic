import { notFound } from "next/navigation";
import { specimens } from "../../catalog";
import { PreviewSurface, Specimen } from "../../specimen";
import { RelatedProblems } from "@/components/problems/problem-links";
import { findProblemPage, relatedProblems } from "@/lib/seo/problem-pages";

export default async function PreviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ theme?: string }> }) {
  const { id } = await params;
  const { theme } = await searchParams;
  const item = specimens.find(entry => entry.id === id);
  if (!item) notFound();
  const page = id === "related" ? findProblemPage("arena-walking-past-two-speakers") : undefined;
  return <PreviewSurface theme={theme === "dark" ? "dark" : "light"}>
    {id === "frame" ? <Specimen id={id} /> : <main className="min-w-0 space-y-6 p-4 sm:p-6"><h1 className="text-lg font-semibold">{item.title} specimen</h1>{page ? <RelatedProblems page={page} related={relatedProblems(page)} /> : <Specimen id={id} />}</main>}
  </PreviewSurface>;
}
