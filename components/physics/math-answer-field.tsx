"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { MathfieldElement } from "mathlive";
import { Input } from "@/components/ui/input";
import { AnswerReadError, SymbolTable, normaliseName, readExpression } from "@/lib/answer-reader";
import { cleanLatex, paletteItems, plainInsertion, type PaletteItem } from "./answer-palette";
import { LatexAnswerPreview } from "./latex-answer-preview";

/**
 * One expression answer. MathLive is loaded only when the field mounts, never with the page. Until it is ready, or if it
 * fails to load, a plain text box takes the same answer: LaTeX or plain typing, both read by the same reader.
 * The palette under the field inserts at the cursor in either.
 */
export function MathAnswerField({
  id,
  labelId,
  value,
  onChange,
  symbols,
  extraItems,
  disabled,
  invalid,
  describedBy,
  placeholder = "Type your answer, such as \\frac{h}{mc}",
  maxLength = 1024,
}: {
  id: string;
  /** The id of the visible label. */
  labelId: string;
  value: string;
  onChange: (latex: string) => void;
  /** The problem's own symbols, in the order the problem lists them. */
  symbols: readonly string[];
  /** Extra palette buttons for this field only. */
  extraItems?: PaletteItem[];
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const field = useRef<MathfieldElement | null>(null);
  const plain = useRef<HTMLInputElement>(null);
  const change = useRef(onChange);
  /** The last value this field reported, so only a change from outside is written back into MathLive. */
  const reported = useRef("");
  const [ready, setReady] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  // The full palette opens under the field being typed in. The other fields keep only the problem's own symbols.
  const [active, setActive] = useState(false);
  const hintId = useId();
  change.current = onChange;
  const latest = useRef(value);
  latest.current = value;

  // Load MathLive only when this field is on screen, and only if the box is still empty (never swap a typed answer).
  useEffect(() => {
    let cancelled = false;
    const start = value.trim() === "";
    if (!start || !host.current) return;
    import("mathlive")
      .then(({ MathfieldElement: Element }) => {
        // Slow to load: if the reader has started typing in the plain box, leave it alone.
        if (cancelled || !host.current || latest.current.trim() !== "" || document.activeElement === plain.current) return;
        Element.fontsDirectory = null;
        Element.soundsDirectory = null;
        const element = new Element();
        element.id = id;
        element.setAttribute("aria-labelledby", labelId);
        element.mathVirtualKeyboardPolicy = "manual";
        element.className =
          "block w-full min-h-11 rounded-md border border-input bg-background px-3 py-1 text-lg text-foreground shadow-none focus-within:outline-none focus-within:ring-2 focus-within:ring-ring aria-[invalid=true]:border-destructive [&::part(virtual-keyboard-toggle)]:hidden [&::part(menu-toggle)]:hidden";
        element.addEventListener("input", () => {
          reported.current = cleanLatex(element.value);
          change.current(reported.current);
        });
        element.addEventListener(
          "keydown",
          (event) => {
            if (event.key !== "Enter" || event.isComposing) return;
            event.preventDefault();
            event.stopPropagation();
            element.closest("form")?.requestSubmit();
          },
          true,
        );
        host.current.appendChild(element);
        field.current = element;
        setReady(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // Runs once per mount: the field decides between MathLive and the plain box at the start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep MathLive in step with the page: disabled, invalid, described, and a value changed from outside (Clear answers).
  useEffect(() => {
    const element = field.current;
    if (!element || !ready) return;
    element.disabled = !!disabled;
    if (invalid) element.setAttribute("aria-invalid", "true");
    else element.removeAttribute("aria-invalid");
    const describedIds = [describedBy, hintId].filter(Boolean).join(" ");
    element.setAttribute("aria-describedby", describedIds);
    if (value !== reported.current && cleanLatex(element.value) !== value) {
      reported.current = value;
      element.value = value;
    }
  }, [ready, disabled, invalid, describedBy, hintId, value]);

  const insert = useCallback((item: PaletteItem) => {
    const element = field.current;
    if (element) {
      element.insert(item.insert, { focus: true, feedback: false, selectionMode: "placeholder" });
      return;
    }
    const input = plain.current;
    if (!input) return;
    const { text, caret } = plainInsertion(item.insert);
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const next = `${input.value.slice(0, start)}${text}${input.value.slice(end)}`.slice(0, maxLength);
    change.current(next);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + caret, start + caret);
    });
  }, [maxLength]);

  const all = useMemo(() => [...paletteItems(symbols), ...(extraItems ?? [])], [symbols, extraItems]);
  const items = useMemo(() => (active ? all : all.filter((item) => item.group === "symbol")), [active, all]);
  const hint = useSymbolHint(value, symbols);

  return (
    <div
      ref={wrapper}
      data-field={id}
      className="flex min-w-0 flex-col gap-2"
      onFocusCapture={() => setActive(true)}
      onBlurCapture={() => requestAnimationFrame(() => { if (!wrapper.current?.contains(document.activeElement)) setActive(false); })}
    >
      <div ref={host} hidden={!ready} className="min-w-0" />
      {!ready && (
        <>
          <Input
            ref={plain}
            id={id}
            className="h-11 font-mono"
            value={value}
            maxLength={maxLength}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={disabled}
            placeholder={placeholder}
            aria-invalid={invalid}
            aria-describedby={[describedBy, hintId].filter(Boolean).join(" ") || undefined}
            onChange={(event) => onChange(event.target.value)}
          />
          <LatexAnswerPreview value={value} />
        </>
      )}
      {items.length > 0 && <Palette items={items} onInsert={insert} disabled={disabled} />}
      <p id={hintId} role="status" aria-live="polite" className="min-h-0 text-sm text-muted-foreground empty:hidden">
        {hint}
      </p>
    </div>
  );
}

/** A symbol the problem does not use, named with the nearest one, a moment after typing stops. Same words as the checker. */
function useSymbolHint(value: string, symbols: readonly string[]): string {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), 700);
    return () => clearTimeout(timer);
  }, [value]);
  return useMemo(() => {
    if (!symbols.length || !settled.trim() || settled !== value) return "";
    try {
      readExpression(settled, new SymbolTable(symbols.map(normaliseName)));
      return "";
    } catch (error) {
      return error instanceof AnswerReadError && error.kind === "symbol" ? error.message : "";
    }
  }, [settled, value, symbols]);
}

function Palette({ items, onInsert, disabled }: { items: PaletteItem[]; onInsert: (item: PaletteItem) => void; disabled?: boolean }) {
  const row = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  useEffect(() => {
    const element = row.current;
    if (!element) return;
    const measure = () => setOverflowing(element.scrollWidth > element.clientWidth + 1 && window.matchMedia("(max-width: 639px)").matches);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [items]);
  return (
    <div
      ref={row}
      role="group"
      aria-label="Insert symbols and functions"
      className={`flex min-w-0 gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible ${overflowing ? "[mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)]" : ""}`}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          disabled={disabled}
          aria-label={item.name}
          data-palette={item.group}
          // Pressing a button must not take the cursor out of the field.
          onPointerDown={(event) => event.preventDefault()}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onInsert(item)}
          className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md border border-input px-3 text-base font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${item.group === "symbol" ? "bg-accent/60" : "bg-background"}`}
        >
          <span aria-hidden="true">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
