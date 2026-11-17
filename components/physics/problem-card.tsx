"use client";

import * as React from "react";
import type { OlympiadHost } from "@/lib/olympiad-hosts"
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  // The link or button covers the whole card with its ::after layer, so a press anywhere on the card opens the problem.
  const actionClass = "min-h-11 min-w-11 w-full shrink-0 after:absolute after:inset-0 sm:w-auto";
  const actionContent = (
    <>
      Open problem
      <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
    </>
  );

  // The rating block sits on the left, and on a narrow screen it moves to the top. The whole card is the tap surface
  // because the one link or button stretches over it. Anything else that can be pressed sits above that layer.
  const action = href ? (
    <Button variant="default" className={actionClass} asChild>
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
    <Button type="button" variant="default" className={actionClass} onClick={onOpen} aria-label={actionLabel}>
      {actionContent}
    </Button>
  );

  return (
    <Card
      role="article"
      aria-labelledby={titleId}
      data-problem-card={id}
      data-competition={competition}
      data-level={band?.id}
      className="problem-entry relative flex min-w-0 flex-col gap-0 overflow-hidden py-0 transition-colors hover:border-foreground/40 sm:flex-row"
    >
      {elo !== undefined && band ? (
        <div
          role="group"
          aria-label={`Rating ${elo.toLocaleString("en-US")}, ${band.name}`}
          title={`${band.name} · ${band.range}`}
          className="flex shrink-0 flex-col gap-1 border-b border-border p-4 sm:w-40 sm:border-b-0 sm:border-r sm:p-6"
        >
          <p className="text-3xl font-semibold leading-none tabular-nums text-foreground">
            {elo.toLocaleString("en-US")}
          </p>
          <p className="text-sm font-medium text-muted-foreground">{band.name}</p>
        </div>
      ) : (
        <div className="flex shrink-0 flex-col gap-1 border-b border-border p-4 sm:w-40 sm:border-b-0 sm:border-r sm:p-6">
          <p className="text-xl font-semibold leading-none text-muted-foreground">Unrated</p>
          <p lang={statementLanguage} className="text-sm text-muted-foreground">
            {statementLanguage === "ru" ? "русский" : "English"}
          </p>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
          <div className="flex flex-col gap-2">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              {competition && host && (
                <span
                  role="img"
                  aria-label={`Hosted by ${host.country}${host.online ? " (online)" : ""}`}
                  title={`Hosted by ${host.country}${host.online ? " (online)" : ""}`}
                  data-host-flag
                  className="inline-flex shrink-0 items-center gap-1"
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
              <span className="font-medium">{source}</span>
              {reference && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{reference}</span>
                </>
              )}
            </p>
            <Heading
              id={titleId}
              lang={titleLanguage}
              className="text-pretty text-xl font-semibold leading-snug text-foreground"
            >
              {title}
            </Heading>
            {description && (
              <p className="line-clamp-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {details?.length ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {details.join(" · ")}
            </p>
          ) : null}
          {attribution && (
            <div className="pointer-events-none relative z-10 flex flex-col gap-2 [&_a]:pointer-events-auto [&_button]:pointer-events-auto [&_details]:pointer-events-auto">
              {attribution}
            </div>
          )}
        </div>
        {/* The footer keeps its own rule and tint across the full width of the card. */}
        <div className="problem-entry-details flex flex-col gap-4 px-4 py-4 sm:flex-row-reverse sm:items-end sm:justify-between sm:px-6">
          {action}
          <div className="flex min-w-0 flex-wrap gap-2 sm:flex-1">
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
                    "relative z-10 min-h-11 cursor-pointer px-3 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
          </div>
        </div>
      </div>
    </Card>
  );
}
