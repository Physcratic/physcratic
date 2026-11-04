"use client";

import { useEffect, useRef, useState } from "react";
import katex from "katex";
import { cn } from "@/lib/utils";

/**
 * A display equation. A wide equation scrolls sideways inside its own box. Only when it really scrolls, the box
 * becomes a labelled region that the keyboard can focus, so it can be scrolled without a mouse. Short equations
 * add no tab stop.
 */
export function MathFormula({
  formula,
  className,
}: {
  formula: string;
  className?: string;
}) {
  const html = katex.renderToString(formula.replace(/^\$\$|\$\$$/g, ""), {
    displayMode: true,
    throwOnError: false,
    trust: false,
    output: "htmlAndMathml",
  });
  const box = useRef<HTMLDivElement>(null);
  const [scrolls, setScrolls] = useState(false);
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const measure = () => setScrolls(element.scrollWidth > element.clientWidth + 1);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [html]);

  return (
    <div
      ref={box}
      {...(scrolls ? { tabIndex: 0, role: "region", "aria-label": "Equation, scrolls sideways" } : {})}
      className={cn("math-formula overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
