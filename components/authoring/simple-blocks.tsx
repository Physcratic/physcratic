"use client";
import { useState } from "react";
import type { EditorBlock } from "@/lib/problem-authoring-editor";
import { BlocksEditor } from "./editor-fields";
import { extraBlocks, withExtraBlocks } from "./simple-model";

const field = "min-h-11 w-full rounded-md border-2 border-input bg-background px-3 text-base";

/**
 * The blocks of a question or a worked solution that Simple's own fields do not show: more text, equations and pictures, in the
 * order they are saved. It is closed until opened, and it never touches the blocks Simple's fields own, so opening a problem
 * and saving it leaves every block as it was. `picture` is true for a question, whose first picture has its own box.
 */
export function ExtraBlocksGroup({ summary, label, blocks, onChange, scope, picture }: {
  summary: string;
  label: string;
  blocks: EditorBlock[];
  onChange: (blocks: EditorBlock[]) => void;
  scope: "statement" | "solution";
  picture: boolean;
}) {
  const extras = extraBlocks(blocks, picture);
  return (
    <details className="rounded-lg border-2 p-4">
      <summary className="flex min-h-11 cursor-pointer items-center text-base font-medium">{summary}{extras.length ? ` (${extras.length})` : ""}</summary>
      <div className="mt-4">
        <BlocksEditor label={label} scope={scope} blocks={extras} onChange={(shown) => onChange(withExtraBlocks(blocks, shown, picture))} />
      </div>
    </details>
  );
}

/** The caption of a picture. It stays closed until the author wants one, and open when there is one. */
export function CaptionField({ id, caption, onChange }: { id: string; caption: string; onChange: (caption: string) => void }) {
  const [open, setOpen] = useState(caption.length > 0);
  return (
    <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)} className="space-y-2">
      <summary className="flex min-h-11 cursor-pointer items-center text-base font-medium">Caption</summary>
      <label htmlFor={id} className="sr-only">Caption (optional)</label>
      <input id={id} className={field} maxLength={2000} value={caption} onChange={(e) => onChange(e.target.value)} />
    </details>
  );
}
