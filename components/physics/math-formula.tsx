import katex from "katex";
import { cn } from "@/lib/utils";

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

  return (
    <div
      className={cn("math-formula overflow-x-auto", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
