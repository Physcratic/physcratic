import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Layout from "@/components/kokonutui/layout";
import { TopicDirectory } from "@/components/problems/topic-directory";
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
      <Layout view="problems" stickyHeader><TopicDirectory name={name} pages={pages} /></Layout>
    </>
  );
}
