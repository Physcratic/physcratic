import { notFound } from "next/navigation";
import { pagePreview } from "@/lib/og/link-preview";
import { findProblemImage } from "@/lib/seo/problem-image";

export const alt = "Physcratic physics olympiad problem";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const problem = findProblemImage(id);
  if (!problem) notFound();
  return pagePreview({ label: problem.topic, title: problem.metaTitle });
}
