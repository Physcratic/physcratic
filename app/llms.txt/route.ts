import { indexableRoutes, publicRoutes } from "@/lib/seo/public-routes";
import { SITE } from "@/lib/site";
import { publicDiscoveryUrl } from "@/lib/public-discovery";

export const dynamic = "force-static";

// Built from the same list as the sitemap, so the two cannot disagree.
export function GET() {
  const base = publicDiscoveryUrl();
  const abs = (path: string) => (path === "/" ? `${base}/` : `${base}${path}`);
  const pick = (kind: string) => indexableRoutes.filter((r) => r.kind === kind);
  const problems = pick("problem");
  const archive = problems.filter((r) => r.group === "archive");
  const arena = problems.filter((r) => r.group === "arena");
  const plain = problems.filter((r) => r.group === "practice");
  const guides = pick("learn").filter((r) => r.path !== "/learn");
  const learnHub = indexableRoutes.find((r) => r.path === "/learn");
  const terms = publicRoutes.find((r) => r.path === "/terms");
  const library = pick("library");
  const lines = [
    `# ${SITE.name}`,
    "",
    `> ${SITE.description}`,
    "",
    "Physcratic is free physics olympiad practice with IPhO, APhO and EuPhO problems and checked answers.",
    "It is for high-school students and coaches preparing for physics olympiads.",
    "The site is in beta: the problem set is growing and English translations are drafts.",
    "",
    "## Problem library",
    "",
    ...library.map((r) => `- [${r.title}](${abs(r.path)}): ${r.summary}`),
    ...pick("topic").map((r) => `- [${r.title}](${abs(r.path)}): topic page`),
    "",
    `## Olympiad archive (${archive.length} problems)`,
    "",
    ...archive.map((r) => `- [${r.title}](${abs(r.path)}): ${r.topic}`),
    "",
    `## Physcratic Arena (${arena.length} problems)`,
    "",
    ...arena.map((r) => `- [${r.title}](${abs(r.path)}): ${r.topic}`),
    "",
    `## Practice problems (${plain.length} problems)`,
    "",
    ...plain.map((r) => `- [${r.title}](${abs(r.path)}): ${r.topic}`),
    "",
    ...(guides.length > 0
      ? [
          "## Guides",
          "",
          ...(learnHub ? [`- [All guides](${abs(learnHub.path)}): plain guides with cited sources`] : []),
          ...guides.map((r) => `- [${r.title}](${abs(r.path)})`),
          "",
        ]
      : []),
    ...(pick("coaching").length > 0
      ? ["## Coaching", "", ...pick("coaching").map((r) => `- [${r.title}](${abs(r.path)})`), ""]
      : []),
    "## Optional",
    "",
    ...(terms ? [`- [${terms.title}](${abs(terms.path)})`] : []),
    "",
  ];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
