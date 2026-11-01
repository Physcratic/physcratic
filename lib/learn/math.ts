import { previewWorking } from "../latex-working";

/**
 * Renders display maths to KaTeX HTML on the server. It reuses
 * previewWorking from lib/latex-working.ts, so the options (trust off,
 * HTML plus MathML output) match the rest of the site.
 */
export function renderMath(tex: string): string {
  const [, piece] = previewWorking(`$$${tex}$$`);
  if (!piece || piece.type !== "math") {
    throw new Error(`Cannot render TeX: ${tex}`);
  }
  return piece.value;
}
