import { Fragment, useId } from "react";
import { parseArenaDocument, type ArenaBlock } from "@/lib/arena-document";
import katex from "katex";
import { MathFormula } from "./math-formula";
import { ProblemImage } from "./problem-image";
import { cn } from "@/lib/utils";
import { assignPartColors } from "@/lib/part-colors";
import { PartChip, partBorder, partStyle } from "./solve-ui";

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

const partHeading = /^(\([a-z]\))\s*([\s\S]*)$/;

export function ArenaDocument({ content }: { content: string }) {
  const id = useId();
  const sections = parseArenaDocument(content);
  // Lettered part headings such as "(a)" get a colour by position and a chip that keeps the letter. The statement
  // and the worked solution use the same rule, so a part has the same colour in both.
  const partLabels = sections.flatMap((section) => (section.heading && partHeading.test(section.heading) ? [partHeading.exec(section.heading)![1]] : []));
  const partColours = assignPartColors(partLabels);
  let partIndex = -1;
  return (
    <article
      lang="en"
      className="arena-document flex min-w-0 flex-col gap-5 text-base leading-relaxed [&_p]:max-w-[70ch]"
    >
      {sections.map((section, index) => {
        if (!section.heading) {
          return (
            <Fragment key={index}>
              <ArenaBlocks blocks={section.blocks} />
            </Fragment>
          );
        }
        const part = partHeading.exec(section.heading);
        const colour = part ? partColours[++partIndex] : undefined;
        return (
          <section
            key={index}
            aria-labelledby={`${id}-${index}`}
            style={colour === undefined ? undefined : partStyle(colour)}
            className={cn("flex min-w-0 flex-col gap-5 rounded-xl border border-border bg-muted/40 p-4 text-foreground sm:p-6", colour !== undefined && partBorder)}
          >
            <h3
              id={`${id}-${index}`}
              className="flex flex-wrap items-center gap-2 text-pretty text-lg font-medium"
            >
              {part && colour !== undefined ? (
                <>
                  <PartChip index={colour}>{part[1]}</PartChip>
                  {part[2] && <MathText text={part[2]} />}
                </>
              ) : (
                <MathText text={section.heading} />
              )}
            </h3>
            <div className={cn("flex min-w-0 flex-col gap-5", /^\d+[.)]\s/.test(section.heading) && "pl-4 sm:pl-6")}>
              <ArenaBlocks blocks={section.blocks} />
            </div>
          </section>
        );
      })}
    </article>
  );
}
