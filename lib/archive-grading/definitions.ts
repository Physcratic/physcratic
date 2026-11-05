import "server-only";
import type { ArchiveMetadata } from "../archive-grading-contracts";

type PublicPart = ArchiveMetadata["parts"][number];
export type ArchiveSymbol = { latex: string; assumptions: ("positive" | "nonnegative" | "nonzero")[]; aliases: string[]; min?: number; max?: number };
export type ArchiveKeyPart = Omit<PublicPart, "symbols" | "symbolConditions"> & {
  symbols: ArchiveSymbol[];
  sourceReference?: string;
  domain: string;
  exclusions: string[];
  angleUnit: "radians";
} & (
  | { kind: "numeric"; target: number; absTol: number; relTol: number; canonical: string; alternatives: string[]; wrong: string[] }
  | { kind: "expression"; canonical: string; alternatives: string[]; wrong: string[] }
  | { kind: "special"; canonical: string; alternatives: string[]; wrong: string[]; policy: "positive-infinity" }
  | { kind: "self-review"; reason: string }
);
export type ArchiveDefinition = { problemId: string; keyVersion: number; content: string; parts: ArchiveKeyPart[] };

export function numeric(id: string, label: string, target: number, unit: string, options: { absTol?: number; relTol?: number; canonical?: string; alternatives?: string[]; help?: string; sourcePart?: string } = {}): ArchiveKeyPart {
  return { id, sourcePart: options.sourcePart ?? (id.split(".").slice(0, -1).join(".") || "Answer"), label, kind: "numeric", unit, symbols: [], target,
    absTol: options.absTol ?? 1e-9, relTol: options.relTol ?? 0.01,
    canonical: options.canonical ?? String(target), alternatives: options.alternatives ?? [], wrong: [String(target + Math.max(1, Math.abs(target)) * 2)],
    help: options.help ?? "Enter the result in the displayed unit, without a unit suffix.", domain: "Finite real value in the displayed unit.", exclusions: [], angleUnit: "radians" };
}
export function expression(id: string, label: string, canonical: string, symbols: string, help: string, options: { alternatives?: string[]; positive?: string[]; nonnegative?: string[]; domain?: string; exclusions?: string[]; aliases?: Record<string, string[]>; ranges?: Record<string, [number, number]> } = {}): ArchiveKeyPart {
  return { id, sourcePart: id.split(".").slice(0, -1).join("."), label, kind: "expression", unit: "", canonical, alternatives: options.alternatives ?? [], wrong: [`(${canonical})+1`],
    symbols: symbols.split(/\s+/).filter(Boolean).map((latex) => ({ latex, assumptions: options.positive?.includes(latex) ? ["positive"] : options.nonnegative?.includes(latex) ? ["nonnegative"] : [], aliases: options.aliases?.[latex] ?? [], ...(options.ranges?.[latex] ? { min: options.ranges[latex][0], max: options.ranges[latex][1] } : {}) })),
    help, domain: options.domain ?? help, exclusions: options.exclusions ?? [], angleUnit: "radians" };
}
export function review(id: string, label: string, reason: string): ArchiveKeyPart {
  return { id, sourcePart: id.split(".").slice(0, -1).join("."), label, kind: "self-review", unit: "", symbols: [], help: reason, reason, domain: reason, exclusions: [], angleUnit: "radians" };
}
export function infinity(id: string, label: string, help: string): ArchiveKeyPart {
  return { id, sourcePart: id.split(".").slice(0, -1).join("."), label, kind: "special", unit: "", symbols: [], help, domain: "Equal positive bubble radii; flat interface.", exclusions: [], angleUnit: "radians", policy: "positive-infinity", canonical: String.raw`\infty`, alternatives: [String.raw`+\infty`], wrong: ["0", "1000000"] };
}
