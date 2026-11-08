import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/account/account-pages";

export const metadata: Metadata = { title: "Reset password", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";
export default async function ResetPassword({ searchParams }: { searchParams: Promise<{ token?: string | string[]; error?: string | string[] }> }) {
  const query = await searchParams;
  const token = typeof query.token === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(query.token) ? query.token : null;
  return <ResetPasswordForm token={token} linkError={query.error !== undefined} />;
}
