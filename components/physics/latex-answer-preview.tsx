"use client";

import { useMemo } from "react";
import katex from "katex";

export function LatexAnswerPreview({ value }: { value: string }) {
  const html = useMemo(() => {
    if (!value.trim()) return null;
    try {
      return katex.renderToString(value, {
        displayMode: false, throwOnError: true, trust: false, strict: "error",
        maxExpand: 100, maxSize: 10, output: "htmlAndMathml",
      });
    } catch { return null; }
  }, [value]);
  if (!value.trim()) return null;
  return <div role="group" className="min-w-0 overflow-x-auto rounded-md bg-muted/30 px-3 py-2 text-foreground" aria-label="Answer preview">
    {html ? <span dangerouslySetInnerHTML={{ __html: html }} /> : <span className="text-sm text-muted-foreground">Preview unavailable. Check the LaTeX syntax before submitting.</span>}
  </div>;
}
