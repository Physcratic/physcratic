import type { View } from "@/lib/physics";
import Content from "./content";
import Layout from "./layout";

export default function Dashboard({
  view,
  topic,
  query,
}: {
  view: View;
  topic?: string;
  query?: string;
}) {
  return (
    <Layout view={view} topic={topic}>
      <Content
        key={`${view}-${topic}-${query}`}
        view={view}
        topic={topic}
        query={query}
      />
    </Layout>
  );
}
