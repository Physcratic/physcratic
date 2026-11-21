"use client";

import { useMemo } from "react";
import katex from "katex";

/**
 * One line of LaTeX as typeset HTML, or null when it does not parse. The answer preview and the symbol chips and
 * conditions in the answer panel all use this, so they agree on what counts as valid. It never throws.
 */
export function renderLatexInline(value: string): string | null {
  if (!value.trim()) return null;
  try {
    return katex.renderToString(value, {
      displayMode: false, throwOnError: true, trust: false, strict: "error",
      maxExpand: 100, maxSize: 10, output: "htmlAndMathml",
    });
  } catch { return null; }
}

export function LatexAnswerPreview({ value }: { value: string }) {
  const html = useMemo(() => renderLatexInline(value), [value]);
  if (!value.trim()) return null;
  return <div role="group" className="min-w-0 overflow-x-auto rounded-md bg-muted/30 px-3 py-2 text-foreground" aria-label="Answer preview">
    {html ? <span dangerouslySetInnerHTML={{ __html: html }} /> : <span className="text-sm text-muted-foreground">Preview unavailable. Check the LaTeX syntax before submitting.</span>}
  </div>;
}
