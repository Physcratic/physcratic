import { ChevronDown } from "lucide-react";
import { FeedbackLink } from "@/components/feedback-link";
import { competitionBreakdown, counts } from "./data";

const items = [
  {
    q: "Is it free to browse?",
    a: "Yes. You can read problems, diagrams and translations without an account.",
  },
  {
    q: "Which competitions are covered?",
    a: `IPhO, APhO and EuPhO theory problems. ${counts.olympiad} are imported so far (${competitionBreakdown}), plus the complete IPhO 2025 papers. The set keeps growing.`,
  },
  {
    q: "Do I need an account?",
    a: "Not to browse. You need an account to save your attempts.",
  },
];

const summary =
  "flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 px-4 py-2 text-left font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden";
const chevron =
  "size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none";

export function Faq() {
  return (
    <section aria-labelledby="faq-heading" className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h2 id="faq-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Questions
      </h2>
      <div className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">
        {items.map((item) => (
          <details key={item.q} className="group">
            <summary className={summary}>
              {item.q}
              <ChevronDown aria-hidden="true" className={chevron} />
            </summary>
            <p className="px-4 pb-4 text-muted-foreground">{item.a}</p>
          </details>
        ))}
        <details className="group">
          <summary className={summary}>
            What does &ldquo;Beta&rdquo; mean, and how do I report a problem?
            <ChevronDown aria-hidden="true" className={chevron} />
          </summary>
          <div className="space-y-3 px-4 pb-4 text-muted-foreground">
            <p>
              Beta means the problem set is still growing and the English
              translations are drafts that have not been independently reviewed.
              If a figure, translation or answer looks wrong, tell us.
            </p>
            <div className="[&_a]:min-h-11">
              <FeedbackLink variant="inline" />
            </div>
          </div>
        </details>
      </div>
    </section>
  );
}
