import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { findCopyProblems, type CopyProblem } from "./copy-rules";

export interface CopyFinding extends CopyProblem {
  file: string;
  line: number;
  text: string;
}

/** Source files under `dir` (relative to `root`), skipping tests and generated data. */
export function sourceFiles(root: string, dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(join(root, dir)).sort()) {
    const path = join(dir, name);
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
        for (const problem of findCopyProblems(text)) {
          findings.push({ ...problem, file: relative(root, join(root, file)), line, text: text.trim().slice(0, 80) });
        }
      }
    }
  }
  return findings;
}
