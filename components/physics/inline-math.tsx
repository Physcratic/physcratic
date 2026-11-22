"use client";

import { Fragment, useMemo } from "react";
import { renderLatexInline } from "./latex-answer-preview";
import type { ConditionPhrase } from "./answer-palette";

/**
 * A short expression typeset with the same renderer as the answer preview. When the LaTeX does not parse, the plain
 * `fallback` text is shown instead. It never throws and never shows an error message.
 */
export function InlineMath({ latex, fallback, className }: { latex: string; fallback: string; className?: string }) {
  const html = useMemo(() => renderLatexInline(latex), [latex]);
  if (!html) return <span className={className}>{fallback}</span>;
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** "Conditions: k > 0, 50 ≤ u ≤ 150." with each condition typeset. Shows nothing when there are none. */
export function ConditionsLine({ phrases }: { phrases: readonly ConditionPhrase[] }) {
  if (!phrases.length) return null;
  return (
    <p className="text-sm text-muted-foreground">
      Conditions:{" "}
      {phrases.map((phrase, index) => (
        <Fragment key={`${index}:${phrase.text}`}>
          {index > 0 && ", "}
          <InlineMath latex={phrase.latex} fallback={phrase.text} />
        </Fragment>
      ))}
      .
    </p>
  );
}
