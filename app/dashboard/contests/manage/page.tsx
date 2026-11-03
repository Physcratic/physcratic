import type { Metadata } from "next";
import Layout from "@/components/kokonutui/layout";
import { ContestAdmin } from "@/components/contests/contest-admin";
export const metadata: Metadata = {
  title: "Manage contests",
  description: "Create, review and publish Physcratic contest drafts.",
  robots: { index: false, follow: false },
};
export default function ManageContestsPage() {
  return (
    <Layout view="contests">
      <ContestAdmin />
    </Layout>
  );
}
