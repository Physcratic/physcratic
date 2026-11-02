import { createElement, Fragment, type ReactNode } from "react";
import katex from "katex";
import type { ImportedNode } from "@/lib/imported-corpus-schema";
import { ProblemImage } from "./problem-image";

const mathPattern =
  /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|(?<!\\)\$(?!\$)[^$]+?(?<!\\)\$)/g;

function renderText(text: string): ReactNode {
  return text.split(mathPattern).map((part, index) => {
    const display = part.startsWith("$$") || part.startsWith("\\[");
    const math =
      display ||
      part.startsWith("\\(") ||
      (part.startsWith("$") && part.endsWith("$"));
    if (!math) return <Fragment key={index}>{part}</Fragment>;
    const expression = part.slice(
      display || part.startsWith("\\(") ? 2 : 1,
      display || part.startsWith("\\(") ? -2 : -1,
    );
    const html = katex.renderToString(expression, {
      displayMode: display,
      throwOnError: false,
      trust: false,
      strict: "ignore",
      maxExpand: 1000,
      output: "htmlAndMathml",
      macros: {
        "\\pd": "\\partial",
        "\\tg": "\\tan",
        "\\ctg": "\\cot",
        "\\arctg": "\\arctan",
        "\\cosec": "\\csc",
        "\\degree": "^\\circ",
        "\\const": "\\mathrm{const}",
      },
    });
    return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
  });
}

function SourceNode({ node }: { node: ImportedNode }) {
  if (node.type === "text") return <>{renderText(node.text)}</>;
  if (node.tag === "img") {
    // Source figures are copied to a validated, local-only asset path during import.
    return (
      <ProblemImage src={node.src!} alt={node.alt ?? "Problem diagram"} />
    );
  }
  if (node.tag === "br" || node.tag === "hr") return createElement(node.tag);
  const children = node.children?.map((child, index) =>
    node.tag === "table" && child.type === "element" && child.tag === "tr" ? (
      <tbody key={index}>
        <SourceNode node={child} />
      </tbody>
    ) : (
      <SourceNode key={index} node={child} />
    ),
  );
  // Mirror HTML has nested block elements inside paragraphs; normalize without dropping content.
  return createElement(
    node.tag === "p" ? "div" : node.tag,
    node.tag === "p" ? { className: "source-paragraph" } : {},
    children,
  );
}

export function ImportedSourceContent({
  nodes,
  language,
}: {
  nodes: ImportedNode[];
  language: "en" | "ru";
}) {
  return (
    <article
      lang={language}
      className="imported-source-content min-w-0 text-base leading-relaxed"
    >
      {nodes.map((node, index) => (
        <SourceNode key={index} node={node} />
      ))}
    </article>
  );
}
