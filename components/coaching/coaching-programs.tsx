import Link from "next/link";
import { BookOpen, Calculator, Gauge, Globe, Layers, Lightbulb, ListChecks, Orbit, RotateCw, Target, Thermometer, TrendingUp, Trophy, Waves, Zap } from "lucide-react";
import { content, programHref } from "@/lib/coaching/content";

const { programs } = content;
type Program = (typeof programs.items)[number];


const topicIcons = {
  "Your syllabus": BookOpen,
  "Taught by people who learned physics for olympiads": Trophy,
  "Why things work, not memorised mark schemes": Lightbulb,
  "Fundamental mechanics": Gauge,
  "The maths tools physics needs": Calculator,
  "Basic thermodynamics": Thermometer,
  "Introductory electricity and magnetism": Zap,
  "Strong problem-solving habits": Target,
  "Harder mechanics": Gauge,
  "Rotational dynamics": RotateCw,
  "Orbital mechanics": Orbit,
  "Electromagnetism": Zap,
  "Thermodynamics": Thermometer,
  "Waves and optics": Waves,
  "Steadily harder national problems": TrendingUp,
  "Long multi-step problems": ListChecks,
  "Deeper theory": BookOpen,
  "Tricks that don't show up in textbooks": Lightbulb,
  "International selection problems": Globe,
  "Problems that mix several topics": Layers,
  "IPhO and APhO difficulty": Trophy,
} as const;



/** Level name leads, followed by audience, a plain topic list, outcome and enquiry. */
function ProgramCard({ item }: { item: Program }) {
  return <article data-featured={item.pathway === "Olympiad Intermediate" ? "true" : undefined} className="coaching-lift coaching-program flex h-full flex-col gap-5 rounded-2xl border border-border bg-background p-6 text-foreground">
    <div className="flex flex-col gap-4">
      <h3 className="text-2xl font-semibold leading-tight tracking-tight">{item.title}</h3>
      <p className="text-base leading-relaxed text-muted-foreground">{item.for}</p>
    </div>
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col gap-2"><p className="text-sm text-muted-foreground">{programs.coversLabel}</p><ul aria-label={`${item.title}: ${programs.coversLabel}`} className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        {item.covers.map((topic) => {
          const Icon = topicIcons[topic as keyof typeof topicIcons] ?? BookOpen;
          return <li key={topic} className="flex items-start gap-3"><Icon aria-hidden="true" className={`mt-0.5 size-[18px] shrink-0 ${item.pathway === "Olympiad Intermediate" ? "text-accent" : "text-muted-foreground"}`} strokeWidth={1.7} /><span>{topic}</span></li>;
        })}
      </ul></div>
      <Link href={programHref(item.pathway)} scroll={false} className={`coaching-button mt-auto self-start${item.pathway !== "Olympiad Intermediate" ? " coaching-button-secondary" : ""}`}>{programs.linkLabel}</Link>
    </div>
  </article>;
}

export function CoachingPrograms() {
  return <section id="programs" className="border-t border-border py-20">
    <div className="coaching-container flex flex-col gap-12">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
        <h2 className="text-balance font-serif text-3xl leading-tight sm:text-4xl">{programs.title}</h2>
      </div>
      <ol aria-label={programs.ladderLabel} className="coaching-program-grid">
        {programs.items.map(item => <li key={item.pathway} className="min-w-0"><ProgramCard item={item} /></li>)}
      </ol>
    </div>
  </section>;
}
