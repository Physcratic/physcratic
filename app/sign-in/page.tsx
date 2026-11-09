import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { safeReturnTo } from "@/components/account/return-path";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };
export default async function SignIn({ searchParams }: { searchParams: Promise<{ returnTo?: string; verified?: string; error?: string }> }) {
  const query = await searchParams;
  const returnTo = safeReturnTo(query.returnTo);
  if ((await auth.api.getSession({ headers: await headers() }))?.user) redirect(returnTo);
  return <AuthForm mode="sign-in" returnTo={returnTo} verified={query.verified === "1"} verificationError={Boolean(query.error)} />;
}
