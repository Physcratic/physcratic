import type { Metadata } from "next";
import Layout from "@/components/kokonutui/layout";
import { ArchiveDirectory } from "@/components/problems/archive-directory";
import { jsonLdScript, problemListGraph } from "@/lib/seo/json-ld";
import { allProblemPages } from "@/lib/seo/problem-pages";
import { SITE, baseOpenGraph } from "@/lib/site";

const TITLE = "IPhO, APhO and EuPhO problem archive";
const DESCRIPTION =
  "Theory problems from IPhO, APhO and EuPhO, grouped by olympiad and year. Each has its own page with the statement as text and a link to the official PDF.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/problems/archive" },
  openGraph: { ...baseOpenGraph, title: `${TITLE} | Physcratic`, description: DESCRIPTION, url: "/problems/archive" },
};

export default function ArchivePage() {
  const archive = allProblemPages().filter(page => page.kind === "archive");
  const crumbs = [{ name: SITE.name, path: "/" }, { name: "Problems", path: "/problems" }, { name: "Archive", path: "/problems/archive" }];
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(problemListGraph({ crumbs, name: TITLE, description: DESCRIPTION, path: "/problems/archive", items: archive })) }} />
    <Layout view="problems" stickyHeader><ArchiveDirectory /></Layout>
  </>;
}
