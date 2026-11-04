"use client";
import { authClient } from "@/lib/auth-client";
import type { Viewer } from "@/lib/authored-student";
import { StudentWorkspace } from "./student-workspace";
export function StudentPageClient({ problemId,statsEnabled=false,commentsEnabled=false,moderationEnabled=false }: { problemId: string;statsEnabled?:boolean;commentsEnabled?:boolean;moderationEnabled?:boolean }) {
  const { data, isPending, error } = authClient.useSession();
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
    <StudentWorkspace key={problemId} problemId={problemId} viewer={viewer} moderationEnabled={moderationEnabled} statsEnabled={statsEnabled} commentsEnabled={commentsEnabled} />
  );
}
