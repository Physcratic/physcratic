import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { formatDate, learnPath, publishedArticles } from "@/lib/learn/articles";
import { jsonLdScript, learnHubGraph } from "@/lib/seo/json-ld";
import { baseOpenGraph } from "@/lib/site";

const TITLE = "Physics Olympiad and Physcratic guides";
const DESCRIPTION =
  "Practical guides to using Physcratic, writing physics problems and preparing for IPhO, APhO and EuPhO, with sources for olympiad advice.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: learnPath() },
  openGraph: {
    ...baseOpenGraph,
    title: TITLE,
    description: DESCRIPTION,
    url: learnPath(),
  },
};

export default function LearnPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(learnHubGraph({ title: TITLE, description: DESCRIPTION, articles: publishedArticles })) }}
      />
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Learn</h1>
      <p className="mt-4 max-w-prose text-lg text-muted-foreground">
        Learn how to use Physcratic, publish a problem or plan your physics
        olympiad study. The olympiad guides include numbered sources.
      </p>
      <p className="mt-3 max-w-prose text-sm text-muted-foreground">
        For olympiad dates and entry rules, confirm details with your national
        organiser and the current host site. Physcratic does not run these olympiads.
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-1">
        {publishedArticles.map((article) => (
          <li key={article.slug}>
            <Card className="relative transition-colors focus-within:ring-2 focus-within:ring-ring hover:bg-muted/50">
              <CardHeader>
                <h2 className="text-xl font-semibold leading-snug tracking-tight">
                  <Link
                    href={learnPath(article.slug)}
                    className="after:absolute after:inset-0 focus-visible:outline-none"
                  >
                    {article.title}
                  </Link>
                </h2>
                <CardDescription className="max-w-prose">
                  {article.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Updated <time dateTime={article.updated}>{formatDate(article.updated)}</time>
                {" · "}
                {article.readingMinutes} min read
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
