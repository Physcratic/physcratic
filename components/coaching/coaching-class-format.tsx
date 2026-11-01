import { content } from "@/lib/coaching/content";

const { classFormat } = content;

export function CoachingClassFormat() {
  return <section id="how-it-works" className="border-t border-border py-20">
    <div className="coaching-container mx-auto flex max-w-3xl flex-col gap-8">
      <h2 className="text-center text-balance font-serif text-3xl leading-tight sm:text-4xl">{classFormat.title}</h2>
      <ul aria-label={classFormat.listLabel} className="grid gap-3 sm:grid-cols-2">{classFormat.points.map((point) => <li key={point} className="rounded-lg bg-foreground/5 px-4 py-3.5 leading-relaxed">{point}</li>)}</ul>
      <div className="flex flex-col gap-3">
        <h3 className="text-xl font-semibold tracking-tight">{classFormat.stretchTitle}</h3>
        <p className="leading-relaxed text-muted-foreground">{classFormat.stretchText}</p>
      </div>
      <p className="leading-relaxed text-muted-foreground">{classFormat.topics}</p>
    </div>
  </section>;
}
