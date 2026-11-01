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
      <figure className="mx-auto w-full max-w-4xl rounded-2xl border border-foreground/20 bg-foreground/[.04] p-6 sm:p-10">
        <blockquote><p className="font-serif text-xl leading-relaxed text-foreground lg:text-2xl lg:leading-relaxed">{parts ? <>{parts.before}<a href={`#${coachAnchorId(reviews.linkSlug)}`} className="underline decoration-accent underline-offset-4">{parts.match}</a>{parts.after}</> : reviews.quote}</p></blockquote>
        <figcaption className="mt-8 flex flex-col gap-3">
          <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <CoachingAvatar variant="round" className="size-12 shrink-0" />
            <span className="font-bold">{reviews.name}</span>
            <MedalChip medal="gold" label={reviews.medal} best />
          </span>
          <span className="text-sm text-muted-foreground">{reviews.achievement}. {reviews.programs}</span>
        </figcaption>
      </figure>
      <p className="text-center text-sm text-muted-foreground">{reviews.note}</p>
    </div>
  </section>;
}
