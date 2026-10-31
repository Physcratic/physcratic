import type { Metadata } from "next";
import Dashboard from "@/components/kokonutui/dashboard";
import {
  dashboardMetadata,
  parseDashboardParams,
  type DashboardParams,
} from "@/lib/dashboard-route";
import { jsonLdScript, organization, website } from "@/lib/seo/json-ld";

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
    <>
      {view === "overview" ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdScript([organization(), website()]),
          }}
        />
      ) : null}
      <Dashboard view={view} topic={topic} query={query} />
    </>
  );
}
