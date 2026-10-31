import type { Metadata } from "next";
import { topics, type View } from "./physics";
import { topicHasProblems } from "./seo/public-routes";
import { SITE, baseOpenGraph } from "./site";

export type DashboardParams = Record<string, string | string[] | undefined>;
export interface ParsedDashboard {
  view: View;
  topic?: string;
  query?: string;
}

const VIEWS = ["overview", "problems", "contests", "rankings", "guide"];

export function parseDashboardParams(params: DashboardParams): ParsedDashboard {
  const requestedView =
    typeof params.view === "string" ? params.view : "overview";
  const view: View = VIEWS.includes(requestedView)
    ? (requestedView as View)
    : "overview";
  const requestedTopic =
    params.topic === "Electricity" ? "Electromagnetism" : params.topic;
  const topic = topics.some((item) => item.name === requestedTopic)
    ? (requestedTopic as string)
    : undefined;
  const query =
    typeof params.q === "string" ? params.q.slice(0, 200) : undefined;
  return { view, topic, query };
}

const VIEW_COPY: Record<Exclude<View, "overview">, [string, string]> = {
  problems: [
    "Physics Olympiad problems",
    "Browse IPhO, APhO and EuPhO theory problems by topic, with original diagrams and English translations.",
  ],
  contests: [
    "Physics contests",
    "Practise the complete IPhO 2025 papers at your own pace and join published Physcratic contests.",
  ],
  rankings: ["Rankings", "Contest ratings of Physcratic contestants."],
  guide: [
    "Learning guide",
    "How to start practising physics olympiad problems on Physcratic.",
  ],
};

/** Canonical path keeps only view and topic. */
export function dashboardCanonicalPath({ view, topic }: ParsedDashboard) {
  const search = new URLSearchParams();
  if (view !== "overview") search.set("view", view);
  if (view === "problems" && topic) search.set("topic", topic);
  const qs = search.toString();
  return qs ? `/dashboard?${qs}` : "/dashboard";
}

export function dashboardMetadata(
  parsed: ParsedDashboard,
  rawParams: DashboardParams = {},
): Metadata {
  const { view, topic } = parsed;
  let title: Metadata["title"];
  let description: string;
  let titleText: string;
  if (view === "overview") {
    title = { absolute: SITE.defaultTitle };
    titleText = SITE.defaultTitle;
    description = SITE.description;
  } else if (view === "problems" && topic) {
    titleText = `${topic} physics problems`;
    title = titleText;
    description = `Olympiad-level ${topic} problems from IPhO, APhO and EuPhO, ready to practise online.`;
  } else {
    [titleText, description] = VIEW_COPY[view as Exclude<View, "overview">];
    title = titleText;
  }
  const canonical = dashboardCanonicalPath(parsed);
  const filtered =
    parsed.query !== undefined ||
    rawParams.q !== undefined ||
    rawParams.search !== undefined;
  const emptyTopic = view === "problems" && !!topic && !topicHasProblems(topic);
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      ...baseOpenGraph,
      title: titleText,
      description,
      url: canonical,
      // A page-level openGraph drops the root opengraph-image file convention.
      images: [
        { url: "/opengraph-image", width: 1200, height: 630, alt: SITE.defaultTitle },
      ],
    },
    ...(filtered || emptyTopic
      ? { robots: { index: false, follow: true } }
      : {}),
  };
}
