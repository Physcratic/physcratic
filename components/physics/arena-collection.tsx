import Link from "next/link";
import Image from "next/image";
import { filterProblemsByTag } from "@/lib/problem-tags";
import { ArrowUpRight, BookOpen, RotateCcw } from "lucide-react";
import arena from "@/lib/arena/index.json";
import { filterArena, type ArenaCatalogEntry } from "@/lib/arena-schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function ArenaCollection({
  query,
  topic,
  difficulty,
  onReset,
}: {
  query: string;
  topic: string;
  difficulty: string;
  onReset: () => void;
}) {
  const filtered = filterArena(arena.problems as ArenaCatalogEntry[], {
    query,
    topic,
    difficulty,
  });
  return (
    <section
      className="flex min-w-0 flex-col gap-5"
      aria-labelledby="arena-heading"
    >
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="arena-heading" className="text-lg font-medium tracking-tight">
            Physcratic Arena
          </h2>
          <Badge variant="secondary">
            {filterProblemsByTag(arena.problems, topic).length} full problems
          </Badge>
        </div>
        <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
          Your Arena collection, typeset for the web. Complete statements,
          original diagrams and worked solutions—with selectable text and LaTeX
          equations, not PDF previews.
        </p>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? "problem" : "problems"} ·
          Unrated · Self-review
        </p>
      </header>
      {filtered.length ? (
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          {filtered.map((problem) => (
            <Card
              key={problem.id}
              className="flex min-w-0 flex-col overflow-hidden shadow-none"
            >
              {problem.id === "arena-mind-the-gap" && (
                <Image
                  src="/mind-the-gap-hero.png"
                  alt="Newton’s interference rings in a lens resting on a glass plate"
                  width={1568}
                  height={643}
                  sizes="(max-width: 767px) 100vw, (max-width: 1279px) 45vw, 550px"
                  className="h-44 w-full object-cover"
                />
              )}
              <CardHeader>
                <div>
                  <Badge variant="outline">{problem.topic}</Badge>
                </div>
                <CardTitle>
                  <Link
                    href={`/dashboard/problems/${problem.id}`}
                    className="text-pretty hover:underline focus-visible:underline"
                  >
                    {problem.title}
                  </Link>
                </CardTitle>
                <CardDescription>{problem.summary}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-wrap items-start gap-2">
                {problem.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </CardContent>
              <CardFooter className="flex-wrap justify-between gap-3">
                <span className="text-sm text-muted-foreground">
                  Statement + worked solution
                </span>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/dashboard/problems/${problem.id}`}>
                    Exercise
                    <ArrowUpRight data-icon="inline-end" />
                    <span className="sr-only">{problem.title}</span>
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen />
            </EmptyMedia>
            <EmptyTitle>No Arena problems found</EmptyTitle>
            <EmptyDescription>
              Try a different search or tag. These imported problems are
              unrated.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={onReset}>
              <RotateCcw data-icon="inline-start" />
              Clear filters
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </section>
  );
}
