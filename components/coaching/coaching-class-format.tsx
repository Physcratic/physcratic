import { Languages, Wallet } from "lucide-react";
import { Highlighted } from "./coaching-highlight";
import { TagList } from "./coaching-tags";
import { content } from "@/lib/coaching/content";

const { classFormat, glance } = content;

export function CoachingClassFormat() {
  return <section id="how-it-works" className="border-t border-border py-20">
    <div className="coaching-container mx-auto flex max-w-4xl flex-col gap-10">
      <h2 className="text-center text-balance font-serif text-3xl leading-tight sm:text-4xl">{classFormat.title}</h2>
      <div className="flex flex-col gap-5">
        <ul aria-label={classFormat.tilesLabel} className="grid grid-cols-2 gap-3 lg:grid-cols-4">{classFormat.tiles.map((tile) => <li key={tile.label} className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-foreground/5 p-4 sm:p-6">
          <span className="font-serif text-3xl leading-none text-balance break-words sm:text-5xl">{tile.value}</span>
          <span className="text-sm leading-snug text-muted-foreground sm:text-base">{tile.label}</span>
        </li>)}</ul>
        <ul aria-label={classFormat.listLabel} className="flex flex-col gap-1.5 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6">{classFormat.points.filter((_, index) => [2, 4, 5].includes(index)).map((point) => <li key={point} className="flex items-start gap-2"><span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground" />{point}</li>)}</ul>
      </div>
      <dl className="grid gap-6 sm:grid-cols-2">
        {[{ fact: glance.items[7], Icon: Languages }, { fact: glance.items[6], Icon: Wallet }].map(({ fact, Icon }) => <div key={fact.term} className="flex items-start gap-3">
          <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-accent" />
          <div className="space-y-1"><dt className="font-semibold">{fact.term}</dt><dd className="text-sm leading-relaxed text-muted-foreground">{fact.detail}</dd></div>
        </div>)}
      </dl>
      <div className="flex flex-col gap-4 border-l-4 border-accent py-1 pl-5 sm:pl-8">
        <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">{classFormat.stretchTitle}</h3>
        <p className="leading-relaxed text-muted-foreground"><Highlighted text={classFormat.stretchText} phrase={classFormat.highlight} /></p>
        <TagList items={classFormat.sources} label={classFormat.sourcesLabel} />
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-muted-foreground">{classFormat.topicsLabel}</p>
        <TagList items={classFormat.topics} label={classFormat.topicsLabel} />
        <p className="text-sm leading-relaxed text-muted-foreground">{classFormat.topicsNote}</p>
      </div>
    </div>
  </section>;
}
