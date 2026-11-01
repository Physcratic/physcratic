"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
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
import { getEloBand } from "@/lib/problem-archive";

const competitionVariants = {
  IPhO: "ipho",
  APhO: "apho",
  EuPhO: "eupho",
} as const;

export type ProblemCardProps = {
  id: string;
  title: string;
  titleLanguage?: string;
  headingLevel?: 3 | 4;
  source: string;
  competition?: keyof typeof competitionVariants;
  reference?: string;
  statementLanguage?: "en" | "ru";
  description?: string;
  details?: readonly string[];
  tags: readonly string[];
  elo?: number;
} & (
  | { href: string; onOpen?: never }
  | { href?: never; onOpen: () => void }
);

export function ProblemCard({
  id,
  title,
  titleLanguage,
  headingLevel = 3,
  source,
  competition,
  reference,
  statementLanguage = "en",
  description,
  details,
  tags,
  elo,
  href,
  onOpen,
}: ProblemCardProps) {
  const titleId = React.useId();
  const Heading = headingLevel === 4 ? "h4" : "h3";
  const band = elo === undefined ? undefined : getEloBand(elo);
  const actionLabel = `Exercise: ${[source, reference, title].filter(Boolean).join(" — ")}`;
  const titleClassName =
    "rounded-sm text-left transition-colors hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card";
  const actionContent = (
    <>
      Exercise
      <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
    </>
  );

  return (
    <Card
      role="article"
      aria-labelledby={titleId}
      data-problem-card={id}
      data-competition={competition}
      data-level={band?.id}
      className="problem-entry flex min-w-0 flex-col shadow-none"
    >
      <div className="problem-entry-header flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Badge variant={competition ? competitionVariants[competition] : "concept"}>
            {source}
          </Badge>
          {reference && (
            <span className="text-sm font-medium text-muted-foreground">
              {reference}
            </span>
          )}
        </div>
        {elo !== undefined && band ? (
          <Badge
            variant={band.variant}
            aria-label={`Estimated difficulty ${elo.toLocaleString("en-US")}, ${band.name}`}
            title={`Illustrative estimate · ${band.name} · ${band.range}`}
            className="shrink-0 rounded-md"
          >
            <span className="text-sm tabular-nums">
              {elo.toLocaleString("en-US")}
            </span>
          </Badge>
        ) : (
          <span className="shrink-0 text-sm text-muted-foreground">
            {statementLanguage === "ru" ? "русский" : "English"}
            <span aria-hidden="true"> • </span>
            Unrated
          </span>
        )}
      </div>
      <CardHeader className="gap-2 p-5">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="min-w-0 flex-1">
            <Heading
              id={titleId}
              lang={titleLanguage}
              className="text-pretty text-lg font-semibold leading-relaxed"
            >
              {href ? (
                <Link href={href} className={titleClassName}>
                  {title}
                </Link>
              ) : (
                <button type="button" onClick={onOpen} className={titleClassName}>
                  {title}
                </button>
              )}
            </Heading>
          </CardTitle>
          {href ? (
            <Button variant="outline-transparent" className="min-h-11 shrink-0" asChild>
              <Link href={href} aria-label={actionLabel}>
                {actionContent}
              </Link>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline-transparent"
              className="min-h-11 shrink-0"
              onClick={onOpen}
              aria-label={actionLabel}
            >
              {actionContent}
            </Button>
          )}
        </div>
        {description && (
          <CardDescription className="line-clamp-2">
            <p className="text-pretty leading-relaxed">{description}</p>
          </CardDescription>
        )}
      </CardHeader>
      {details?.length ? (
        <CardContent className="flex flex-1 flex-wrap items-center gap-2 px-5 pb-5">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {details.join(" · ")}
          </p>
        </CardContent>
      ) : null}
      <CardFooter className="problem-entry-details flex min-h-14 flex-wrap items-center gap-2 px-5 py-3">
        {tags.map((tag) => (
          <Badge key={tag} variant="concept">
            {tag}
          </Badge>
        ))}
      </CardFooter>
    </Card>
  );
}
