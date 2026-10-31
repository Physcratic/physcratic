import { topicCards } from "./data";

export function TopicGrid() {
  return (
    <section aria-labelledby="topics-heading" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <h2 id="topics-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Browse by topic
      </h2>
      <p className="mt-2 text-muted-foreground">
        Counts include warm-up and olympiad problems.
      </p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {topicCards.map((topic) => (
          <li key={topic.value}>
            <a
              href={topic.href}
              className="group flex min-h-11 items-start gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
            >
              <topic.icon aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-accent-foreground" strokeWidth={1.6} />
              <span className="flex-1">
                <span className="block text-base font-medium">{topic.label}</span>
                <span className="block text-sm text-muted-foreground">{topic.description}</span>
              </span>
              <span className="whitespace-nowrap font-mono text-sm text-muted-foreground">
                {topic.count} problems
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
