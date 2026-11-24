"use client";
import { useState } from "react";
import { moveItem, type EditorBlock } from "@/lib/problem-authoring-editor";
import { BlocksEditor } from "./editor-fields";
import { extraBlocks, tryExtraEdit, applyExtraEdit } from "./simple-model";

const field = "min-h-11 w-full rounded-md border-2 border-input bg-background px-3 text-base";

/** How many blocks Simple's own fields do not show, for the short count in a More options summary. */
export const moreBlocksText = (count: number) => (count > 0 ? ` (${count} more block${count === 1 ? "" : "s"})` : "");

/**
 * The blocks of a question or a worked solution that Simple's own fields do not show: more text, equations and pictures, in the
 * order they are saved. It is closed until opened. An edit is applied to the latest blocks, and one that would change which block
 * Simple's own text field or picture box edits is refused, with its move step disabled, so opening a problem and saving it leaves
 * every block as it was. `picture` is true for a question, whose first picture has its own box. `hidePictures` is for the files view,
 * where another editor owns every picture, so the group lists only text and equations and leaves each picture where it is.
 */
export function ExtraBlocksGroup({ summary, label, blocks, update, scope, picture, hidePictures = false, uploadsDisabled = false }: {
  summary: string;
  label: string;
  /** The blocks as drawn. Edits are applied to the latest blocks through `update`, not to these. */
  blocks: EditorBlock[];
  update: (change: (latest: EditorBlock[]) => EditorBlock[]) => void;
  scope: "statement" | "solution";
  picture: boolean;
  hidePictures?: boolean;
  uploadsDisabled?: boolean;
}) {
  const shown = extraBlocks(blocks, picture).filter((b) => !(hidePictures && b.kind === "image"));
  return (
    <details className="rounded-lg border-2 p-4">
      <summary className="flex min-h-11 cursor-pointer items-center text-base font-medium">{summary}{shown.length ? ` (${shown.length})` : ""}</summary>
      <div className="mt-4">
        <BlocksEditor
          label={label}
          scope={scope}
          blocks={shown}
          noImages={hidePictures}
          uploadDisabled={uploadsDisabled}
          canMove={(index, delta) => tryExtraEdit(blocks, shown, moveItem(shown, index, delta), picture, hidePictures) !== null}
          onChange={(next) => update((latest) => applyExtraEdit(latest, shown, next, picture, hidePictures))}
        />
      </div>
    </details>
  );
}

/** The caption of a picture. It stays closed until the author wants one, and open when there is one. The input is named "Caption" and says which picture when there are several. */
export function CaptionField({ id, caption, onChange, name = "Caption" }: { id: string; caption: string; onChange: (caption: string) => void; name?: string }) {
  const [open, setOpen] = useState(caption.length > 0);
  return (
    <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)} className="space-y-2">
      <summary className="flex min-h-11 cursor-pointer items-center text-base font-medium">Caption</summary>
      <input id={id} aria-label={name} className={field} maxLength={2000} value={caption} onChange={(e) => onChange(e.target.value)} />
    </details>
  );
}
