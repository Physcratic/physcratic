"use client";
import type { PublicSolution } from "@/lib/authored-public-solution-contracts";
import { authClient } from "@/lib/auth-client";
import type { PublicRevision, Viewer } from "@/lib/authored-student";
import { StudentWorkspace } from "./student-workspace";
export function StudentPageClient({ problemId,initialRevision,statsEnabled=false,commentsEnabled=false,moderationEnabled=false,attributionEnabled=false,publicSolutionsEnabled=false,initialSolution,completionsEnabled=false }: { problemId: string;initialRevision?: PublicRevision | null;statsEnabled?:boolean;commentsEnabled?:boolean;moderationEnabled?:boolean;attributionEnabled?:boolean;publicSolutionsEnabled?:boolean;initialSolution?:PublicSolution|null;completionsEnabled?:boolean }) {
  const { data, isPending, isRefetching, error } = authClient.useSession();
  const viewer: Viewer = isPending
    ? { state: "loading" }
    : error
      ? { state: "error" }
      : !data?.user
        ? { state: "guest" }
        : {
            state: data.user.emailVerified === true ? "verified" : "unverified",
            id: data.user.id,
          };
  return (
    <StudentWorkspace publicSolutionsEnabled={publicSolutionsEnabled} initialSolution={initialSolution} key={problemId} problemId={problemId} initialRevision={initialRevision} viewer={viewer} attributionEnabled={attributionEnabled} moderationEnabled={moderationEnabled} statsEnabled={statsEnabled} commentsEnabled={commentsEnabled} completionsEnabled={completionsEnabled && !isRefetching} />
  );
}
