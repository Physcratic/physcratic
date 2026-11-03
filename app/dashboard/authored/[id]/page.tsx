import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { StudentPageClient } from "@/components/authored/student-page-client";
import {communityProblemStatsEnabled} from '@/lib/community/problem-stats-route';
import {communityCommentsEnabled} from '@/lib/community/comments-route';
export const metadata: Metadata = {
  // Keep this interactive account/permission surface out of search engines.
  // Discovery is public in the library; no private or withdrawn title metadata,
  // sitemap entry, static generation or cached historical statement is emitted.
  title: "Authored problem · Practice",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function AuthoredProblemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const parsed = z.uuid().safeParse((await params).id);
  if (!parsed.success) notFound();
  return <StudentPageClient commentsEnabled={communityCommentsEnabled()} statsEnabled={communityProblemStatsEnabled()} problemId={parsed.data.toLowerCase()} />;
}
