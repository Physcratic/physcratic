import { coachAnchorId, content } from "@/lib/coaching/content";
import { splitHighlight } from "@/lib/coaching/highlight";
import { CoachingAvatar } from "./coaching-avatar";
import { MedalChip } from "./coaching-highlight";

const { reviews } = content;

export function CoachingReviews() {
  // The link sits on the first "Arrow" in the quote.
  const parts = splitHighlight(reviews.quote, reviews.linkText);
  return <section aria-labelledby="reviews-title" className="border-y border-border py-20">
    <div className="coaching-container flex flex-col gap-8">
      <h2 id="reviews-title" className="mx-auto max-w-2xl text-center text-balance font-serif text-3xl leading-tight sm:text-4xl">{reviews.title}</h2>
      <figure className="rounded-2xl border border-border bg-foreground/5 p-6 sm:p-8 md:p-10">
        <blockquote><p className="max-w-3xl text-xl leading-relaxed text-foreground sm:text-2xl">{parts ? <>{parts.before}<a href={`#${coachAnchorId(reviews.linkSlug)}`} className="underline decoration-accent underline-offset-4">{parts.match}</a>{parts.after}</> : reviews.quote}</p></blockquote>
        <figcaption className="mt-6 flex items-start gap-4">
          <CoachingAvatar variant="round" className="size-12 shrink-0" />
          <span className="flex min-w-0 flex-col gap-2">
            <span className="font-semibold">{reviews.name}</span>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-muted-foreground"><MedalChip medal="gold" label={reviews.medal} best />{reviews.achievement}</span>
            <span className="text-sm text-muted-foreground">{reviews.programs}</span>
          </span>
        </figcaption>
      </figure>
      <p className="text-center text-sm text-muted-foreground">{reviews.note}</p>
    </div>
  </section>;
}
