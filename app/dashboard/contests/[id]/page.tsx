import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Layout from "@/components/kokonutui/layout";
import { ContestRoom } from "@/components/contests/contest-room";
import { contestIdSchema } from "@/lib/contest-contracts";
export const metadata: Metadata = {
  title: "Contest",
  description:
    "Join a Physcratic contest, submit final answers and review your saved score.",
  robots: { index: false, follow: false },
};
export default async function ContestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const parsed = contestIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  return (
    <Layout view="contests">
      <ContestRoom id={parsed.data} />
    </Layout>
  );
}
