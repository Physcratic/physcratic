import { competitionBreakdown, counts } from "./data";

const stats = [
  { value: counts.olympiad, label: "olympiad problems", sub: competitionBreakdown },
  {
    value: "IPhO 2025",
    label: "complete",
    sub: `${counts.iphoPapers} papers, ${counts.iphoSubproblems} subproblems`,
  },
  { value: counts.topics, label: "topics", sub: "Mechanics to modern physics" },
  { value: counts.warmUps, label: "warm-up problems", sub: "Short, with hints and solutions" },
];

export function ProofStrip() {
  return (
    <section aria-label="What is on Physcratic" className="border-b border-border/60 bg-card/40">
      <dl className="mx-auto grid max-w-6xl grid-cols-1 gap-px bg-border/60 px-0 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col bg-background px-4 py-5 sm:px-6">
            <dt className="text-sm text-foreground">{stat.label}</dt>
            <dd className="order-first font-mono text-3xl font-semibold tracking-tight">
              {stat.value}
            </dd>
            <dd className="mt-1 text-sm text-muted-foreground">{stat.sub}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
