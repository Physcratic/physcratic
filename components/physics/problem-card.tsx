"use client";

import * as React from "react";
import type { OlympiadHost } from "@/lib/olympiad-hosts"
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
import { ratingBand } from "@/lib/rating-bands";
import { badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { isActiveTag, nextTagFilter, useTagFilter } from "./tag-filter";

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
  host?: OlympiadHost
  reference?: string;
  statementLanguage?: "en" | "ru";
  description?: string;
  details?: readonly string[];
  tags: readonly string[];
  elo?: number;
  attribution?: React.ReactNode;
} & (
  // With both, the link is a real <a href> for crawlers and no-JS visitors, and a plain left click calls onOpen instead.
  | { href: string; onOpen?: () => void }
  | { href?: never; onOpen: () => void }
);

export function ProblemCard({
  id,
  title,
  titleLanguage,
  headingLevel = 3,
  source,
  competition,
  host,
  reference,
  statementLanguage = "en",
  description,
  details,
  tags,
  elo,
  attribution,
  href,
  onOpen,
}: ProblemCardProps) {
  const titleId = React.useId();
  const Heading = headingLevel === 4 ? "h4" : "h3";
  const band = elo === undefined ? undefined : ratingBand(elo);
  const tagFilter = useTagFilter();
  // One control per card: the title is plain text and the button is the only link or button. The accessible name starts
  // with the visible words so voice control matches, then names the problem.
  const actionLabel = `Open problem: ${[source, reference, title].filter(Boolean).join(", ")}`;
  const actionContent = (
    <>
      Open problem
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
      className="problem-entry flex min-w-0 flex-col"
    >
      <div className="problem-entry-header flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div className="inline-flex shrink-0 items-center gap-1.5">
            {competition && host && (
              <span
                role="img"
                aria-label={`Hosted by ${host.country}${host.online ? " (online)" : ""}`}
                title={`Hosted by ${host.country}${host.online ? " (online)" : ""}`}
                data-host-flag
                className="inline-flex shrink-0 items-center gap-0.5"
              >
                {host.flags.map((code) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={code}
                    src={`/flags/${code}.svg`}
                    alt=""
                    aria-hidden="true"
                    width={21}
                    height={16}
                    draggable={false}
                    className="h-4 w-auto shrink-0 rounded-[2px] border border-foreground/30"
                  />
                ))}
              </span>
            )}
            <Badge variant={competition ? competitionVariants[competition] : "concept"}>
              {source}
            </Badge>
          </div>
          {reference && (
            <span className="text-sm font-medium text-muted-foreground">
              {reference}
            </span>
          )}
        </div>
        {elo !== undefined && band ? (
          <Badge
            variant={band.variant}
            aria-label={`Rating ${elo.toLocaleString("en-US")}, ${band.name}`}
            title={`${band.name} · ${band.range}`}
            className="shrink-0 rounded-md"
          >
            <span className="text-sm tabular-nums">
              {elo.toLocaleString("en-US")}
            </span>
            <span aria-hidden="true" className="px-1.5 text-sm">·</span>
            <span className="text-sm">{band.name}</span>
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
              {title}
            </Heading>
          </CardTitle>
          {href ? (
            <Button variant="outline-transparent" className="min-h-11 shrink-0" asChild>
              <Link
                href={href}
                aria-label={actionLabel}
                onClick={onOpen ? (event) => {
                  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  event.preventDefault();
                  onOpen();
                } : undefined}
              >
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
      {attribution && <CardContent className="space-y-3 px-5 pb-5">{attribution}</CardContent>}
      <CardFooter className="problem-entry-details flex min-h-14 flex-wrap items-center gap-2 px-5 py-3">
        {tags.map((tag) =>
          tagFilter ? (
            <button
              key={tag}
              type="button"
              aria-pressed={isActiveTag(tagFilter.active, tag)}
              aria-label={`Filter by ${tag}`}
              onClick={() => tagFilter.toggle(nextTagFilter(tagFilter.active, tag))}
              className={cn(
                badgeVariants({ variant: "concept" }),
                "min-h-11 cursor-pointer px-3 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActiveTag(tagFilter.active, tag) && "border-foreground bg-foreground text-background hover:bg-foreground",
              )}
            >
              {tag}
            </button>
          ) : (
            <Badge key={tag} variant="concept">
              {tag}
            </Badge>
          ),
        )}
      </CardFooter>
    </Card>
  );
}
