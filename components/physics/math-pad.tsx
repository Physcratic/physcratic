"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { answerItems, padTabs, paletteItems, plainInsertion, type PadTab, type PaletteItem } from "./answer-palette";
import { keyboardInset, scrollToClearPad } from "./keyboard-dock";
import { isTouchDevice } from "./mathfield-touch";

/** "answer" hides every button the checker cannot read. "full" (Studio text and solution fields) shows them all. */
export type PadMode = "answer" | "full";

const buttonBase =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-2 text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";
const plainButton = `${buttonBase} border-input bg-background hover:bg-accent`;
// The problem's own symbols. Orange text on a pale orange face in light, the same orange on a dark one in dark.
const problemButton = `${buttonBase} border-accent-foreground bg-accent text-accent-foreground hover:bg-accent/70`;

/**
 * The Math Pad: tabs for Problem, Operations, Relations, Greek, Trig and Other, and a grid of buttons under them.
 * A button never takes the cursor out of the field, so it works the same under a phone keyboard.
 * `data-tour="answer-palette"` stays on the pad so the tour can point at it.
 */
export function MathPad({
  items,
  mode,
  onInsert,
  disabled,
  tour = true,
  label = "Insert symbols and functions",
}: {
  items: readonly PaletteItem[];
  mode: PadMode;
  onInsert: (item: PaletteItem) => void;
  disabled?: boolean;
  tour?: boolean;
  label?: string;
}) {
  const shown = useMemo(() => (mode === "answer" ? answerItems(items) : [...items]), [items, mode]);
  const tabs = useMemo(() => padTabs.filter((tab) => shown.some((entry) => entry.group === tab.id)), [shown]);
  const [chosen, setChosen] = useState<PadTab | null>(null);
  const [more, setMore] = useState(false);
  const base = useId();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const active = tabs.find((tab) => tab.id === chosen)?.id ?? tabs[0]?.id;
  // A tab can disappear when the problem changes. Fall back to the first one rather than leave nothing selected.
  useEffect(() => {
    if (chosen && !tabs.some((tab) => tab.id === chosen)) setChosen(null);
  }, [chosen, tabs]);
  if (!tabs.length || !active) return null;

  const inTab = shown.filter((entry) => entry.group === active);
  const capitals = inTab.filter((entry) => entry.more);
  const visible = more ? inTab : inTab.filter((entry) => !entry.more);

  const move = (event: React.KeyboardEvent, index: number) => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    setChosen(tabs[next].id);
    refs.current[tabs[next].id]?.focus();
  };
  // Pressing a control must not take the cursor out of the field the person is typing in.
  const keepFocus = {
    onPointerDown: (event: React.PointerEvent) => event.preventDefault(),
    onMouseDown: (event: React.MouseEvent) => event.preventDefault(),
  };

  return (
    <div data-math-pad="" data-tour={tour ? "answer-palette" : undefined} className="min-w-0 rounded-lg border border-input bg-card p-2">
      {tabs.length > 1 && <div role="tablist" aria-label={label} className="flex min-w-0 gap-1 overflow-x-auto pb-2">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(element) => {
              refs.current[tab.id] = element;
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${tab.id}`}
            aria-selected={tab.id === active}
            aria-controls={`${base}-panel`}
            tabIndex={tab.id === active ? 0 : -1}
            disabled={disabled}
            {...keepFocus}
            onClick={() => setChosen(tab.id)}
            onKeyDown={(event) => move(event, index)}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-md border px-3 text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${
              tab.id === active
                ? tab.id === "problem"
                  ? "border-accent-foreground bg-accent text-accent-foreground"
                  : "border-foreground bg-secondary text-secondary-foreground"
                : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>}
      <div
        role={tabs.length > 1 ? "tabpanel" : "group"}
        id={`${base}-panel`}
        aria-labelledby={tabs.length > 1 ? `${base}-tab-${active}` : undefined}
        aria-label={tabs.length > 1 ? undefined : label}
        className="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1.5"
      >
        {visible.map((entry) => (
          <button
            key={entry.id}
            type="button"
            disabled={disabled}
            aria-label={entry.name}
            data-palette={entry.group}
            {...keepFocus}
            onClick={() => onInsert(entry)}
            className={entry.group === "problem" ? problemButton : plainButton}
          >
            <span aria-hidden="true">{entry.label}</span>
          </button>
        ))}
        {capitals.length > 0 && (
          <button
            type="button"
            disabled={disabled}
            aria-expanded={more}
            {...keepFocus}
            onClick={() => setMore((value) => !value)}
            className={`${plainButton} col-span-2 whitespace-nowrap`}
          >
            {more ? "Show less" : "Show more"}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * While a phone keyboard is open, the pad's offset above it. The pad sits `fixed` at that offset and the page scrolls so the
 * field stays visible. It returns null, and the pad stays under the field, when visualViewport is missing, the keyboard
 * height cannot be read, or the field cannot be kept clear of the pad.
 */
export function useKeyboardDock(active: boolean, field: React.RefObject<HTMLElement | null>, pad: React.RefObject<HTMLElement | null>): number | null {
  const [inset, setInset] = useState<number | null>(null);
  // Set when the field could not be kept clear of the pad. The pad stays inline until the keyboard closes.
  const blocked = useRef(false);
  useEffect(() => {
    const viewport = typeof window === "undefined" ? undefined : window.visualViewport;
    if (!active || !viewport || !isTouchDevice()) {
      setInset(null);
      return;
    }
    let frame = 0;
    /** The docked pad is a little taller than the inline one: padding and a top border. */
    const padHeight = () => (pad.current?.offsetHeight ?? 0) + (pad.current?.hasAttribute("data-docked") ? 0 : DOCK_PADDING);
    /** Scrolls the field clear of the pad. Reserving the pad's height in the page takes a frame, so it tries a few times. */
    const clear = (attempt: number) => {
      const target = field.current;
      if (!target) return;
      const shift = scrollToClearPad(target.getBoundingClientRect(), viewport, padHeight());
      if (shift === null) {
        blocked.current = true;
        setInset(null);
      } else if (shift > 1) {
        // Within a pixel counts as clear. A fraction of a pixel cannot be scrolled and would only hide the pad.
        if (attempt >= 3) {
          blocked.current = true;
          setInset(null);
        } else {
          scrollParentOf(field.current)?.scrollBy(0, shift) ?? window.scrollBy(0, shift);
          frame = requestAnimationFrame(() => clear(attempt + 1));
        }
      }
    };
    const update = () => {
      cancelAnimationFrame(frame);
      const next = keyboardInset(viewport, window.innerHeight);
      if (next === null) {
        blocked.current = false;
        return setInset(null);
      }
      if (blocked.current || !field.current) return setInset(null);
      setInset(next);
      frame = requestAnimationFrame(() => clear(0));
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, [active, field, pad]);
  return inset;
}

const DOCK_PADDING = 17;

/** The nearest ancestor that scrolls by itself (the dashboard scrolls inside its main area), or null when the window does. */
function scrollParentOf(element: HTMLElement | null): HTMLElement | null {
  for (let node = element?.parentElement ?? null; node && node !== document.body; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (/(auto|scroll)/.test(overflowY) && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
}

/**
 * The pad under a plain text box (Studio's Advanced equation field). "latex" writes LaTeX at the cursor. "text" is for
 * plain words, so it offers only the buttons that are a single character and writes that character.
 */
export function TextareaPad({
  textarea,
  value,
  onChange,
  maxLength,
  as,
  label,
}: {
  textarea: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  as: "latex" | "text";
  label: string;
}) {
  const items = useMemo(() => paletteItems([]).filter((item) => as === "latex" || !item.insert.includes("#")), [as]);
  const insert = (item: PaletteItem) => {
    const box = textarea.current;
    const { text, caret } = as === "latex" ? plainInsertion(item.insert) : { text: item.label, caret: item.label.length };
    const start = box?.selectionStart ?? value.length;
    const end = box?.selectionEnd ?? start;
    const next = `${value.slice(0, start)}${text}${value.slice(end)}`;
    if (next.length > maxLength) return;
    onChange(next);
    requestAnimationFrame(() => {
      box?.focus();
      box?.setSelectionRange(start + caret, start + caret);
    });
  };
  return <MathPad items={items} mode="full" onInsert={insert} tour={false} label={label} />;
}
