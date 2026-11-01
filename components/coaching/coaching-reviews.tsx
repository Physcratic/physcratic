import { coachAnchorId, content } from "@/lib/coaching/content";

const { reviews } = content;

export function CoachingReviews() {
  const at = reviews.quote.indexOf(reviews.linkText);
  const before = reviews.quote.slice(0, at);
  const after = reviews.quote.slice(at + reviews.linkText.length);
  return <section aria-labelledby="reviews-title" className="border-y border-border py-20">
    <div className="coaching-container flex flex-col gap-8">
      <h2 id="reviews-title" className="mx-auto max-w-2xl text-center text-balance font-serif text-3xl leading-tight sm:text-4xl">{reviews.title}</h2>
      <figure className="rounded-2xl border border-border bg-foreground/5 p-8 md:p-10">
        <blockquote><p className="max-w-3xl text-xl leading-relaxed text-foreground sm:text-2xl">{before}<a href={`#${coachAnchorId(reviews.linkSlug)}`} className="underline decoration-accent underline-offset-4">{reviews.linkText}</a>{after}</p></blockquote>
        <figcaption className="mt-6 flex flex-col gap-1">
          <span className="font-semibold">{reviews.name}</span>
          <span className="text-sm text-muted-foreground">{reviews.achievement}</span>
          <span className="text-sm text-muted-foreground">{reviews.programs}</span>
        </figcaption>
      </figure>
      <p className="text-center text-sm text-muted-foreground">{reviews.note}</p>
    </div>
  </section>;
}
