import { Highlighted } from "./coaching-highlight";
import Link from "next/link";
import { content, programHref } from "@/lib/coaching/content";

const { programs } = content;

export function CoachingPrograms() {
  return <section id="programs" className="border-t border-border py-20">
    <div className="coaching-container flex flex-col gap-10">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
        <h2 className="text-balance font-serif text-3xl leading-tight sm:text-4xl">{programs.title}</h2>
        <p className="leading-relaxed text-muted-foreground"><Highlighted text={programs.intro} phrase={programs.highlight} /></p>
      </div>
      <ul className="grid gap-6 md:grid-cols-2">{programs.items.map((item) => <li key={item.title} className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-6 text-foreground">
        <h3 className="text-xl font-semibold tracking-tight">{item.title}</h3>
        <dl className="flex flex-col gap-3 leading-relaxed">
          <div><dt className="text-sm font-medium text-accent">{programs.forLabel}</dt><dd className="text-muted-foreground">{item.for}</dd></div>
          <div><dt className="text-sm font-medium text-accent">{programs.coversLabel}</dt><dd className="text-muted-foreground">{item.covers}</dd></div>
          <div><dt className="text-sm font-medium text-accent">{programs.goalLabel}</dt><dd className="text-muted-foreground">{item.goal}</dd></div>
        </dl>
        <Link href={programHref(item.pathway)} scroll={false} className="coaching-button coaching-button-secondary mt-auto self-start">{programs.linkLabel}</Link>
      </li>)}</ul>
    </div>
  </section>;
}
