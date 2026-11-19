import { notFound } from "next/navigation";
import { pagePreview } from "@/lib/og/link-preview";
import { findArticle } from "@/lib/learn/articles";

export const alt = "Physcratic physics olympiad guide";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = findArticle(slug);
  if (!article) notFound();
  return pagePreview({ label: "Learn", title: article.title });
}
