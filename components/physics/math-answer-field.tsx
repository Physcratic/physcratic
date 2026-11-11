"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { MathfieldElement } from "mathlive";
import { Input } from "@/components/ui/input";
import { AnswerReadError, SymbolTable, bareLogMessage, normaliseName, readExpression } from "@/lib/answer-reader";
import { cleanLatex, paletteItems, plainInsertion, type PaletteItem } from "./answer-palette";
import { enableTouchKeyboard, focusSink, isTouchDevice, releasePrimedKeyboard } from "./mathfield-touch";
import { MathPad, useKeyboardDock, type PadMode } from "./math-pad";
import { shortcutsFor } from "./math-typing";
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
  autoFocus,
  emptyHint,
  loadWithValue,
  upgradeOnBlur = false,
  checkSymbols = true,
  padMode = "answer",
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
  /** Null keeps an unfinished draft intact. Submission validation belongs to the caller. */
  maxLength?: number | null;
  /** Move the cursor into the field as soon as it is ready. */
  autoFocus?: boolean;
  /** A short example shown inside the empty maths field. */
  emptyHint?: string;
  /** Open as a maths field even when it starts with a value (editing something already written). */
  loadWithValue?: boolean;
  /** Load restored work too, but wait until focus and composition leave the fallback before replacing it. */
  upgradeOnBlur?: boolean;
  /** Name a symbol the problem does not use. Off for free-form equations, where any symbol is fine. */
  checkSymbols?: boolean;
  /** "answer" hides the buttons the checker cannot read. "full" shows them all (Studio text and solution fields). */
  padMode?: PadMode;
}) {
  const host = useRef<HTMLDivElement>(null);
  const field = useRef<MathfieldElement | null>(null);
  const plain = useRef<HTMLInputElement>(null);
  const change = useRef(onChange);
  /** The last value this field reported, so only a change from outside is written back into MathLive. */
  const reported = useRef("");
  const [ready, setReady] = useState(false);
  const [loadingEditor, setLoadingEditor] = useState(upgradeOnBlur);
  const wrapper = useRef<HTMLDivElement>(null);
  // The full palette opens under the field being typed in. The other fields keep only the problem's own symbols.
  const [active, setActive] = useState(false);
  const hintId = useId();
  change.current = onChange;
  const latest = useRef(value);
  latest.current = value;
  const focusOnReady = useRef(!!autoFocus);
  const declared = useRef(symbols);
  declared.current = symbols;
  const symbolKey = symbols.join("|");
  /** MathLive's own shortcuts, before the problem's symbols took any out. */
  const baseShortcuts = useRef<Record<string, never> | null>(null);

  // Authored drafts can upgrade after blur. Other callers keep their original empty-field-only policy.
  useEffect(() => {
    setLoadingEditor(upgradeOnBlur);
    let cancelled = false;
    let composing = false;
    let frame = 0;
    let Element: typeof MathfieldElement | undefined;
    let mounted: MathfieldElement | undefined;
    const inputArea = wrapper.current;
    const start = upgradeOnBlur || loadWithValue || value.trim() === "";
    if (!start || !host.current) return;
    const mount = () => {
      try {
        if (cancelled || !Element || !host.current || mounted) return;
        if (upgradeOnBlur) {
          // Never replace an active editor, including a palette click or an IME commit.
          if (composing || inputArea?.contains(document.activeElement)) return;
        } else if (!loadWithValue && (latest.current.trim() !== "" || document.activeElement === plain.current)) return;
        Element.fontsDirectory = null;
        Element.soundsDirectory = null;
        const element = new Element();
        if (upgradeOnBlur || loadWithValue) element.value = plain.current?.value ?? latest.current;
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
            // While a LaTeX command is being typed, Enter finishes it (\\theta becomes the letter). It does not send the form.
            if (element.mode === "latex") return;
            event.preventDefault();
            event.stopPropagation();
            element.closest("form")?.requestSubmit();
          },
          true,
        );
        host.current.appendChild(element);
        mounted = element;
        field.current = element;
        // Names turn into maths as you type, and a declared symbol is left alone.
        baseShortcuts.current = element.inlineShortcuts as Record<string, never>;
        element.inlineShortcuts = shortcutsFor(baseShortcuts.current, declared.current) as typeof element.inlineShortcuts;
        // MathLive focuses its sink from a timer, 60 ms after a click. Do it during the click, so the first key is not lost and
        // a phone opens its keyboard. pointerdown is for a mouse and a pen, click is the touch gesture iOS accepts.
        for (const type of ["pointerdown", "click"]) element.addEventListener(type, () => void focusSink(element), true);
        // A phone keyboard can send text without key presses, which skips the shortcuts and turns \\ into a backslash sign.
        // A hardware key press comes first, and MathLive reads it. Text with no key press just before it gets one made
        // for it: MathLive reads that, and if it does not use it (no shortcut), the character goes in as usual.
        let keyedAt = -Infinity;
        let own = false;
        element.addEventListener(
          "keydown",
          (event) => {
            if (!own && event.key.length === 1 && !event.isComposing && event.keyCode !== 229) keyedAt = performance.now();
            // In a LaTeX command Tab finishes it, like Space and Enter.
            if (event.key === "Tab" && !event.shiftKey && element.mode === "latex") {
              event.preventDefault();
              event.stopPropagation();
              element.executeCommand("complete");
            }
          },
          true,
        );
        element.addEventListener(
          "beforeinput",
          (event) => {
            const input = event as InputEvent;
            if (input.inputType !== "insertText" || !input.data || input.data.length !== 1 || input.isComposing || performance.now() - keyedAt < 60) return;
            const sink = input.composedPath()[0];
            if (!(sink instanceof EventTarget)) return;
            own = true;
            const press = new KeyboardEvent("keydown", { key: input.data, bubbles: true, cancelable: true, composed: true });
            sink.dispatchEvent(press);
            own = false;
            // MathLive used the key (a shortcut, a LaTeX command, a space that finishes one): the character must not go in again.
            if (press.defaultPrevented) {
              input.preventDefault();
              input.stopImmediatePropagation();
            }
          },
          true,
        );

        // Phones: let the phone's own keyboard open for this field. MathLive builds the sink as it connects, so try again a moment later.
        if (isTouchDevice()) {
          const apply = () => enableTouchKeyboard(element);
          if (!apply()) requestAnimationFrame(apply);
          element.addEventListener("focusin", apply);
        }
        setReady(true);
        setLoadingEditor(false);
      } catch {
        // If the library cannot initialize this draft, keep the editable fallback.
        mounted?.remove();
        if (field.current === mounted) field.current = null;
        mounted = undefined;
        if (!cancelled) setLoadingEditor(false);
      }
    };
    const scheduleMount = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(mount);
    };
    const beginComposition = () => { composing = true; };
    const endComposition = () => { composing = false; scheduleMount(); };
    if (upgradeOnBlur) {
      inputArea?.addEventListener("focusout", scheduleMount);
      inputArea?.addEventListener("compositionstart", beginComposition);
      inputArea?.addEventListener("compositionend", endComposition);
    }
    import("mathlive")
      .then((module) => { Element = module.MathfieldElement; mount(); })
      .catch(() => { if (!cancelled) setLoadingEditor(false); });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      inputArea?.removeEventListener("focusout", scheduleMount);
      inputArea?.removeEventListener("compositionstart", beginComposition);
      inputArea?.removeEventListener("compositionend", endComposition);
      mounted?.remove();
      if (field.current === mounted) field.current = null;
    };
    // One import and one editor instance per mount. Values/attributes are synced below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The field is hidden until it is ready, so it can only take the cursor after that render.
  useEffect(() => {
    if (!ready || !focusOnReady.current) return;
    focusOnReady.current = false;
    field.current?.focus();
    if (field.current) focusSink(field.current);
    // A box focused during the tap kept the phone keyboard open while this field loaded. The field has it now.
    // Removing that box takes a moment, so MathLive's focus has settled before the box goes.
    const timer = setTimeout(releasePrimedKeyboard, 250);
    return () => clearTimeout(timer);
  }, [ready]);

  // The problem's symbols can change after the field exists (a new part, a new problem). Keep the shortcuts in step.
  useEffect(() => {
    const element = field.current;
    if (!element || !ready || !baseShortcuts.current) return;
    element.inlineShortcuts = shortcutsFor(baseShortcuts.current, declared.current) as typeof element.inlineShortcuts;
  }, [ready, symbolKey]);

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
    const inserted = `${input.value.slice(0, start)}${text}${input.value.slice(end)}`;
    const next = maxLength === null ? inserted : inserted.slice(0, maxLength);
    change.current(next);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + caret, start + caret);
    });
  }, [maxLength]);

  const all = useMemo(() => [...paletteItems(symbols), ...(extraItems ?? [])], [symbols, extraItems]);
  // The full pad opens under the field being typed in. The other fields keep only the problem's own symbols.
  const items = useMemo(() => (active ? all : all.filter((item) => item.group === "problem")), [active, all]);
  const padSlot = useRef<HTMLDivElement>(null);
  const padBox = useRef<HTMLDivElement>(null);
  const docked = useKeyboardDock(active, host, padBox);
  const [padHeight, setPadHeight] = useState(0);
  useEffect(() => {
    if (docked === null || !padBox.current) return;
    setPadHeight(padBox.current.offsetHeight);
  }, [docked, items]);
  const hint = useSymbolHint(value, checkSymbols ? symbols : [], checkSymbols);

  return (
    <div
      ref={wrapper}
      data-field={id}
      className="flex min-w-0 flex-col gap-2"
      onFocusCapture={() => setActive(true)}
      onBlurCapture={() => requestAnimationFrame(() => { if (!wrapper.current?.contains(document.activeElement)) setActive(false); })}
    >
      <div hidden={!ready} className="relative min-w-0">
        <div ref={host} className="min-w-0" />
        {emptyHint && value.trim() === "" && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-base text-muted-foreground">
            {emptyHint}
          </span>
        )}
      </div>
      {!ready && loadingEditor && <p role="status" className="min-h-11 text-sm text-muted-foreground">Loading math editor…</p>}
      {!ready && !loadingEditor && (
        <>
          <Input
            ref={plain}
            id={id}
            className="h-11 font-mono"
            value={value}
            maxLength={maxLength ?? undefined}
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
          {upgradeOnBlur && <p className="text-sm text-muted-foreground">The math editor could not load. You can type plain expressions or LaTeX here. <button type="button" className="inline-flex min-h-11 items-center underline underline-offset-4" onClick={() => window.location.reload()}>Reload math editor</button></p>}
        </>
      )}
      {items.length > 0 && (
        // Docked above the phone keyboard, the slot keeps the pad's height in the page so the field can scroll clear of it.
        <div ref={padSlot} className="min-w-0" style={docked !== null ? { minHeight: padHeight } : undefined}>
          <div
            ref={padBox}
            className={docked !== null ? "fixed inset-x-0 z-40 border-t bg-background px-2 pb-2 pt-2 shadow-lg" : "min-w-0"}
            style={docked !== null ? { bottom: docked } : undefined}
            data-docked={docked !== null ? "" : undefined}
          >
            <MathPad items={items} mode={padMode} onInsert={insert} disabled={disabled} />
          </div>
        </div>
      )}
      <p id={hintId} role="status" aria-live="polite" className="min-h-0 text-sm text-muted-foreground empty:hidden">
        {hint}
      </p>
    </div>
  );
}

/** A symbol the problem does not use, named with the nearest one, a moment after typing stops. Same words as the checker. */
function useSymbolHint(value: string, symbols: readonly string[], check: boolean): string {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), 700);
    return () => clearTimeout(timer);
  }, [value]);
  return useMemo(() => {
    if (!check || !settled.trim() || settled !== value) return "";
    // A bare log in an answer is refused, with or without declared symbols, so it is said as soon as typing stops.
    const open = symbols.length === 0;
    try {
      readExpression(settled, open ? new SymbolTable([], true) : new SymbolTable(symbols.map(normaliseName)), { logRole: "answer" });
      return "";
    } catch (error) {
      if (!(error instanceof AnswerReadError)) return "";
      return error.message === bareLogMessage || (!open && error.kind === "symbol") ? error.message : "";
    }
  }, [settled, value, symbols, check]);
}
