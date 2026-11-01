import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { renderMath } from "@/lib/learn/math";
import type { Block, Source } from "@/lib/learn/types";
import { cn } from "@/lib/utils";

export function headingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Superscript [n] links to the numbered Sources list. */
function Cite({ ids, sources }: { ids?: string[]; sources: Source[] }) {
  if (!ids?.length) return null;
  const numbers = ids.map((id) => sources.findIndex((s) => s.id === id) + 1);
  return (
    <sup className="ml-0.5 whitespace-nowrap text-xs">
      {numbers.map((n, i) => (
        <span key={n}>
          {i > 0 ? "," : null}
          <a
            href={`#source-${n}`}
            aria-label={`Source ${n}`}
            className="rounded px-1 py-0.5 font-medium text-foreground underline underline-offset-2 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            [{n}]
          </a>
        </span>
      ))}
    </sup>
  );
}

const prose = "max-w-prose";

export function ArticleBody({
  blocks,
  sources,
}: {
  blocks: Block[];
  sources: Source[];
}) {
  return (
    <div className="space-y-5 text-base leading-7">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "heading": {
            const id = headingId(block.text);
            return block.level === 2 ? (
              <h2
                key={index}
                id={id}
                className="scroll-mt-6 pt-6 text-2xl font-semibold leading-tight tracking-tight"
              >
                {block.text}
              </h2>
            ) : (
              <h3
                key={index}
                id={id}
                className="scroll-mt-6 pt-2 text-lg font-semibold leading-snug"
              >
                {block.text}
              </h3>
            );
          }
          case "paragraph":
            return (
              <p key={index} className={prose}>
                {block.text}
                <Cite ids={block.cite} sources={sources} />
              </p>
            );
          case "list": {
            const List = block.ordered ? "ol" : "ul";
            return (
              <div key={index} className={prose}>
                <List
                  className={cn(
                    "space-y-2 pl-6",
                    block.ordered ? "list-decimal" : "list-disc",
                  )}
                >
                  {block.items.map((item) => (
                    <li key={item} className="pl-1">
                      {item}
                    </li>
                  ))}
                </List>
                {block.cite ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Source:
                    <Cite ids={block.cite} sources={sources} />
                  </p>
                ) : null}
              </div>
            );
          }
          case "callout":
            return (
              <aside
                key={index}
                aria-label={block.title ?? "Note"}
                className={cn(
                  "max-w-prose rounded-r-lg border-l-4 bg-muted/50 px-4 py-3",
                  block.tone === "warning" ? "border-destructive" : "border-primary",
                )}
              >
                {block.title ? (
                  <p className="font-semibold">{block.title}</p>
                ) : null}
                <p>
                  {block.text}
                  <Cite ids={block.cite} sources={sources} />
                </p>
              </aside>
            );
          case "problemLink":
            return (
              <Link
                key={index}
                href={`/dashboard/problems/${block.problemId}`}
                className="group flex max-w-prose items-start gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ArrowRight
                  aria-hidden="true"
                  className="mt-1 size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5"
                />
                <span>
                  <span className="font-medium">{block.label}</span>
                  {block.note ? (
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {block.note}
                    </span>
                  ) : null}
                </span>
              </Link>
            );
          case "math":
            return (
              <figure key={index} className={prose}>
                <div
                  className="overflow-x-auto py-1"
                  dangerouslySetInnerHTML={{ __html: renderMath(block.tex) }}
                />
                {block.caption ? (
                  <figcaption className="text-center text-sm text-muted-foreground">
                    {block.caption}
                  </figcaption>
                ) : null}
              </figure>
            );
          case "table":
            return (
              <div
                key={index}
                role="region"
                aria-label={block.caption}
                tabIndex={0}
                className="overflow-x-auto rounded-lg border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Table className="min-w-[44rem] table-fixed text-sm">
                  <TableCaption className="mb-3 mt-0 caption-top px-3 pt-3 text-left">
                    {block.caption}
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      {block.head.map((h, i) => (
                        <TableHead key={i} scope="col" className={i === 0 ? "sticky left-0 z-10 w-32 bg-background" : undefined}>
                          {h || <span className="sr-only">Topic</span>}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {block.rows.map((row) => (
                      <TableRow key={row.header}>
                        <TableHead scope="row" className="sticky left-0 z-10 h-auto bg-background py-4 align-top text-foreground">
                          {row.header}
                        </TableHead>
                        {row.cells.map((cell, i) => (
                          <TableCell key={i} className="align-top whitespace-normal">
                            {cell.text}
                            <Cite ids={cell.cite} sources={sources} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            );
        }
      })}
    </div>
  );
}
