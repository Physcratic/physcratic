import type { Metadata } from "next";
import Dashboard from "@/components/kokonutui/dashboard";
import {
  dashboardMetadata,
  parseDashboardParams,
  type DashboardParams,
} from "@/lib/dashboard-route";

type Props = { searchParams: Promise<DashboardParams> };

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const params = await searchParams;
  // The home page (/) is the public front door. The dashboard is the signed-in app, so it is not indexed. Its links still work.
  return { ...dashboardMetadata(parseDashboardParams(params), params), robots: { index: false, follow: true } };
}

export default async function DashboardPage({ searchParams }: Props) {
  const { view, topic, query } = parseDashboardParams(await searchParams);
  return (
    <>
      <Dashboard view={view} topic={topic} query={query} />
    </>
  );
}
