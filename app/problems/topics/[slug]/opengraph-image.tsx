import { notFound } from "next/navigation";
import { pagePreview } from "@/lib/og/link-preview";
import { topicName } from "@/lib/seo/problem-pages";

export const alt = "Physcratic physics olympiad problems by topic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const name = topicName((await params).slug);
  if (!name) notFound();
  return pagePreview({ label: "Problems", title: `${name} problems` });
}
