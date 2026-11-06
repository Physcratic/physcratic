import type { Metadata } from "next";
import { EmailChangeResult } from "@/components/account/account-pages";
import { emailChangeOutcome } from "@/lib/account-messages";

export const metadata: Metadata = { title: "Email change", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function EmailChange({ searchParams }: { searchParams: Promise<{ step?: string | string[]; error?: string | string[] }> }) {
  const query = await searchParams;
  const pick = (value: string | string[] | undefined) => (typeof value === "string" ? value : Array.isArray(value) ? value[0] : undefined);
  const step = pick(query.step), error = pick(query.error);
  return <EmailChangeResult {...emailChangeOutcome(step, error)} signIn={step === "signed-out" && !error} />;
}
