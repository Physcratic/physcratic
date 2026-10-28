import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { safeReturnPath } from "@/lib/submission-security";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Create account", robots: { index: false, follow: false } };
export default async function SignUp({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const returnTo = safeReturnPath((await searchParams).returnTo);
  if ((await auth.api.getSession({ headers: await headers() }))?.user) redirect(returnTo);
  return <AuthForm mode="sign-up" returnTo={returnTo} />;
}
