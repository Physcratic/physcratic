import type { ReactNode } from "react";
import type { View } from "@/lib/physics";
import Content from "./content";
import Layout from "./layout";

export default function Dashboard({
  view,
  topic,
  query,
  discovery,
  children,
}: {
  view: View;
  topic?: string;
  query?: string;
  discovery?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Layout view={view} topic={topic} stickyHeader={!!discovery}>
      <Content
        key={`${view}-${topic}-${query}`}
        view={view}
        topic={topic}
        query={query}
        discovery={discovery}
      />
      {children}
    </Layout>
  );
}
