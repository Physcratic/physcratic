import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { AuthoringWorkspace } from "@/components/authoring/workspace";

export const metadata: Metadata = {
  title: "Problem studio · Physcratic",
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
          Problem studio is available to verified authors.
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
      <a
        href="#author-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:bg-background focus:p-3"
      >
        Skip to editor content
      </a>
      <AuthoringWorkspace userId={session.user.id} />
    </>
  );
}
