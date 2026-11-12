import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CrumbTrail } from "@/components/problems/problem-links";
import { ProblemLinkList, problemLinkClass } from "@/components/problems/problem-list-links";
import { jsonLdScript, problemListGraph } from "@/lib/seo/json-ld";
import { problemsInTopic, topicName, topicPageCopy, topicsWithProblems } from "@/lib/seo/problem-pages";
import { SITE, baseOpenGraph } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return topicsWithProblems().map((topic) => ({ slug: topic.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const name = topicName(slug);
  if (!name) return {};
  const { title, description } = topicPageCopy(name, problemsInTopic(slug).length);
  const path = `/problems/topics/${slug}`;
  return { title, description, alternates: { canonical: path }, openGraph: { ...baseOpenGraph, title: `${title} | Physcratic`, description, url: path } };
}

export default async function TopicPage({ params }: Props) {
  const { slug } = await params;
  const name = topicName(slug);
  const pages = problemsInTopic(slug);
  if (!name || pages.length === 0) notFound();
  const { title, description } = topicPageCopy(name, pages.length);
  const path = `/problems/topics/${slug}`;
  const crumbs = [
    { name: SITE.name, path: "/" },
    { name: "Problems", path: "/problems" },
    { name, path },
  ];
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(problemListGraph({ crumbs, name: title, description, path, items: pages })) }}
      />
      <CrumbTrail crumbs={crumbs} />
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{name} problems</h1>
      <p className="mt-4 max-w-prose text-lg text-muted-foreground">{pages.length} problems on {name.toLowerCase()}.</p>
      <div className="mt-6">
        <ProblemLinkList pages={pages} />
      </div>
      <p className="mt-8">
        <Link href="/problems" className={problemLinkClass}>
          All problems
        </Link>
      </p>
    </>
  );
}
