"use client";
import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setPartAnswerMode, type EditorDraft } from "@/lib/problem-authoring-editor";
import { AnswerPanel } from "./answer-panel";
import { useConfirm } from "./confirm-sheet";

type Part = EditorDraft["content"]["sections"][number]["parts"][number];
type Entry = EditorDraft["privateParts"][number];

/**
 * The private answer key, hints and worked solution for one part, in the closed disclosure under the part's statement.
 * `hasPrivate` is whether the draft already stores a private entry for this part. `si` and `pi` locate the part.
 */
export function PartOptions({
  part, si, pi, entry, hasPrivate, edit, heading, open, onOpenChange, lead, answer,
}: {
  part: Part;
  si: number;
  pi: number;
  entry: Entry;
  hasPrivate: boolean;
  edit: (fn: (value: EditorDraft) => void) => void;
  /** Simple only: a different summary, an open state it controls, content above the panel, and panel options. */
  heading?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  lead?: ReactNode;
  answer?: {
    boxOwns?: boolean;
    solutionElsewhere?: boolean;
    manualLabel?: string;
    placeholder?: string;
    hideManualButton?: boolean;
    onChosen?: (mode: "numeric" | "expression" | "manual") => void;
    /** Changes the answer type. Defaults to the Advanced change. */
    setMode?: (draft: EditorDraft, partId: string, mode: "numeric" | "expression" | "manual") => void;
    /** Extra classes for everything inside the disclosure, such as a larger text size. */
    bodyClass?: string;
  };
}) {
  const confirm = useConfirm();
  return (
    <details className="rounded-lg border bg-card p-4" open={open} onToggle={onOpenChange ? (e) => onOpenChange(e.currentTarget.open) : undefined}>
      {heading ?? <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium">
        <ShieldCheck className="size-4" />
        Answer key, hints and solution for part{" "}
        {part.label || pi + 1}
      </summary>}
      <div className={answer?.bodyClass ? `mt-5 ${answer.bodyClass}` : "mt-5"}>
        {lead}
        <AnswerPanel
          boxOwns={answer?.boxOwns}
          solutionElsewhere={answer?.solutionElsewhere}
          manualLabel={answer?.manualLabel}
          placeholder={answer?.placeholder}
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
          onMode={async (mode) => {
            if (
              !entry.key ||
              entry.key.kind === mode ||
              // Simple shows a placeholder while nothing is configured, so there is nothing to replace.
              answer?.placeholder !== undefined ||
              (await confirm({
                title: "Change answer type?",
                message: "This replaces the current private grading configuration. Hints and solution remain.",
                confirmLabel: "Change answer type",
                danger: true,
              }))
            ) {
              // The sheet answers later than the click, so the draft is checked again when the change is made.
              if (
                !hasPrivate
              )
                edit((d) => {
                  if (!d.privateParts.some((p) => p.partId === part.id)) d.privateParts.push(entry);
                });
              answer?.onChosen?.(mode);
              edit((d) => (answer?.setMode ?? setPartAnswerMode)(d, part.id, mode));
            }
          }}
        />
        {!entry.key && !answer?.hideManualButton && (
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
