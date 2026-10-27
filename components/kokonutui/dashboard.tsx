import { problems, type View } from "@/lib/physics";
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
  const day = Math.floor(Date.now() / 86_400_000);
  const dailyProblem = problems[day % problems.length];

  return (
    <Layout view={view} topic={topic}>
      <Content
        key={`${view}-${topic}-${query}`}
        view={view}
        topic={topic}
        query={query}
        dailyProblem={dailyProblem}
      />
    </Layout>
  );
}
