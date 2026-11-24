import { Fragment, useId } from "react";
import { parseArenaDocument, type ArenaBlock } from "@/lib/arena-document";
import katex from "katex";
import { MathFormula } from "./math-formula";
import { ProblemImage } from "./problem-image";
import { cn } from "@/lib/utils";
import { bareLabel } from "@/lib/part-colors";
import { PartChip } from "./solve-ui";

export function MathText({ text }: { text: string }) {
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

function ArenaParagraph({ text, staticFigures }: { text: string; staticFigures?: boolean }) {
  const figure =
    /^!\[([^\]]+)\]\((\/corpus\/arena\/figures\/[a-z-]+\.(?:png|svg))\)$/.exec(text);
  if (figure)
    return (
      <figure className="flex justify-center">
        {staticFigures ? (
          // Plain <img> so the figure and its alt text are in the server HTML and show with no JavaScript.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={figure[2]} alt={figure[1]} loading="lazy" decoding="async" className="h-auto max-h-96 max-w-full rounded-md" />
        ) : (
          <ProblemImage
            src={figure[2]}
            alt={figure[1]}
            className="h-auto max-h-96 max-w-full rounded-md"
          />
        )}
      </figure>
    );
  if (/^\$\$[^$]*\$\$$/.test(text)) return <MathFormula formula={text} />;
  return (
    <p className="text-pretty">
      <MathText text={text} />
    </p>
  );
}

function ArenaBlocks({ blocks, staticFigures }: { blocks: ArenaBlock[]; staticFigures?: boolean }) {
  return blocks.map((block, index) =>
    block.type === "paragraph" ? (
      <ArenaParagraph key={index} text={block.text} staticFigures={staticFigures} />
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
              <ArenaParagraph key={paragraphIndex} text={text} staticFigures={staticFigures} />
            ))}
          </li>
        ))}
      </ol>
    ),
  );
}

const partHeading = /^(\([a-z]\))\s*([\s\S]*)$/;

export function ArenaDocument({ content, staticFigures = false }: { content: string; staticFigures?: boolean }) {
  const id = useId();
  const sections = parseArenaDocument(content);
  // Lettered part headings such as "(a)" get a neutral chip that keeps the letter. The statement and the worked solution use the same rule.
  return (
    <article
      lang="en"
      className="arena-document flex min-w-0 flex-col gap-5 text-base leading-relaxed [&_p]:max-w-[70ch]"
    >
      {sections.map((section, index) => {
        if (!section.heading) {
          return (
            <Fragment key={index}>
              <ArenaBlocks blocks={section.blocks} staticFigures={staticFigures} />
            </Fragment>
          );
        }
        const part = partHeading.exec(section.heading);
        return (
          <section
            key={index}
            aria-labelledby={`${id}-${index}`}
            className="flex min-w-0 flex-col gap-5 rounded-xl border border-border bg-muted/40 p-4 text-foreground sm:p-6"
          >
            <h3
              id={`${id}-${index}`}
              className="flex flex-wrap items-center gap-2 text-pretty text-lg font-medium"
            >
              {part ? (
                <>
                  <PartChip><span aria-hidden="true">{bareLabel(part[1])}</span><span className="sr-only">Part {bareLabel(part[1])}</span></PartChip>
                  {part[2] && <MathText text={part[2]} />}
                </>
              ) : (
                <MathText text={section.heading} />
              )}
            </h3>
            <div className={cn("flex min-w-0 flex-col gap-5", /^\d+[.)]\s/.test(section.heading) && "pl-4 sm:pl-6")}>
              <ArenaBlocks blocks={section.blocks} staticFigures={staticFigures} />
            </div>
          </section>
        );
      })}
    </article>
  );
}
