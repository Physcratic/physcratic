import { Fragment } from "react";
import katex from "katex";
import { MathFormula } from "./math-formula";

function MathText({ text }: { text: string }) {
  return text.split(/(\$\$[\s\S]*?\$\$)/g).map((part, index) => {
    if (!part.startsWith("$$")) return <Fragment key={index}>{part}</Fragment>;
    const html = katex.renderToString(part.slice(2, -2), { displayMode: false, throwOnError: false, trust: false, output: "htmlAndMathml" });
    return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
  });
}

export function ArenaDocument({ content }: { content: string }) {
  return <article lang="en" className="arena-document flex min-w-0 flex-col gap-5 text-base leading-relaxed">
    {content.split(/\n\s*\n/).map((paragraph, index) => {
      const figure = /^!\[([^\]]+)\]\((\/corpus\/arena\/figures\/[a-z-]+\.png)\)$/.exec(paragraph);
      if (figure) return <figure key={index} className="flex justify-center"><img src={figure[2]} alt={figure[1]} loading="lazy" decoding="async" className="h-auto max-h-96 max-w-full rounded-md" /></figure>;
      if (paragraph.startsWith("## ")) return <h3 key={index} className="text-pretty pt-3 text-lg font-medium"><MathText text={paragraph.slice(3)} /></h3>;
      if (/^\$\$[^$]*\$\$$/.test(paragraph)) return <MathFormula key={index} formula={paragraph} />;
      return <p key={index} className="text-pretty"><MathText text={paragraph} /></p>;
    })}
  </article>;
}
