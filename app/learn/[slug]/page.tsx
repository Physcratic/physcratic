import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArticleBody } from "@/components/learn/article-body";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { findArticle, formatDate, learnPath, publishedArticles } from "@/lib/learn/articles";
import { articleGraph, jsonLdScript } from "@/lib/seo/json-ld";
import { baseOpenGraph } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

// Unknown or unpublished slugs are not generated and return 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return publishedArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = findArticle(slug);
  if (!article) return {};
  const path = learnPath(article.slug);
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: path },
    // Next replaces openGraph wholesale, so spread the base and repeat the text.
    openGraph: {
      ...baseOpenGraph,
      type: "article",
      title: article.title,
      description: article.description,
      url: path,
      publishedTime: article.updated,
      modifiedTime: article.updated,
    },
  };
}

export default async function LearnArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = findArticle(slug);
  if (!article) notFound();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(articleGraph(article)) }}
      />
      <article>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={learnPath()}>Learn</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{article.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <header className="mt-6">
          <h1 className="max-w-prose text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {article.title}
          </h1>
          <p className="mt-4 max-w-prose text-lg text-muted-foreground">
            {article.description}
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Updated <time dateTime={article.updated}>{formatDate(article.updated)}</time>
            {" · "}
            {article.readingMinutes} min read
          </p>
        </header>
        <div className="mt-8">
          <ArticleBody blocks={article.body} sources={article.sources} />
        </div>

        <section aria-labelledby="sources-heading" className="mt-12 border-t pt-8">
          <h2 id="sources-heading" className="text-2xl font-semibold tracking-tight">
            Sources
          </h2>
          <p className="mt-3 max-w-prose text-sm text-muted-foreground">
            The numbers in square brackets in the text match this list.
          </p>
          <ol className="mt-4 max-w-prose list-decimal space-y-4 pl-6">
            {article.sources.map((source, i) => (
              <li key={source.id} id={`source-${i + 1}`} className="scroll-mt-6 pl-1">
                <a
                  href={source.url}
                  rel="noopener noreferrer"
                  className="break-words font-medium underline underline-offset-4 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {source.title}
                </a>
                {source.unofficial ? (
                  <span className="ml-2 inline-block rounded-full border px-2 py-0.5 align-middle text-xs text-muted-foreground">
                    Unofficial
                  </span>
                ) : null}
                <span className="block text-sm text-muted-foreground">
                  {source.publisher}. Accessed {formatDate(source.accessed)}.
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="practise-heading" className="mt-12">
          <Card>
            <CardHeader>
              <h2 id="practise-heading" className="text-xl font-semibold leading-snug tracking-tight">
                Practise what you have read
              </h2>
              <CardDescription className="max-w-prose">
                Work through physics problems on Physcratic and see where to
                improve next.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/dashboard?view=problems">Browse practice problems</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </article>
    </>
  );
}
