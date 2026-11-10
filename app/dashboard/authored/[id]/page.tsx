import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { StudentPageClient } from "@/components/authored/student-page-client";
import { authoredAttributionEnabled } from "@/lib/authored-attribution-route";
import { publicStudentRevision, type PublicRevision } from "@/lib/authored-student";
import {communityModerationUiEnabled} from '@/lib/community/moderation-route';
import {communityProblemStatsEnabled} from '@/lib/community/problem-stats-route';
import {communityDiscussionReady as communityCommentsEnabled} from '@/lib/community/comments-route';
export const metadata: Metadata = {
  // Keep this interactive account/permission surface out of search engines.
  // Discovery is public in the library; no private or withdrawn title metadata,
  // sitemap entry, static generation or cached historical statement is emitted.
  title: "Authored problem · Practice",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * The published statement, read on the server through the same public read the API uses (published problems only,
 * private parts and solutions never included), so it is in the HTML before any script runs. Any failure returns
 * null and the page loads the statement in the browser as before. The page stays noindex.
 */
async function publishedRevision(id: string): Promise<PublicRevision | null> {
  try {
    const { problemAuthoringApi } = await import("@/lib/problem-authoring-server");
    const response = await problemAuthoringApi("public", new Request(`http://localhost/api/authored-problems/${id}`), id);
    if (!response.ok) return null;
    return publicStudentRevision(await response.json(), id);
  } catch {
    return null;
  }
}
export default async function AuthoredProblemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const parsed = z.uuid().safeParse((await params).id);
  if (!parsed.success) notFound();
  const initialRevision = await publishedRevision(parsed.data.toLowerCase());
  return <StudentPageClient attributionEnabled={authoredAttributionEnabled()} initialRevision={initialRevision} moderationEnabled={communityModerationUiEnabled()} commentsEnabled={communityCommentsEnabled()} statsEnabled={communityProblemStatsEnabled()} problemId={parsed.data.toLowerCase()} />;
}
