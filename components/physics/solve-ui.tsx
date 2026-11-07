import * as React from "react";
import { CircleAlert, CircleCheck, CircleX, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { partColor } from "@/lib/part-colors";
import { describePartResult, type FeedbackStatus, type FeedbackTone } from "@/lib/solve-feedback";

/**
 * The solving screens used to raise `--border` and `--input` locally. The site-wide tokens in app/globals.css are now 3:1 or
 * better on the page, cards and fills in both themes, so nothing is overridden here. The name stays so callers need no change.
 */
export const solveTokens = "";

/** Line length for problem text: about 70 characters. */
export const proseWidth = "max-w-[70ch]";

/** Inline style that carries one part's colours for both themes. Pair with `partBorder` and `PartChip`. */
export function partStyle(index: number): React.CSSProperties {
  const color = partColor(index);
  return {
    "--pb": color.light.border, "--pb-d": color.dark.border,
    "--pc-bg": color.light.chipBackground, "--pc-bg-d": color.dark.chipBackground,
    "--pc-fg": color.light.chipText, "--pc-fg-d": color.dark.chipText,
  } as React.CSSProperties;
}

/** The 4px coloured left border of a part card. Use together with `style={partStyle(index)}`. */
export const partBorder = "border-l-4 border-l-[color:var(--pb)] dark:border-l-[color:var(--pb-d)]";

/** A tinted chip with the part's original label text. The text stays, so colour is never the only cue. */
export function PartChip({ index, children, className }: { index: number; children: React.ReactNode; className?: string }) {
  return (
    <span
      style={partStyle(index)}
      className={cn("inline-flex min-h-7 items-center rounded-md bg-[color:var(--pc-bg)] px-2.5 py-0.5 text-sm font-semibold text-[color:var(--pc-fg)] dark:bg-[color:var(--pc-bg-d)] dark:text-[color:var(--pc-fg-d)]", className)}
    >
      {children}
    </span>
  );
}

const stepNames = ["Read", "Answer", "Check", "Solution"] as const;

/** The four steps of every problem, in order. Optional links go to the section for each step. */
export function SolveSteps({ hrefs, className }: { hrefs?: Partial<Record<1 | 2 | 3 | 4, string>>; className?: string }) {
  return (
    <ol aria-label="Steps" className={cn("grid grid-cols-2 gap-2 sm:grid-cols-4", className)}>
      {stepNames.map((name, index) => {
        const number = (index + 1) as 1 | 2 | 3 | 4;
        const href = hrefs?.[number];
        const body = (
          <>
            <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full border border-foreground text-sm font-semibold">{number}</span>
            <span className="text-sm font-medium"><span className="sr-only">Step {number}: </span>{name}</span>
          </>
        );
        const box = "flex min-h-11 items-center gap-2 rounded-lg border bg-card px-3 py-2 text-card-foreground";
        return (
          <li key={name}>
            {href ? <a href={href} className={cn(box, "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2")}>{body}</a> : <div className={box}>{body}</div>}
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
  success: { box: "border-emerald-700 bg-emerald-50 text-emerald-950 dark:border-emerald-400 dark:bg-emerald-950 dark:text-emerald-50", Icon: CircleCheck },
  error: { box: "border-red-700 bg-red-50 text-red-950 dark:border-red-400 dark:bg-red-950 dark:text-red-50", Icon: CircleX },
  warning: { box: "border-amber-700 bg-amber-50 text-amber-950 dark:border-amber-400 dark:bg-amber-950 dark:text-amber-50", Icon: CircleAlert },
  neutral: { box: "border-border bg-muted text-foreground", Icon: Info },
};

/** Result of a check: colour, an icon and words together. Put it next to the answer. */
export function FeedbackBox({ tone, title, children, className, id, titleAs: Title = "p" }: { tone: FeedbackTone; title: string; children?: React.ReactNode; className?: string; id?: string; titleAs?: "p" | "h3" }) {
  const { box, Icon } = toneStyles[tone];
  return (
    <div id={id} className={cn("flex items-start gap-3 rounded-lg border-2 p-4", box, className)}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden={true} />
      <div className="min-w-0 space-y-1 text-sm leading-relaxed">
        <Title className="text-base font-semibold">{title}</Title>
        {children}
      </div>
    </div>
  );
}


const toneText: Record<FeedbackTone, string> = {
  success: "text-emerald-800 dark:text-emerald-300",
  error: "text-red-800 dark:text-red-300",
  warning: "text-amber-800 dark:text-amber-300",
  neutral: "text-muted-foreground",
};

/** Result for one answer, next to its input: icon, words and the grader's message. */
export function ResultLine({ status, message, id }: { status: FeedbackStatus; message: string; id?: string }) {
  const { tone, label } = describePartResult(status);
  const { Icon } = toneStyles[tone];
  return (
    <p id={id} className={cn("flex items-start gap-2 text-sm leading-relaxed", toneText[tone])}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden={true} />
      <span className="min-w-0"><strong className="font-semibold">{label}.</strong> {message}</span>
    </p>
  );
}
