import { counts, links } from "./data";

export function ArchiveTeaser() {
  return (
    <section aria-labelledby="archive-heading" className="border-y border-border/60 bg-card/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <h2 id="archive-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            The complete IPhO 2025 archive
          </h2>
          <p className="mt-2 text-muted-foreground">
            All {counts.iphoPapers} papers ({counts.theoryPapers} theory, {counts.experimentPapers} experiment)
            split into {counts.iphoSubproblems} subproblems, so you can practise one part at a time.
          </p>
        </div>
        <a
          href={links.contests}
          className="inline-flex min-h-11 shrink-0 items-center rounded-md font-medium text-accent-foreground underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Open the IPhO 2025 papers
        </a>
      </div>
    </section>
  );
}
