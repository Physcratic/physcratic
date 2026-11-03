"use client";
import { authClient } from "@/lib/auth-client";
import type { Viewer } from "@/lib/authored-student";
import { StudentWorkspace } from "./student-workspace";
import { ProblemInteractions } from '@/components/community/problem-interactions';
export function StudentPageClient({ problemId }: { problemId: string }) {
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
    <><ProblemInteractions problemKey={`authored:${problemId}`}/><StudentWorkspace key={problemId} problemId={problemId} viewer={viewer} /></>
  );
}
