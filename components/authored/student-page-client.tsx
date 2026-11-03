"use client";
import { authClient } from "@/lib/auth-client";
import type { Viewer } from "@/lib/authored-student";
import { StudentWorkspace } from "./student-workspace";
import {ProblemStatsPanel} from '@/components/community/problem-stats';
export function StudentPageClient({ problemId,statsEnabled=false }: { problemId: string;statsEnabled?:boolean }) {
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
    <> {statsEnabled&&<div className="p-4"><ProblemStatsPanel problemKey={`authored:${problemId}`}/></div>}<StudentWorkspace key={problemId} problemId={problemId} viewer={viewer} /></>
  );
}
