import type { ReactNode } from "react";
import type { View } from "@/lib/physics";
import Content from "./content";
import Layout from "./layout";
import { personalCompletionsEnabled } from "@/lib/personal-completions-route";
import { favouriteHistoryEnabled } from "@/lib/favourite-history-route";

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
        completionsEnabled={personalCompletionsEnabled()}
        favouritesEnabled={favouriteHistoryEnabled()}
      />
      {children}
    </Layout>
  );
}
