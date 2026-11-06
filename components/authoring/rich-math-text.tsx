"use client";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import katex from "katex";
import { Sigma } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MathAnswerField } from "@/components/physics/math-answer-field";
import { cleanLatex } from "@/components/physics/answer-palette";
import { primeKeyboard } from "@/components/physics/mathfield-touch";

/** The same text and maths spans a text block saves. Nothing new is stored. */
export type Span = { kind: "text"; text: string } | { kind: "math"; latex: string };

/** Splits plain text on $...$ into text and maths spans. Used for pasted text. */
export function textToSpans(text: string): Span[] {
  const spans: Span[] = [];
  let last = 0;
  for (const match of text.matchAll(/\$([^$]+)\$/g)) {
    if (match.index > last) spans.push({ kind: "text", text: text.slice(last, match.index) });
    spans.push({ kind: "math", latex: match[1] });
    last = match.index + match[0].length;
  }
  if (last < text.length) spans.push({ kind: "text", text: text.slice(last) });
  return spans;
}

const chipClass =
  "mx-0.5 inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border border-input bg-muted/60 px-2 align-middle hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring data-[open=true]:ring-2 data-[open=true]:ring-ring";

function renderLatex(latex: string): string {
  if (!latex.trim()) return '<span class="text-sm text-muted-foreground">equation</span>';
  try {
    return katex.renderToString(latex, { displayMode: false, throwOnError: false, trust: false, maxExpand: 1000, maxSize: 20, output: "html" });
  } catch {
    return `<code class="text-sm">${latex.replace(/[<>&]/g, "")}</code>`;
  }
}
function makeChip(latex: string, id: string): HTMLElement {
  const chip = document.createElement("span");
  chip.dataset.mathId = id;
  chip.contentEditable = "false";
  chip.tabIndex = 0;
  chip.setAttribute("role", "button");
  chip.className = chipClass;
  fillChip(chip, latex);
  return chip;
}
function fillChip(chip: HTMLElement, latex: string) {
  chip.dataset.latex = latex;
  chip.setAttribute("aria-label", latex.trim() ? `Equation ${latex}. Press Enter to edit.` : "Empty equation. Press Enter to edit.");
  chip.innerHTML = `<span aria-hidden="true">${renderLatex(latex)}</span>`;
}

/** Puts the spans into the box. The box always ends with one line break, which the browser needs to show the last line. */
function renderSpans(box: HTMLElement, spans: readonly Span[]) {
  box.replaceChildren();
  for (const span of spans) {
    if (span.kind === "math") {
      box.append(makeChip(span.latex, crypto.randomUUID()));
      continue;
    }
    span.text.split("\n").forEach((line, i) => {
      if (i > 0) box.append(document.createElement("br"));
      if (line) box.append(document.createTextNode(line));
    });
  }
  box.append(document.createElement("br"));
}

/** Reads the box back into spans. An empty equation is left out, and so is the final line break. */
export function boxToSpans(box: HTMLElement): Span[] {
  const out: Span[] = [];
  let text = "";
  const flush = () => {
    if (text) out.push({ kind: "text", text });
    text = "";
  };
  const walk = (parent: Node) => {
    const children = Array.from(parent.childNodes);
    children.forEach((node, i) => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += (node.nodeValue ?? "").replace(/ /g, " ").replace(/​/g, "");
      } else if (node instanceof HTMLBRElement) {
        if (!(parent === box && i === children.length - 1)) text += "\n";
      } else if (node instanceof HTMLElement) {
        if (node.dataset.mathId !== undefined) {
          const latex = node.dataset.latex ?? "";
          if (latex.trim()) {
            flush();
            out.push({ kind: "math", latex });
          }
        } else {
          if ((node.tagName === "DIV" || node.tagName === "P") && (text || out.length)) text += "\n";
          walk(node);
        }
      }
    });
  };
  walk(box);
  flush();
  return out;
}

/**
 * A text box where equations work like in a word processor. Press $ or Alt+=, or use the Equation button, and an
 * equation drops in at the cursor. It shows as rendered maths inside the text, and clicking it edits it.
 * It reads and writes the existing text and maths spans, so Advanced shows the same content.
 */
