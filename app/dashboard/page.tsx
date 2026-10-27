import Dashboard from "@/components/kokonutui/dashboard";
import { topics, type View } from "@/lib/physics";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requestedView =
    typeof params.view === "string" ? params.view : "overview";
  const view: View = [
    "overview",
    "problems",
    "contests",
    "rankings",
    "guide",
  ].includes(requestedView)
    ? (requestedView as View)
    : "overview";
  const topic = topics.some((item) => item.name === params.topic)
    ? (params.topic as string)
    : undefined;
  const query =
    typeof params.q === "string" ? params.q.slice(0, 200) : undefined;
  return <Dashboard view={view} topic={topic} query={query} />;
}
