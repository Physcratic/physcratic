import katex from "katex";

export const workingLimit = 10000;
export const equationTemplates = [
  { label: "Equation", latex: "a = b" },
  { label: "Fraction", latex: "\\frac{a}{b}" },
  { label: "Power", latex: "x^{2}" },
  { label: "Root", latex: "\\sqrt{x}" },
  { label: "Integral", latex: "\\int_{a}^{b} f(x)\\,dx" },
  { label: "Greek", latex: "\\theta" },
] as const;

export function insertEquation(
  value: string,
  start: number,
  end: number,
  latex: string,
) {
  const before = value.slice(0, start);
  const after = value.slice(end);
  const insideEquation = (before.match(/\$\$/g)?.length ?? 0) % 2 === 1;
  const selected = value.slice(start, end);
  const expression = selected
    ? latex.replace(/\{a\}|\{x\}/, `{${selected}}`)
    : latex;
  const insertion = insideEquation ? expression : `$$${expression}$$`;
  const nextValue = before + insertion + after;
  if (nextValue.length > workingLimit) return null;
  const selectionStart = start + (insideEquation ? 0 : 2);
  return {
    value: nextValue,
    selectionStart,
    selectionEnd: selectionStart + expression.length,
  };
}

export function previewWorking(value: string) {
  const pieces = value.slice(0, workingLimit).split("$$");
  return pieces.map((piece, index) => {
    if (index % 2 === 0) return { type: "text" as const, value: piece };
    if (index === pieces.length - 1)
      return {
        type: "error" as const,
        value: "Finish this equation with $$ to preview it.",
      };
    if (!piece.trim())
      return {
        type: "error" as const,
        value: "Add an expression between the $$ markers.",
      };
    try {
      const html = katex.renderToString(piece, {
        displayMode: true,
        throwOnError: true,
        trust: false,
        maxExpand: 1000,
        maxSize: 20,
        output: "htmlAndMathml",
      });
      return { type: "math" as const, value: html };
    } catch {
      return {
        type: "error" as const,
        value:
          "This equation is still being written. Check command spelling and matching braces.",
      };
    }
  });
}
