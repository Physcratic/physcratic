import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Layout from "@/components/kokonutui/layout";
import { SubmissionHistory } from "@/components/physics/submission-history";

export const metadata: Metadata = { title: "My solution attempts", robots: { index: false, follow: false } };
export default async function SubmissionsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in?returnTo=%2Fdashboard%2Fsubmissions");
  return <Layout view="problems" topic="My attempts"><div className="flex flex-col gap-6"><header className="flex flex-col gap-2"><h1 className="text-balance text-2xl font-medium tracking-tight">My solution attempts</h1><p className="text-sm leading-relaxed text-muted-foreground">Your reasoning, kept safely. Saved attempts are ungraded until an approved marking rubric is available.</p></header><SubmissionHistory key={session.user.id} /></div></Layout>;
}
