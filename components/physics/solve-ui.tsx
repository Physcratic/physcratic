import * as React from "react";
import { CircleAlert, CircleCheck, CircleX, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { describePartResult, resultMessage, type FeedbackStatus, type FeedbackTone } from "@/lib/solve-feedback";

/**
 * The solving screens used to raise `--border` and `--input` locally. The site-wide tokens in app/globals.css are now 3:1 or
 * better on the page, cards and fills in both themes, so nothing is overridden here. The name stays so callers need no change.
 */
export const solveTokens = "";

/** Line length for problem text: about 70 characters. */
export const proseWidth = "max-w-[70ch]";

/**
 * Parts are told apart by their letter and their order, not by hue. Colour on the problem pages is kept for state: green for
 * success, red for wrong and peach for the main action. These three keep their names so every caller works unchanged.
 */
export function partStyle(index?: number): React.CSSProperties | undefined {
  void index;
  return undefined;
}
export const partBorder = "";

/** A neutral badge with the part's label, in bold. The label text stays, so nothing depends on colour. Its 1px border keeps its shape at 3:1 against the card. */
export function PartChip({ children, className }: { index?: number; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex min-h-7 items-center rounded-md border border-border bg-idle-tint px-2.5 py-0.5 text-sm font-bold text-foreground", className)}>
      {children}
    </span>
  );
}

/** One answer card: the plain card with a thin border. The part that comes next is outlined with the ring token, nothing else changes. */
export function answerCardClass(next: boolean): string {
  return cn("min-w-0 rounded-lg border bg-card p-4 text-card-foreground", next && "outline outline-2 outline-ring");
}

/** The invalid field uses the same red ink as the "Not correct" line. */
export const invalidFieldText = "data-[invalid=true]:text-danger-ink";

const stepNames = ["Read", "Answer", "Check", "Solution"] as const;

/** The four steps of every problem, in order. Optional links go to the section for each step. */
export function SolveSteps({ hrefs, className, onNavigate, show }: { hrefs?: Partial<Record<1 | 2 | 3 | 4, string>>; className?: string; onNavigate?: (step: 1 | 2 | 3 | 4) => void; show?: readonly (1 | 2 | 3 | 4)[] }) {
  // `show` lists the steps a page really has. They are numbered in order, and hrefs and onNavigate still use the canonical step (1 Read, 2 Answer, 3 Check, 4 Solution).
  const shown = show ? stepNames.map((name, index) => ({ name, step: (index + 1) as 1 | 2 | 3 | 4 })).filter(({ step }) => show.includes(step)) : stepNames.map((name, index) => ({ name, step: (index + 1) as 1 | 2 | 3 | 4 }));
  return (
    <ol aria-label="Steps" className={cn("grid grid-cols-2 gap-2", shown.length > 2 ? "sm:grid-cols-4" : "sm:grid-cols-2", className)}>
      {shown.map(({ name, step }, index) => {
        const number = index + 1;
        const href = hrefs?.[step];
        const body = (
          <>
            <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full border border-foreground text-sm font-semibold">{number}</span>
            <span className="text-sm font-medium"><span className="sr-only">Step {number}: </span>{name}</span>
          </>
        );
        const box = "flex min-h-11 items-center gap-2 rounded-lg border bg-card px-3 py-2 text-card-foreground";
        return (
          <li key={name}>
            {href ? <a href={href} onClick={() => onNavigate?.(step)} className={cn(box, "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2")}>{body}</a> : <div className={box}>{body}</div>}
          </li>
        );
      })}
    </ol>
  );
}

/** A visible step number for places where the accessible name must stay as it is, such as tab labels. */
export function StepNumber({ children }: { children: React.ReactNode }) {
  return <span aria-hidden="true" className="mr-2 inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-semibold">{children}</span>;
}

/** Heading for one numbered step. */
export function StepHeading({ step, as: Tag = "h2", id, children, className }: { step: 1 | 2 | 3 | 4; as?: "h2" | "h3"; id?: string; children: React.ReactNode; className?: string }) {
  return (
    <Tag id={id} className={cn("flex items-center gap-3 text-lg font-semibold tracking-tight", className)}>
      <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full border border-foreground text-sm font-semibold">{step}</span>
      <span><span className="sr-only">Step {step}: </span>{children}</span>
    </Tag>
  );
}

const toneStyles: Record<FeedbackTone, { box: string; Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }> }> = {
  success: { box: "border-border bg-card text-foreground", Icon: CircleCheck },
  error: { box: "border-border bg-card text-foreground", Icon: CircleX },
  warning: { box: "border-border bg-card text-foreground", Icon: CircleAlert },
  neutral: { box: "border-border bg-muted text-foreground", Icon: Info },
};

const toneText: Record<FeedbackTone, string> = {
  success: "text-success-ink",
  error: "text-danger-ink",
  warning: "text-foreground",
  neutral: "text-muted-foreground",
};

/** Result of a check: a quiet box, an icon in the state's ink and words together. Put it next to the answer. */
export function FeedbackBox({ tone, title, children, className, id, titleAs: Title = "p" }: { tone: FeedbackTone; title: string; children?: React.ReactNode; className?: string; id?: string; titleAs?: "p" | "h3" }) {
  const { box, Icon } = toneStyles[tone];
  return (
    <div id={id} className={cn("flex items-start gap-3 rounded-lg border p-4", box, className)}>
      <Icon className={cn("mt-0.5 size-5 shrink-0", toneText[tone])} aria-hidden={true} />
      <div className="min-w-0 space-y-1 text-sm leading-relaxed">
        <Title className="text-base font-semibold">{title}</Title>
        {children}
      </div>
    </div>
  );
}

/**
 * Result for one answer, next to its input: icon, words and the grader's message. A correct part gets a small success tint behind
 * its icon and word only, so the card stays plain. Wrong is the danger ink, and the other results stay neutral.
 */
export function ResultLine({ status, message, id }: { status: FeedbackStatus; message: string; id?: string }) {
  const { tone, label } = describePartResult(status);
  const { Icon } = toneStyles[tone];
  const words = resultMessage(status, message);
  if (tone === "success")
    return (
      <p id={id} className="text-sm leading-relaxed text-foreground">
        <span className={cn("inline-flex items-center gap-2 bg-success-tint px-2 py-1", toneText.success)}>
          <Icon className="size-4 shrink-0" aria-hidden={true} />
          <strong className="font-semibold">{label}.</strong>
        </span>{" "}
        {words}
      </p>
    );
  return (
    <p id={id} className={cn("flex items-start gap-2 text-sm leading-relaxed", toneText[tone])}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden={true} />
      <span className="min-w-0"><strong className="font-semibold">{label}.</strong> {words}</span>
    </p>
  );
}
