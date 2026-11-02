import { content } from "@/lib/coaching/content";

const { glance } = content;

export function CoachingGlance() {
  return <section aria-labelledby="glance-title" className="border-b border-border py-20">
    <div className="coaching-container mx-auto flex max-w-4xl flex-col gap-8">
      <h2 id="glance-title" className="text-center text-balance font-serif text-3xl leading-tight sm:text-4xl">{glance.title}</h2>
      <dl className="grid gap-x-12 gap-y-5 md:grid-cols-2">{glance.items.map((item) => <div key={item.term} className="flex flex-col gap-0.5"><dt className="font-bold">{item.term}</dt><dd className="leading-relaxed text-muted-foreground">{item.detail}</dd></div>)}</dl>
    </div>
  </section>;
}