export function RichMathText({
  id,
  labelId,
  spans,
  onChange,
  placeholder,
  disabled,
  invalid,
  describedBy,
  symbols = [],
  onPasteFile,
  minRows = 4,
  buttonTour,
}: {
  id: string;
  labelId: string;
  spans: readonly Span[];
  onChange: (spans: Span[]) => void;
  placeholder: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  /** Symbols to offer in the equation palette. */
  symbols?: readonly string[];
  /** Called with a picture dropped or pasted into the box. */
  onPasteFile?: (file: File) => void;
  minRows?: number;
  /** A data-tour name for the Equation button. */
  buttonTour?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const saved = useRef<Range | null>(null);
  const emitted = useRef<string>("");
  const change = useRef(onChange);
  change.current = onChange;
  const [editing, setEditing] = useState<{ chip: string; latex: string } | null>(null);
  const editLabel = useId();
  const panel = useRef<HTMLDivElement>(null);
  const isEmpty = spans.length === 0 || spans.every((s) => s.kind === "text" && !s.text);

  // Draw the spans when they change from outside (opening a draft, switching mode, restoring work).
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const key = JSON.stringify(spans);
    if (key === emitted.current) return;
    renderSpans(el, spans);
    emitted.current = key;
  }, [spans]);

  const emit = useCallback(() => {
    const el = box.current;
    if (!el) return;
    const next = boxToSpans(el);
    emitted.current = JSON.stringify(next);
    change.current(next);
  }, []);

  // Remember the cursor, so the Equation button can drop the equation where it was.
  useEffect(() => {
    const onSelection = () => {
      const selection = document.getSelection();
      const el = box.current;
      if (!el || !selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      if (el.contains(range.commonAncestorContainer) && range.commonAncestorContainer !== el.parentNode) saved.current = range.cloneRange();
    };
    document.addEventListener("selectionchange", onSelection);
    return () => document.removeEventListener("selectionchange", onSelection);
  }, []);

  /** Inserts nodes at the saved cursor, or at the end. Leaves the cursor after them. */
  function insertAtCursor(nodes: Node[]) {
    const el = box.current;
    if (!el) return;
    // The cursor as it is now. The saved one trails behind by a task, so a `$` pressed straight after typing would put the
    // equation before the last letters. The saved one is for when the cursor is not in the box (a button, another field).
    const selection0 = document.getSelection();
    const live = selection0 && selection0.rangeCount > 0 ? selection0.getRangeAt(0) : null;
    let range = live && el.contains(live.commonAncestorContainer) && live.commonAncestorContainer !== el.parentNode ? live.cloneRange() : saved.current;
    if (!range || !el.contains(range.commonAncestorContainer)) {
      range = document.createRange();
      const last = el.lastChild;
      if (last) range.setStartBefore(last);
      else range.selectNodeContents(el);
      range.collapse(true);
    }
    range.deleteContents();
    const fragment = document.createDocumentFragment();
    nodes.forEach((n) => fragment.append(n));
    const tail = nodes.at(-1);
    range.insertNode(fragment);
    if (tail) range.setStartAfter(tail);
    range.collapse(true);
    if (!el.lastChild || !(el.lastChild instanceof HTMLBRElement)) el.append(document.createElement("br"));
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    saved.current = range.cloneRange();
  }

  function openChip(chip: HTMLElement) {
    // Phones open their keyboard only for focus that happens during the tap, and the maths field loads a moment later.
    primeKeyboard();
    box.current?.querySelectorAll("[data-open]").forEach((c) => c.removeAttribute("data-open"));
    chip.dataset.open = "true";
    setEditing({ chip: chip.dataset.mathId!, latex: chip.dataset.latex ?? "" });
  }
  function insertEquation() {
    const el = box.current;
    if (!el || disabled) return;
    primeKeyboard();
    const chip = makeChip("", crypto.randomUUID());
    insertAtCursor([chip]);
    emit();
    openChip(chip);
  }
  function currentChip(): HTMLElement | null {
    return editing ? (box.current?.querySelector(`[data-math-id="${editing.chip}"]`) as HTMLElement | null) : null;
  }
  function editLatex(latex: string) {
    const chip = currentChip();
    if (!chip) return;
    fillChip(chip, latex);
    chip.dataset.open = "true";
    setEditing((e) => (e ? { ...e, latex } : e));
    emit();
  }
  function closeEditor(remove: boolean) {
    const chip = currentChip();
    const el = box.current;
    // MathLive reports a key a moment after it is typed. Take what the field holds now, not the last report.
    const live = panel.current?.querySelector("math-field") as (HTMLElement & { value?: string }) | null | undefined;
    if (chip && live?.value !== undefined) fillChip(chip, cleanLatex(live.value));
    setEditing(null);
    if (!chip || !el) return;
    chip.removeAttribute("data-open");
    const range = document.createRange();
    if (remove || !chip.dataset.latex?.trim()) {
      range.setStartBefore(chip);
      chip.remove();
    } else range.setStartAfter(chip);
    range.collapse(true);
    saved.current = range.cloneRange();
    emit();
    el.focus();
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  function insertText(text: string) {
    const nodes: Node[] = [];
    for (const span of textToSpans(text.replace(/\r\n?/g, "\n"))) {
      if (span.kind === "math") nodes.push(makeChip(span.latex, crypto.randomUUID()));
      else
        span.text.split("\n").forEach((line, i) => {
          if (i > 0) nodes.push(document.createElement("br"));
          if (line) nodes.push(document.createTextNode(line));
        });
    }
    if (nodes.length) {
      insertAtCursor(nodes);
      emit();
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative grid">
        <div
          ref={box}
          id={id}
          role="textbox"
          aria-multiline="true"
          aria-labelledby={labelId}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          aria-disabled={disabled || undefined}
          contentEditable={!disabled}
          suppressContentEditableWarning
          spellCheck
          tabIndex={0}
          style={{ minHeight: `${minRows * 1.75 + 1.5}rem` }}
          className="w-full min-w-0 whitespace-pre-wrap break-words [grid-area:1/1] rounded-lg border-2 border-input bg-background px-4 py-3 text-base leading-7 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive"
          onInput={emit}
          onBlur={emit}
          // Start loading the maths field now, so tapping an equation can open it and the keyboard at once.
          onFocus={() => void import("mathlive")}
          onBeforeInput={(e) => {
            if ((e.nativeEvent as InputEvent).inputType?.startsWith("format")) e.preventDefault();
          }}
          onKeyDown={(e) => {
            if (e.key === "$" || (e.altKey && e.code === "Equal")) {
              e.preventDefault();
              insertEquation();
            } else if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
              e.preventDefault();
              const br = document.createElement("br");
              insertAtCursor([br]);
              emit();
            } else if (e.key === "Escape" && editing) {
              e.preventDefault();
              closeEditor(false);
            } else if ((e.key === "Enter" || e.key === " ") && e.target instanceof HTMLElement && e.target.dataset.mathId !== undefined) {
              e.preventDefault();
              openChip(e.target);
            }
          }}
          onClick={(e) => {
            const chip = (e.target as HTMLElement).closest<HTMLElement>("[data-math-id]");
            if (chip && !disabled) openChip(chip);
          }}
          onPaste={(e) => {
            const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/"));
            e.preventDefault();
            if (file) onPasteFile?.(file);
            else insertText(e.clipboardData.getData("text/plain"));
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/"));
            if (file) onPasteFile?.(file);
          }}
        />
        {isEmpty && !editing && (
          <>
            {/* The same words, invisible and in the page flow, so a placeholder that wraps on a phone makes the box taller instead of running out of it. */}
            <span aria-hidden="true" className="invisible pointer-events-none whitespace-pre-wrap break-words border-2 border-transparent px-4 py-3 text-base leading-7 [grid-area:1/1]">
              {placeholder}
            </span>
            <span aria-hidden="true" data-placeholder="" className="pointer-events-none absolute inset-x-4 top-3 text-base leading-7 text-muted-foreground">
              {placeholder}
            </span>
          </>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 border-2"
        disabled={disabled}
        aria-keyshortcuts="Alt+="
        data-tour={buttonTour}
        onPointerDown={(e) => e.preventDefault()}
        onMouseDown={(e) => e.preventDefault()}
        onClick={insertEquation}
      >
        <Sigma aria-hidden="true" className="mr-2 size-4" />
        Equation
      </Button>
      {editing && (
        <div
          ref={panel}
          role="group"
          aria-labelledby={editLabel}
          className="space-y-3 rounded-lg border-2 border-ring bg-card p-4"
          onKeyDownCapture={(e) => {
            // MathLive keeps the keys it uses, so Escape is caught on the way in.
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              closeEditor(false);
            }
          }}
        >
          <p id={editLabel} className="text-base font-semibold">
            Type your equation
          </p>
          <MathAnswerField
            id={`${id}-equation`}
            labelId={editLabel}
            value={editing.latex}
            onChange={editLatex}
            symbols={symbols}
            maxLength={2000}
            autoFocus
            loadWithValue
            checkSymbols={false}
            padMode="full"
            placeholder="Type it like you would write it, such as \frac{1}{2}mv^2"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="min-h-11" onClick={() => closeEditor(false)}>
              Done
            </Button>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => closeEditor(true)}>
              Remove equation
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
