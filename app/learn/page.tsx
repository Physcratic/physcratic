import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { formatDate, learnPath, publishedArticles } from "@/lib/learn/articles";
import { baseOpenGraph } from "@/lib/site";

const TITLE = "Physics Olympiad guides";
const DESCRIPTION =
  "Plain guides to the physics olympiads for students and parents. Every fact has a numbered source, and anything that changes says which year it applies to.";

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
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Learn</h1>
      <p className="mt-4 max-w-prose text-lg text-muted-foreground">
        Short guides to the physics olympiads, written for students and the
        parents who support them. Every fact has a numbered source. Anything
        that changes from year to year says which year it applies to.
      </p>
      <p className="mt-3 max-w-prose text-sm text-muted-foreground">
        Physcratic does not run any of these olympiads. Always confirm details
        with your national organiser and the current host site.
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
