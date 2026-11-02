import type { Metadata } from "next";
import { baseOpenGraph } from "../site";
import { physicsTagLabel } from "../physics-taxonomy";

import { practiceProblemDescription } from "../problem-meta";

interface DescriptionSource {
  id?: string;
  title?: string;
  prompt?: string;
  summary?: string;
  competition?: string;
  year?: number;
  code?: string;
  tags?: readonly string[];
}

function plainSummary(value: string): string {
  const text = value.replace(/\$\$?[^$]*\$\$?/g, " ").replace(/[`*_#>]/g, "")
    .replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
  if (text.length <= 160) return text;
  const excerpt = text.slice(0, 159);
  const end = excerpt.lastIndexOf(" ");
  return `${excerpt.slice(0, end > 100 ? end : 159).trimEnd()}…`;
}

/** Static public problem descriptions only. Do not pass private authored drafts. */
export function problemDescription(problem: DescriptionSource): string {
  const practice = problem.id ? practiceProblemDescription(problem.id) : undefined;
  if (typeof practice === "string") return practice;
  if (problem.summary) return plainSummary(problem.summary);
  if (problem.competition && problem.year && problem.code && problem.title) {
    const concepts = (problem.tags ?? []).slice(0, 3).map((tag) => physicsTagLabel(tag)).join(", ");
    const text = `${problem.competition} ${problem.year} ${problem.code}: ${problem.title}. ${concepts ? `Topics: ${concepts}.` : "Physics Olympiad problem."}`;
    return plainSummary(text.length < 70 ? `${text} Physics Olympiad practice.` : text);
  }
  return plainSummary(problem.prompt ?? "");
}

/** Ready for the UI owner to use in the public problem page's generateMetadata. */
export function problemPageMetadata(problem: DescriptionSource & { id: string; title: string }): Metadata {
  const title = problem.competition && problem.year && problem.code
    ? `${problem.competition} ${problem.year} ${problem.code}: ${problem.title}` : problem.title;
  const description = problemDescription(problem);
  const path = `/dashboard/problems/${encodeURIComponent(problem.id)}`;
  return {
    title, description,
    alternates: { canonical: path },
    openGraph: { ...baseOpenGraph, type: "article", title, description, url: path },
  };
}
