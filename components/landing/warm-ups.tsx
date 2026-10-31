import { counts, links, warmUps } from "./data";

export function WarmUps() {
  return (
    <section aria-labelledby="warm-ups-heading" className="border-y border-border/60 bg-card/40">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 id="warm-ups-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Start with a warm-up
        </h2>
        <p className="mt-2 text-muted-foreground">
          These are short practice problems. Olympiad problems open from the catalog.
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {warmUps.map((problem) => (
            <li
              key={problem.id}
              className="relative rounded-xl border border-border bg-card p-4 transition-colors focus-within:ring-2 focus-within:ring-ring hover:border-primary/60 motion-reduce:transition-none"
            >
              <p className="text-sm text-muted-foreground">
                {problem.topic}
                <span aria-hidden="true"> · </span>
                {problem.minutes} min
              </p>
              <h3 className="mt-1 text-lg font-medium leading-snug">
                <a
                  href={problem.href}
                  className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none"
                >
                  {problem.title}
                </a>
              </h3>
            </li>
          ))}
        </ul>
        <p className="mt-6">
          <a
            href={links.problems}
            className="inline-flex min-h-11 items-center rounded-md font-medium text-accent-foreground underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Browse {counts.olympiad} olympiad problems
          </a>
        </p>
      </div>
    </section>
  );
}
