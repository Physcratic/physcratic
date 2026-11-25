import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { findBannedWords, findCopyProblems, type CopyProblem } from "./copy-rules";

export interface CopyFinding extends CopyProblem {
  file: string;
  line: number;
  text: string;
}

/** Source files under `dir` (relative to `root`), skipping tests and generated data. */
export function sourceFiles(root: string, dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(join(root, dir)).sort()) {
    const path = join(dir, name).replaceAll("\\", "/");
    const full = join(root, path);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(root, path));
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) && !name.endsWith(".d.ts")) out.push(path);
  }
  return out;
}

/** Every user-facing string in a file: string literals, template text and JSX text. Comments are ignored. */
export function stringsIn(file: string, source: string): { text: string; line: number }[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const found: { text: string; line: number }[] = [];
  const add = (node: ts.Node, text: string) => {
    if (text.trim()) found.push({ text, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1 });
  };
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) add(node, node.text);
    else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) add(node, node.text);
    else if (ts.isJsxText(node)) add(node, node.text);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

/** Copy-rule findings across the given directories. Run from the repo root. */
export function scanCopy(root: string, dirs: string[], skip: (file: string) => boolean = () => false): CopyFinding[] {
  const findings: CopyFinding[] = [];
  for (const dir of dirs) {
    for (const file of sourceFiles(root, dir)) {
      if (skip(file)) continue;
      for (const { text, line } of stringsIn(file, readFileSync(join(root, file), "utf8"))) {
        for (const problem of [...findCopyProblems(text), ...findBannedWords(text)]) {
          findings.push({ ...problem, file: relative(root, join(root, file)).replaceAll("\\", "/"), line, text: text.trim().slice(0, 80) });
        }
      }
    }
  }
  return findings;
}

/** A semicolon that joins two clauses of prose, as opposed to one in CSS, a header or a data URL. */
export const PROSE_SEMICOLON = /;\s+\S/;

/**
 * Files with a known semicolon in prose that another branch owns. The copy test skips them and a second test fails
 * when a file on this list no longer has one, so the list cannot go stale. Remove an entry when it is fixed.
 */
export const KNOWN_SEMICOLON_OFFENDERS: readonly string[] = [
  // "Five upload attempts per UTC day; 20 total claim reservations". Medal verification UI, left for Codex.
  "components/community/verification-settings.tsx",
];

/** Glyphs that stand in for a separator between words. Spacing, a line break, separate styled spans or a comma do the job instead. */
export const SEPARATOR_GLYPHS = /[·•∙⋅‧]|&middot;|&bull;|&centerdot;/;

export interface DesignFinding {
  file: string;
  line: number;
  rule: "separator glyph" | "font-mono outside code and kbd" | "uppercase with tracking";
  text: string;
}

const MONO = /(^|[\s:])font-mono(?=$|[\s!])/;
const UPPERCASE = /(^|[\s:])uppercase(?=$|[\s!])/;
const TRACKING = /(^|[\s:])tracking-(\[[^\]\s]*\]|wide|wider|widest)(?=$|[\s!])/;
const MONO_HOSTS = new Set(["code", "kbd"]);

function tagName(node: ts.Node): string | undefined {
  if (ts.isJsxElement(node)) return node.openingElement.tagName.getText();
  if (ts.isJsxSelfClosingElement(node)) return node.tagName.getText();
  return undefined;
}

/**
 * Design-rule findings in one file: a separator glyph in text, the font-mono class outside code and kbd, and an uppercase
 * label that also sets wide letter spacing. Comments are ignored. `uppercase` and `tracking-*` are matched across all the
 * strings of one className attribute, so cn("uppercase", "tracking-wide") is caught too.
 */
export function designFindingsIn(file: string, source: string): DesignFinding[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: DesignFinding[] = [];
  const lineOf = (node: ts.Node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
  const insideMonoHost = (node: ts.Node) => {
    for (let n: ts.Node | undefined = node; n; n = n.parent) {
      const name = tagName(n);
      if (name && MONO_HOSTS.has(name)) return true;
    }
    return false;
  };
  const groups = new Map<ts.Node, { tokens: string[]; line: number }>();
  const text = (node: ts.Node, value: string) => {
    if (!value.trim()) return;
    if (SEPARATOR_GLYPHS.test(value)) out.push({ file, line: lineOf(node), rule: "separator glyph", text: value.trim().slice(0, 70) });
    if (ts.isJsxText(node)) return;
    if (MONO.test(value) && !insideMonoHost(node)) out.push({ file, line: lineOf(node), rule: "font-mono outside code and kbd", text: value.trim().slice(0, 70) });
    let group: ts.Node = node;
    for (let n: ts.Node | undefined = node.parent; n; n = n.parent) {
      if (ts.isJsxAttribute(n)) { group = n; break; }
      if (ts.isStatement(n)) break;
    }
    const entry = groups.get(group) ?? { tokens: [], line: lineOf(group) };
    entry.tokens.push(value);
    groups.set(group, entry);
  };
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) text(node, node.text);
    else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) text(node, node.text);
    else if (ts.isJsxText(node)) text(node, node.text);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  for (const { tokens, line } of groups.values()) {
    const joined = tokens.join(" ");
    if (UPPERCASE.test(joined) && TRACKING.test(joined)) out.push({ file, line, rule: "uppercase with tracking", text: joined.slice(0, 70) });
  }
  return out.sort((a, b) => a.line - b.line);
}

/** Design-rule findings across the given directories. Run from the repo root. */
export function scanDesign(root: string, dirs: string[]): DesignFinding[] {
  const found: DesignFinding[] = [];
  for (const dir of dirs) for (const file of sourceFiles(root, dir)) found.push(...designFindingsIn(file, readFileSync(join(root, file), "utf8")));
  return found;
}
