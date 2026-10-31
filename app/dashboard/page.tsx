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
  return dashboardMetadata(parseDashboardParams(params), params);
}

export default async function DashboardPage({ searchParams }: Props) {
  const { view, topic, query } = parseDashboardParams(await searchParams);
  return (
    <Dashboard view={view} topic={topic} query={query} />
  );
}
