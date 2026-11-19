import arena from "./index.json";
import { arenaCardImageSchema, type ArenaCardImage } from "../arena-schema";

const statementFigure = /!\[[^\]]*\]\((\/corpus\/arena\/figures\/[a-z0-9-]+\.(?:png|svg))\)/;

/** The path of the first image in a statement, or null. Only the statement is read, so a solution image is never chosen. */
export function firstStatementFigure(statement: string): string | null {
  return statementFigure.exec(statement)?.[1] ?? null;
}

/** The card image for a problem, built from its first statement figure, its short alt text and the file's size. */
export function buildCardImage(id: string, statement: string, alt: string | undefined, size: { width: number; height: number } | undefined): ArenaCardImage | undefined {
  const src = firstStatementFigure(statement);
  if (!src) {
    if (alt) throw new Error(`${id} has a card alt text but no statement image`);
    return undefined;
  }
  if (!alt) throw new Error(`${id} has a statement image but no entry in lib/arena/card-images.ts`);
  if (!size) throw new Error(`${id} figure ${src} could not be measured`);
  return arenaCardImageSchema.parse({ src, alt, width: size.width, height: size.height });
}

const images = new Map<string, ArenaCardImage>(
  arena.problems.flatMap((problem) => ("image" in problem && problem.image ? [[problem.id, problem.image as ArenaCardImage] as const] : [])),
);

/** The card image of an Arena problem, or undefined for the problems that have no statement figure. */
export function arenaCardImage(id: string): ArenaCardImage | undefined {
  return images.get(id);
}
