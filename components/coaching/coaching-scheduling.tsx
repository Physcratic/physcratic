import { Highlighted } from "./coaching-highlight";
import { content } from "@/lib/coaching/content";

const { scheduling } = content;
const { schedule } = scheduling;
const span = schedule.axisEnd - schedule.axisStart;
const place = (from: number, to: number) => ({ left: `${((from - schedule.axisStart) / span) * 100}%`, width: `${((to - from) / span) * 100}%` });

function Row({ label, range, from, to, highlight = false }: { label: string; range: string; from: number; to: number; highlight?: boolean }) {
  return <div className="relative z-10 py-2">
    <p className={`mb-1 flex justify-between gap-2 text-xs sm:text-sm lg:text-base ${highlight ? "font-bold text-accent" : "text-muted-foreground"}`}><span>{label}</span><span>{range}</span></p>
    <div className="relative h-7 sm:h-8 lg:h-10"><div className={`absolute inset-y-0 rounded ${highlight ? "bg-accent" : "bg-primary"}`} style={place(from, to)} /></div>
  </div>;
}

export function CoachingScheduling() {
  const overlap = schedule.overlap;
  return <section id="scheduling" className="border-t border-border py-20">
    <div className="coaching-container grid gap-10 lg:grid-cols-[2fr_3fr] lg:items-center lg:gap-16">
      <div className="flex flex-col gap-4 text-center lg:text-left">
        <h2 className="text-balance font-serif text-3xl leading-tight sm:text-4xl">{scheduling.title}</h2>
        <p className="leading-relaxed text-muted-foreground"><Highlighted text={scheduling.text} phrase={scheduling.highlight} /></p>
        <p className="leading-relaxed text-muted-foreground">{scheduling.note}</p>
      </div>
      <figure className="coaching-lift flex flex-col gap-4 rounded-2xl border border-border bg-foreground/5 p-3 sm:p-6 lg:p-8">
        <div aria-hidden="true" className="px-4 sm:px-6">
          <div className="relative">
            <div className="absolute inset-y-0 z-0 border-x border-dashed border-accent bg-accent/15" style={place(overlap.from, overlap.to)} />
            {schedule.students.map((student, index) => <Row key={student.label} label={student.label} range={scheduling.ranges.students[index]} from={student.from} to={student.to} />)}
            <Row label={overlap.label} range={scheduling.ranges.overlap} from={overlap.from} to={overlap.to} highlight />
            <div className="relative mt-1 h-6 border-t border-border">{scheduling.ticks.map((tick, index) => <span key={tick} className="absolute top-1 -translate-x-1/2 text-[11px] text-muted-foreground sm:text-xs" style={{ left: `${(index / span) * 100}%` }}>{tick}</span>)}</div>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">{scheduling.axisLabel}</p>
        </div>
        <p className="sr-only">{scheduling.description}</p>
        <figcaption className="text-center text-lg font-bold text-accent lg:text-xl">{scheduling.caption}</figcaption>
      </figure>
    </div>
  </section>;
}
