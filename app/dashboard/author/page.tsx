import { SkipLink } from "@/components/skip-link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { AuthoringWorkspace } from "@/components/authoring/workspace";

export const metadata: Metadata = {
  title: "Problem Studio · Physcratic",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function AuthorPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in?returnTo=%2Fdashboard%2Fauthor");
  if (session.user.emailVerified !== true)
    return (
      <main className="mx-auto max-w-xl space-y-5 px-5 py-20">
        <h1 className="text-3xl font-semibold">
          Verify your email to start authoring
        </h1>
        <p>
          Use the verification link sent to your email, then sign in again.
          Problem Studio is available to verified authors.
        </p>
        <Link
          className="inline-block py-3 underline"
          href="/sign-in?returnTo=%2Fdashboard%2Fauthor"
        >
          Sign in and request verification
        </Link>
      </main>
    );
  return (
    <>
      <SkipLink targetId="author-main">Skip to editor content</SkipLink>
      <AuthoringWorkspace userId={session.user.id} />
    </>
  );
}
