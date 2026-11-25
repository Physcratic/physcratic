import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { submissionUser } from "@/lib/submission-server";
import { getSubmissionHistory } from "@/lib/submission-history-server";
import { AttemptsPageShell } from "@/components/physics/attempts-page-shell";
import { SubmissionHistory } from "@/components/physics/submission-history";
import { LoadingLines } from "@/components/loading-lines";

export const metadata: Metadata = { title: "My Solution Attempts", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
async function Attempts({ accountId }: { accountId: string }) {
  const initialData = await getSubmissionHistory(accountId).catch(() => undefined);
  return <SubmissionHistory key={accountId} accountId={accountId} initialData={initialData} />;
}
export default async function SubmissionsPage() {
  const requestHeaders = await headers();
  const user = await submissionUser({ headers: requestHeaders });
  if (!user) {
    // A restricted but still signed-in account must not bounce between two redirects.
    const session = await auth.api.getSession({ headers: requestHeaders });
    if (session?.user) return <AttemptsPageShell><div role="alert" className="space-y-3"><p>Saved attempts are unavailable for this account.</p><Link href="/" className="underline underline-offset-4">Return to the lobby</Link></div></AttemptsPageShell>;
    redirect("/sign-in?returnTo=%2Fdashboard%2Fsubmissions");
  }
  return <AttemptsPageShell><Suspense fallback={<LoadingLines label="Loading your private attempts." />}><Attempts accountId={user.id} /></Suspense></AttemptsPageShell>;
}
