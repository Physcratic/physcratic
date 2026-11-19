"use client";

import * as React from "react";
import type { OlympiadHost } from "@/lib/olympiad-hosts"
import Link from "next/link";
import { ArrowUpRight, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ratingBand } from "@/lib/rating-bands";
import { badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { favouriteNoun } from "@/lib/favourite-toggle";
import { isActiveTag, nextTagFilter, useTagFilter } from "./tag-filter";

/** The olympiads a card can name. They are neutral on the card: the host flag tells them apart. */
type Competition = "IPhO" | "APhO" | "EuPhO";

// The layout classes the card and its skeleton share, so a placeholder has the same box as the card it stands in for.
const cardClass = "problem-entry relative flex min-w-0 flex-col gap-0 overflow-hidden py-0 sm:flex-row [overflow-wrap:anywhere]";
const ratingBlockClass = "flex shrink-0 flex-col gap-1 border-b border-t-4 border-border p-4 sm:w-40 sm:border-b-0 sm:border-l-4 sm:border-r sm:border-t-0 sm:p-6";
const bodyClass = "flex min-w-0 flex-1 flex-col";
const contentClass = "flex flex-1 flex-col gap-4 p-4 sm:p-6";
const footerClass = "problem-entry-details flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-end sm:px-6";

/** A figure for the card. Only Arena cards pass one. The width and height are the file's own, so the frame never moves. */
export type ProblemCardImage = { src: string; alt: string; width: number; height: number };

// The figure sits in a fixed frame (120px high, 160px from 640px) on a light page-white ground, because the Arena figures
// are drawn on white and a dark frame would show a seam. The frame is p-2 inside the card radius token, so the picture's
// own corners are that radius minus the 8px padding (4px).
const imageFrameClass = "h-[120px] w-full shrink-0 overflow-hidden rounded-lg bg-white p-2 sm:h-40 sm:w-44 lg:w-60";
const imageClass = "h-full w-full rounded-[calc(var(--radius)-0.5rem)] object-contain";

/** The picture to show, or undefined: none given, no alt text to read, or this address already failed to load. */
export function visibleCardImage(image: ProblemCardImage | undefined, failedSrc: string | null): ProblemCardImage | undefined {
  return image && image.alt.trim() && image.src !== failedSrc ? image : undefined;
}

export type ProblemCardProps = {
  id: string;
  title: string;
  titleLanguage?: string;
  headingLevel?: 3 | 4;
  source: string;
  competition?: Competition;
  host?: OlympiadHost
  /** The edition year and the task code, such as 2026 and "T1". They are separate spans after the source, with no glyph between. */
  year?: string | number;
  task?: string;
  statementLanguage?: "en" | "ru";
  description?: string;
  details?: readonly string[];
  tags: readonly string[];
  elo?: number;
  /** The first statement figure of an Arena problem. With none, the card renders exactly as before. */
  image?: ProblemCardImage;
  attribution?: React.ReactNode;
  /**
   * The favourite control. With none of these the card has no control and renders exactly as before, so callers
   * without statistics (corpus, olympiad, archive) pass nothing. The wording stays "Favourite", as in the existing control.
   */
  likeCount?: number;
  liked?: boolean;
  /** With a count but no handler the button is shown disabled. With neither, only the status words show. */
  onToggleLike?: () => void;
  /** "signed-out" shows the sign-in link and "unverified" the verify-your-email note. Defaults to "ready". */
  likeAccess?: "ready" | "signed-out" | "unverified";
  /** A write or a refresh is in flight. The button keeps focus but ignores presses. */
  likeBusy?: boolean;
  /** Visible status words, for example "Loading statistics…". */
  likeStatus?: string;
  /** Visible error words, announced as an alert. */
  likeError?: string;
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
  year,
  task,
  statementLanguage = "en",
  description,
  details,
  tags,
  elo,
  image,
  attribution,
  likeCount,
  liked,
  onToggleLike,
  likeAccess,
  likeBusy = false,
  likeStatus,
  likeError,
  href,
  onOpen,
}: ProblemCardProps) {
  const titleId = React.useId();
  // A picture that cannot load (removed after publication, or offline) leaves no frame, no broken icon and no gap.
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null);
  const shown = visibleCardImage(image, failedSrc);
  const Heading = headingLevel === 4 ? "h4" : "h3";
  const band = elo === undefined ? undefined : ratingBand(elo);
  const tagFilter = useTagFilter();
  // One control per card: the title is plain text and the button is the only link or button. The accessible name starts
  // with the visible words so voice control matches, then names the problem.
  const actionLabel = `Open problem: ${[source, year, task, title].filter(Boolean).join(", ")}`;
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

  const hasLike =
    likeCount !== undefined || liked !== undefined || onToggleLike !== undefined || likeAccess !== undefined || likeStatus !== undefined || likeError !== undefined;
  const access = likeAccess ?? "ready";
  const isLiked = liked === true;
  // With no count and no handler there is nothing to act on yet (loading, or the problem is no longer public), so only
  // the status words show, as in the earlier statistics control.
  const hasToggle = likeCount !== undefined || onToggleLike !== undefined;
  // The like control sits above the stretched open layer (relative z-10). While a request is in flight it uses
  // aria-disabled, not disabled, so keyboard focus stays on it after Enter or Space.
  const like = hasLike ? (
    <div data-like-control className="flex min-w-0 flex-col gap-2 text-sm" aria-busy={likeBusy || undefined}>
      {hasToggle && <div className="flex min-h-11 flex-wrap items-center gap-2">
        {/* The count comes first, so on a wide screen the toggle itself sits right beside the open button. */}
        {likeCount !== undefined && (
          <span>
            <span className="tabular-nums">{likeCount.toLocaleString("en-US")}</span> {favouriteNoun(likeCount)}
          </span>
        )}
        {access === "signed-out" ? (
          <Link
            href="/sign-in"
            className="relative z-10 inline-flex min-h-11 items-center rounded-md underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
          >
            Sign in to favourite
          </Link>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-pressed={isLiked}
            aria-describedby={titleId}
            aria-disabled={likeBusy || undefined}
            disabled={access === "unverified" || !onToggleLike}
            onClick={() => {
              if (!likeBusy) onToggleLike?.();
            }}
            className="relative z-10 min-w-11 aria-disabled:cursor-progress"
          >
            <Heart
              aria-hidden="true"
              data-liked={isLiked ? "true" : "false"}
              // The fill is the primary token, never red. The outline stays the strong foreground colour, because the
              // primary fill on its own is under 3:1 on a light card. The fill fades in, and not at all under reduced motion.
              className={cn(
                "stroke-foreground transition-[fill] duration-200 ease-out motion-reduce:transition-none",
                isLiked ? "fill-primary" : "fill-transparent",
              )}
            />
            {isLiked ? "Favourited" : "Favourite"}
          </Button>
        )}
      </div>}
      {access === "unverified" && <p>Verify your email to save favourites.</p>}
      {/* While statistics first load there is no toggle yet, so the words sit in a row as tall as the toggle and nothing moves
          when it arrives. A refresh after a change is announced but takes no room, so toggling never shifts the footer. */}
      {likeStatus && (hasToggle ? <p role="status" className="sr-only">{likeStatus}</p> : <div className="flex min-h-11 items-center"><p role="status">{likeStatus}</p></div>)}
      {likeError && (
        <p role="alert" className="font-medium text-foreground">
          {likeError}
        </p>
      )}
    </div>
  ) : null;

  const textBlocks = (
    <>
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
          {year !== undefined && <span>{year}</span>}
          {task && <span>{task}</span>}
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
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm leading-relaxed text-muted-foreground">
          {details.map((detail) => <span key={detail}>{detail}</span>)}
        </p>
      ) : null}
      {attribution && (
        <div className="pointer-events-none relative z-10 flex flex-col gap-2 [&_a]:pointer-events-auto [&_button]:pointer-events-auto [&_details]:pointer-events-auto">
          {attribution}
        </div>
      )}
    </>
  );

  return (
    // The wrapper never moves. The hover lift is on the card inside it (see .problem-entry-lift in globals.css), so the
    // pointer stays over the wrapper while the card rises 2px and the card cannot flicker at its lower edge.
    <div className="problem-entry-lift min-w-0">
    <Card
      role="article"
      aria-labelledby={titleId}
      data-problem-card={id}
      data-competition={competition}
      data-level={band?.id}
      className={cardClass}
    >
      {elo !== undefined && band ? (
        <div
          data-rating-block
          // A soft tint of the band colour, a 4px stripe on the top edge (the left edge from sm up) and the band colour on
          // the number and the label. The colour is the --band token of the card, set from data-level in globals.css.
          // Plain text, not a labelled group: a group made a screen reader say "Rating 2,650, Mastery" and then read the
          // same two lines again. Now it reads "Rating 2,650" and then "Mastery".
          className={`${ratingBlockClass} border-t-[hsl(var(--band))] bg-[hsl(var(--band)/0.1)] sm:border-l-[hsl(var(--band))]`}
        >
          <p className="text-3xl font-semibold leading-none tabular-nums text-[hsl(var(--band))]">
            <span className="sr-only">Rating </span>
            {elo.toLocaleString("en-US")}
          </p>
          <p className="text-sm font-medium text-[hsl(var(--band))]">{band.name}</p>
        </div>
      ) : (
        <div data-rating-block className={`${ratingBlockClass} bg-muted/50`}>
          <p className="text-xl font-semibold leading-none text-muted-foreground">Unrated</p>
          <p lang={statementLanguage} className="text-sm text-muted-foreground">
            {statementLanguage === "ru" ? "русский" : "English"}
          </p>
        </div>
      )}
      <div className={bodyClass}>
        <div className={shown ? `${contentClass} sm:flex-row sm:items-start sm:gap-6` : contentClass}>
          {shown ? <div className="flex min-w-0 flex-1 flex-col gap-4">{textBlocks}</div> : textBlocks}
          {shown && (
            <div data-card-image className={imageFrameClass}>
              {/* A plain img: the figures are static public files, and the explicit width and height reserve the box. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shown.src} alt={shown.alt} width={shown.width} height={shown.height} loading="lazy" decoding="async" draggable={false} className={imageClass} onError={() => setFailedSrc(shown.src)} />
            </div>
          )}
        </div>
        {/* The footer keeps its own rule and tint across the full width of the card. */}
        <div className={footerClass}>
          {action}
          {like}
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
                    // The fill is the primary token. The border stays the strong foreground colour, because the peach fill on its own is
                    // under 3:1 against a light card and the sweep holds a control border to 3:1.
                    isActiveTag(tagFilter.active, tag) && "border-foreground bg-primary text-primary-foreground hover:bg-primary",
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
    </div>
  );
}

/** A bar of the loading placeholder. It pulses, and stands still when the person asks for less motion. */
function Bar({ className, ...props }: React.ComponentProps<"div"> & { className: string }) {
  return <div {...props} className={cn("rounded bg-muted motion-safe:animate-pulse", className)} />;
}

/**
 * The loading placeholder for one card. It is built from the same classes as the card, so the box is the same and the
 * list does not jump when the real cards arrive. It is hidden from assistive technology: the list announces the loading.
 */
export function ProblemCardSkeleton() {
  // Tag filters are 44px buttons and plain tags are small badges, so the placeholder follows what the card will show.
  const tagRow = useTagFilter() ? "h-11" : "h-6";
  return (
    <div className="problem-entry-lift min-w-0" aria-hidden="true" data-problem-card-skeleton>
      <Card className={cardClass}>
        <div data-rating-block className={`${ratingBlockClass} bg-muted/50`}>
          <Bar className="h-[1.875rem] w-16" />
          <Bar className="h-5 w-24" />
        </div>
        <div className={bodyClass}>
          {/* The picture slot of a card with an image, in the same place and size, so the list does not jump when cards arrive. */}
          <div className={`${contentClass} sm:flex-row sm:items-start sm:gap-6`}>
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Bar className="h-5 w-40" />
                <Bar className="h-7 w-3/4" />
                {/* A description line is 22.75px tall. It takes two lines on a narrow card and usually one on a wide one. */}
                <div className="flex flex-col">
                  <div className="flex h-[22.75px] items-center"><Bar className="h-4 w-full" /></div>
                  <div className="flex h-[22.75px] items-center lg:hidden"><Bar className="h-4 w-2/3" /></div>
                </div>
              </div>
              {/* The line that names the publisher, so the placeholder is as tall as a card with attribution. */}
              <Bar className="h-5 w-48" />
            </div>
            <Bar data-card-image-slot className="h-[120px] w-full shrink-0 rounded-lg sm:h-40 sm:w-44 lg:w-60" />
          </div>
          <div className={footerClass}>
            <Bar className="h-11 w-full sm:w-40" />
            <div className="flex min-w-0 flex-wrap gap-2 sm:flex-1">
              <Bar className={`${tagRow} w-24 rounded-full`} />
              <Bar className={`${tagRow} w-28 rounded-full`} />
              <Bar className={`${tagRow} w-24 rounded-full`} />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

/** A few placeholder cards with one announcement for the whole list. */
export function ProblemCardSkeletonList({ label, count = 3 }: { label: string; count?: number }) {
  return (
    <div role="status" className="grid min-w-0 gap-6">
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }, (_, index) => (
        <ProblemCardSkeleton key={index} />
      ))}
    </div>
  );
}
