import type { ReactNode } from "react";
import type { View } from "@/lib/physics";
import Content from "./content";
import Layout from "./layout";
import { personalCompletionsEnabled } from "@/lib/personal-completions-route";

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
    <Layout view={view} topic={topic} stickyHeader={view === "overview" || !!discovery}>
      <Content
        key={`${view}-${topic}-${query}`}
        view={view}
        topic={topic}
        query={query}
        discovery={discovery}
        completionsEnabled={personalCompletionsEnabled()}
      />
      {children}
    </Layout>
  );
}
