import { Fragment, useId } from "react";
import { parseArenaDocument, type ArenaBlock } from "@/lib/arena-document";
import katex from "katex";
import { MathFormula } from "./math-formula";
import { ProblemImage } from "./problem-image";
import { cn } from "@/lib/utils";

function MathText({ text }: { text: string }) {
  return text.split(/(\$\$[\s\S]*?\$\$)/g).map((part, index) => {
    if (!part.startsWith("$$")) return <Fragment key={index}>{part}</Fragment>;
    const html = katex.renderToString(part.slice(2, -2), {
      displayMode: false,
      throwOnError: false,
      trust: false,
      output: "htmlAndMathml",
    });
    return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
  });
}

function ArenaParagraph({ text }: { text: string }) {
  const figure =
    /^!\[([^\]]+)\]\((\/corpus\/arena\/figures\/[a-z-]+\.png)\)$/.exec(text);
  if (figure)
    return (
      <figure className="flex justify-center">
        <ProblemImage
          src={figure[2]}
          alt={figure[1]}
          className="h-auto max-h-96 max-w-full rounded-md"
        />
      </figure>
    );
  if (/^\$\$[^$]*\$\$$/.test(text)) return <MathFormula formula={text} />;
  return (
    <p className="text-pretty">
      <MathText text={text} />
    </p>
  );
}

function ArenaBlocks({ blocks }: { blocks: ArenaBlock[] }) {
  return blocks.map((block, index) =>
    block.type === "paragraph" ? (
      <ArenaParagraph key={index} text={block.text} />
    ) : (
      <ol
        key={index}
        role="list"
        data-numbering={block.kind}
        className={cn("flex min-w-0 list-none flex-col gap-4", block.kind !== "letter" && "pl-4 sm:pl-6")}
      >
        {block.items.map((paragraphs, itemIndex) => (
          <li key={itemIndex} className="flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-card p-4 text-card-foreground">
            {paragraphs.map((text, paragraphIndex) => (
              <ArenaParagraph key={paragraphIndex} text={text} />
            ))}
          </li>
        ))}
      </ol>
    ),
  );
}

export function ArenaDocument({ content }: { content: string }) {
  const id = useId();
  return (
    <article
      lang="en"
      className="arena-document flex min-w-0 flex-col gap-5 text-base leading-relaxed"
    >
      {parseArenaDocument(content).map((section, index) =>
        section.heading ? (
          <section
            key={index}
            aria-labelledby={`${id}-${index}`}
            className="flex min-w-0 flex-col gap-5 rounded-xl border border-border bg-muted/40 p-4 text-foreground sm:p-6"
          >
            <h3
              id={`${id}-${index}`}
              className="text-pretty text-lg font-medium"
            >
              <MathText text={section.heading} />
            </h3>
            <div className={cn("flex min-w-0 flex-col gap-5", /^\d+[.)]\s/.test(section.heading) && "pl-4 sm:pl-6")}>
              <ArenaBlocks blocks={section.blocks} />
            </div>
          </section>
        ) : (
          <Fragment key={index}>
            <ArenaBlocks blocks={section.blocks} />
          </Fragment>
        ),
      )}
    </article>
  );
}
