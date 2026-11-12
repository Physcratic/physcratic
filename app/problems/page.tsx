import type { Metadata } from "next";
import { Suspense } from "react";
import Layout from "@/components/kokonutui/layout";
import { ProblemLibrary } from "@/components/physics/problem-library";
import { PublicProblemDirectory } from "@/components/problems/public-problem-directory";
import { jsonLdScript, problemListGraph } from "@/lib/seo/json-ld";
import { allProblemPages } from "@/lib/seo/problem-pages";
import { SITE, baseOpenGraph } from "@/lib/site";

const TITLE = "Physics olympiad problem library";
const DESCRIPTION =
  "Every Physcratic problem in one list: Physcratic Arena problems and the IPhO, APhO and EuPhO archive, each with its own page.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/problems" },
  openGraph: { ...baseOpenGraph, title: `${TITLE} | Physcratic`, description: DESCRIPTION, url: "/problems" },
};

export default function ProblemLibraryPage() {
  const pages = allProblemPages();
  const crumbs = [
    { name: SITE.name, path: "/" },
    { name: "Problems", path: "/problems" },
  ];
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(problemListGraph({ crumbs, name: TITLE, description: DESCRIPTION, path: "/problems", items: pages })) }}
      />
      <Layout view="problems" stickyHeader>
        <div className="flex min-w-0 flex-col gap-7">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-medium tracking-[-0.04em] sm:text-[27px]">Problem library</h1>
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
              Explore {pages.length} physics olympiad problems from Physcratic Arena and the IPhO, APhO and EuPhO archive. Search by problem, topic or rating band, or work through guided exercises.
            </p>
          </div>
          <Suspense fallback={<p className="text-sm text-muted-foreground">Use the directory below to open a problem. Interactive filters load with JavaScript.</p>}>
            <ProblemLibrary readerTitleAs="h2" navigateToReader />
          </Suspense>
        </div>
        <PublicProblemDirectory />
      </Layout>
    </>
  );
}
