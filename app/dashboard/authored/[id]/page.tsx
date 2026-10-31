import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { StudentPageClient } from "@/components/authored/student-page-client";
export const metadata: Metadata = {
  title: "Authored problem · Practice",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function AuthoredProblemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const parsed = z.uuid().safeParse((await params).id);
  if (!parsed.success) notFound();
  return <StudentPageClient problemId={parsed.data.toLowerCase()} />;
}
