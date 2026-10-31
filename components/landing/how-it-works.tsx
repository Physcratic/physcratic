const steps = [
  {
    title: "Read the original",
    text: "Open a problem to see the original statement with its diagrams and an English translation.",
  },
  {
    title: "Write your working",
    text: "Work through it on paper or type it up. You can attach your pages when you are done.",
  },
  {
    title: "Check and track",
    text: "Authored problems check your answer automatically. Olympiad attempts are saved privately so you can track your progress.",
  },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <h2 id="how-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
        How it works
      </h2>
      <ol className="mt-6 grid gap-3 md:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className="rounded-xl border border-border bg-card p-5">
            <span aria-hidden="true" className="font-mono text-sm text-accent-foreground">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-2 text-lg font-medium">{step.title}</h3>
            <p className="mt-2 text-muted-foreground">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
