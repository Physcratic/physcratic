import { content } from "@/lib/coaching/content";

const { glance } = content;

export function CoachingGlance() {
  return <section aria-labelledby="glance-title" className="border-b border-border py-20">
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-5">
      <h2 id="glance-title" className="text-center text-balance text-3xl font-bold tracking-tight sm:text-4xl">{glance.title}</h2>
      <dl className="divide-y divide-border border-y border-border">{glance.items.map((item) => <div key={item.term} className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6"><dt className="font-semibold text-accent">{item.term}</dt><dd className="leading-relaxed text-muted-foreground">{item.detail}</dd></div>)}</dl>
    </div>
  </section>;
}
