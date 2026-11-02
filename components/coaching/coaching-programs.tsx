import Link from "next/link";
import { Highlighted } from "./coaching-highlight";
import { CoachingMidCta } from "./coaching-mid-cta";
import { TagList } from "./coaching-tags";
import { content, programHref } from "@/lib/coaching/content";

const { programs } = content;
type Program = (typeof programs.items)[number];

const isOlympiad = (item: Program) => item.pathway.startsWith("Olympiad");
const levels = programs.items.filter(isOlympiad);
const tracks = programs.items.filter((item) => !isOlympiad(item));

/** Card order: level name, "For" as the largest line, "Covers" as chips, "Goal" in bold, then the button. */
function ProgramCard({ item, track = false }: { item: Program; track?: boolean }) {
  return <article className={`coaching-lift coaching-program flex h-full flex-col gap-5 rounded-2xl border p-6 text-foreground ${track ? "border-dashed border-accent/50 bg-transparent lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-10 lg:p-8" : "border-border bg-background"}`}>
    <div className="flex flex-col gap-4">
      {track && <p className="w-fit rounded-full border border-accent/50 px-2.5 py-0.5 text-xs font-semibold text-accent">{programs.trackLabel}</p>}
      <h3 className="text-xl font-semibold tracking-tight">{item.title}</h3>
      <div><p className="text-sm text-muted-foreground">{programs.forLabel}</p><p className="mt-1 text-lg font-medium leading-snug text-foreground">{item.for}</p></div>
    </div>
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col gap-2"><p className="text-sm text-muted-foreground">{programs.coversLabel}</p><TagList items={item.covers} label={`${item.title}: ${programs.coversLabel}`} /></div>
      <p className="leading-relaxed"><span className="font-bold">{programs.goalLabel}:</span> <span className="font-bold">{item.goal}</span></p>
      <Link href={programHref(item.pathway)} scroll={false} className="coaching-button coaching-button-secondary mt-auto self-start">{programs.linkLabel}</Link>
    </div>
  </article>;
}

export function CoachingPrograms() {
  return <section id="programs" className="border-t border-border py-20">
    <div className="coaching-container flex flex-col gap-12">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
        <h2 className="text-balance font-serif text-3xl leading-tight sm:text-4xl">{programs.title}</h2>
        <p className="text-lg leading-relaxed text-muted-foreground"><Highlighted text={programs.intro} phrase={programs.highlight} /></p>
        <p className="text-sm leading-relaxed text-muted-foreground">{programs.note}</p>
      </div>
      <ol aria-label={programs.ladderLabel} className="coaching-ladder">
        {levels.map((item) => <li key={item.title} className="coaching-ladder-step"><span className="coaching-ladder-dot" aria-hidden="true" /><ProgramCard item={item} /></li>)}
      </ol>
      {tracks.map((item) => <ProgramCard key={item.title} item={item} track />)}
      <CoachingMidCta />
    </div>
  </section>;
}
