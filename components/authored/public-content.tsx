"use client";
import { useState } from "react";
import { MathPreview } from "@/components/authoring/editor-fields";
import { authorMediaPath } from "@/lib/author-media";
import type { AuthoredDocument } from "@/lib/problem-authoring";
function StatementImage({
  problemId,
  revisionId,
  block,
}: {
  problemId: string;
  revisionId: string;
  block: Extract<AuthoredDocument["context"][number], { kind: "image" }>;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className="my-5 space-y-2">
      {failed ? (
        <p
          role="status"
          className="rounded-md border p-4 text-sm text-muted-foreground"
        >
          This statement image is unavailable. Recheck the current publication.
        </p>
      ) : (
        <img
          src={authorMediaPath(problemId, block.mediaId, revisionId)}
          alt={block.alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="mx-auto max-h-[32rem] max-w-full rounded-md object-contain"
          onError={() => setFailed(true)}
        />
      )}{" "}
      {block.caption && (
        <figcaption className="text-center text-sm text-muted-foreground">
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
}
export function StatementBlocks({
  blocks,
  problemId,
  revisionId,
}: {
  blocks: AuthoredDocument["context"];
  problemId: string;
  revisionId: string;
}) {
  return (
    <div className="min-w-0 space-y-5">
      {blocks.map((block) =>
        block.kind === "text" ? (
          <p
            key={block.id}
            className="whitespace-pre-wrap break-words leading-8"
          >
            {block.spans.map((span, i) =>
              span.kind === "text" ? (
                <span key={i}>{span.text}</span>
              ) : (
                <MathPreview
                  key={i}
                  latex={span.latex}
                  inline
                  keyboardScrollable
                />
              ),
            )}
          </p>
        ) : block.kind === "math" ? (
          <MathPreview key={block.id} latex={block.latex} keyboardScrollable />
        ) : (
          <StatementImage
            key={`${revisionId}:${block.mediaId}:${block.id}`}
            block={block}
            problemId={problemId}
            revisionId={revisionId}
          />
        ),
      )}
    </div>
  );
}
