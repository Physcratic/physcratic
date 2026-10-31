import { indexableRoutes, publicRoutes } from "@/lib/seo/public-routes";
import { SITE, siteUrl } from "@/lib/site";

export const dynamic = "force-static";

export function GET() {
  const base = siteUrl();
  const abs = (path: string) => `${base}${path}`;
  const problems = indexableRoutes.filter((r) => r.kind === "problem");
  const topics = indexableRoutes.filter((r) => r.kind === "topic");
  const view = (v: string) => indexableRoutes.find((r) => r.path === `/dashboard?view=${v}`)!;
  const terms = publicRoutes.find((r) => r.path === "/terms");
  const lines = [
    `# ${SITE.name}`,
    "",
    `> ${SITE.description}`,
    "",
    "Physcratic is a web app for practising physics olympiad theory problems (IPhO, APhO, EuPhO).",
    "It is for high-school students and coaches preparing for physics olympiads.",
    "The site is in beta: the problem set is growing and English translations are drafts.",
    "",
    "## Practice problems",
    "",
    ...problems.map((r) => `- [${r.title}](${abs(r.path)}): ${r.topic}`),
    "",
    "## Sections",
    "",
    `- [Home](${abs("/")}): what Physcratic offers and where to start`,
    `- [Problems](${abs(view("problems").path)}): browse by topic`,
    ...topics.map((r) => `- [${r.title}](${abs(r.path)}): topic page`),
    `- [Contests](${abs(view("contests").path)}): full papers and published contests`,
    `- [Rankings](${abs(view("rankings").path)}): contest ratings`,
    `- [Guide](${abs(view("guide").path)}): how to get started`,
    "",
    "## Optional",
    "",
    ...(terms ? [`- [${terms.title}](${abs(terms.path)})`] : []),
    "",
  ];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
