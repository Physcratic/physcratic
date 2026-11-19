"use client";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setPartAnswerMode, type EditorDraft } from "@/lib/problem-authoring-editor";
import { partBorder, partStyle } from "@/components/physics/solve-ui";
import { AnswerPanel } from "./answer-panel";

type Part = EditorDraft["content"]["sections"][number]["parts"][number];
type Entry = EditorDraft["privateParts"][number];

/**
 * The private answer key, hints and worked solution for one part, in the closed disclosure under the part's statement.
 * `hasPrivate` is whether the draft already stores a private entry for this part. `si` and `pi` locate the part.
 */
export function PartOptions({
  part, si, pi, entry, hasPrivate, colour, edit,
}: {
  part: Part;
  si: number;
  pi: number;
  entry: Entry;
  hasPrivate: boolean;
  colour: number;
  edit: (fn: (value: EditorDraft) => void) => void;
}) {
  return (
    <details style={partStyle(colour)} className={`rounded-lg border bg-card p-4 ${partBorder}`}>
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium">
        <ShieldCheck className="size-4" />
        Answer key, hints and solution for part{" "}
        {part.label || pi + 1}
      </summary>
      <div className="mt-5">
        <AnswerPanel
          entry={entry}
          mode={part.answerMode}
          onChange={(value) =>
            edit((d) => {
              d.privateParts = [
                ...d.privateParts.filter(
                  (p) => p.partId !== part.id,
                ),
                value,
              ];
            })
          }
          onMode={(mode) => {
            if (
              !entry.key ||
              entry.key.kind === mode ||
              window.confirm(
                "Change answer type? This replaces the current private grading configuration. Hints and solution remain.",
              )
            ) {
              if (
                !hasPrivate
              )
                edit((d) => {
                  d.privateParts.push(entry);
                });
              edit((d) => setPartAnswerMode(d, part.id, mode));
            }
          }}
        />
        {!entry.key && (
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => {
              edit((d) => {
                d.privateParts = [
                  ...d.privateParts.filter(
                    (p) => p.partId !== part.id,
                  ),
                  { ...entry, key: { kind: "manual" } },
                ];
                d.content.sections[si].parts[
                  pi
                ].answerMode = "manual";
              });
            }}
          >
            Set explicit manual grading
          </Button>
        )}
      </div>
    </details>
  );
}
