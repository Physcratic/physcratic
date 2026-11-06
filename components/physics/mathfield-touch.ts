// MathLive 0.111.1 builds a hidden editable "keyboard sink" with inputmode=none, so a phone never opens its own keyboard.
// On a touch device the sink is switched to inputmode=text, with the typing helpers off so the keyboard does not
// capitalise, correct or suggest inside a maths field. tests/mathfield-touch.test.ts fails if an upgrade moves the sink.

export const SINK_SELECTOR = ".ML__keyboard-sink";

/** The attributes the sink needs for the phone's own keyboard to open and stay out of the way. */
export const touchSinkAttributes = {
  inputmode: "text",
  autocapitalize: "off",
  autocorrect: "off",
  autocomplete: "off",
  spellcheck: "false",
} as const;

type HasSink = { shadowRoot: { querySelector(selector: string): Element | null } | null };

/** Whether this device has a touch screen. Mouse and keyboard devices keep MathLive's own settings. */
export function isTouchDevice(win: Pick<Window, "matchMedia"> & { navigator?: Pick<Navigator, "maxTouchPoints"> } = window): boolean {
  try {
    if (win.matchMedia("(any-pointer: coarse)").matches) return true;
  } catch {
    /* no matchMedia: fall through to the touch point count */
  }
  return (win.navigator?.maxTouchPoints ?? 0) > 0;
}

/** Sets the attributes on the sink. Returns false when the sink is not there, so the caller can try again or give up. */
export function enableTouchKeyboard(element: HasSink): boolean {
  const sink = element.shadowRoot?.querySelector(SINK_SELECTOR);
  if (!sink) return false;
  for (const [name, value] of Object.entries(touchSinkAttributes)) sink.setAttribute(name, value);
  return true;
}

let primed: HTMLInputElement | null = null;

/**
 * Call inside a tap that is about to open a maths field that is not loaded yet. iOS only opens the keyboard for focus that
 * happens during the tap, so a small hidden text box takes focus now and the maths field takes it over a moment later,
 * with the keyboard staying up. releasePrimedKeyboard() removes the box.
 */
export function primeKeyboard(): void {
  if (typeof document === "undefined" || !isTouchDevice()) return;
  releasePrimedKeyboard();
  const input = document.createElement("input");
  input.type = "text";
  input.setAttribute("aria-hidden", "true");
  input.tabIndex = -1;
  for (const [name, value] of Object.entries(touchSinkAttributes)) input.setAttribute(name, value);
  input.style.cssText = "position:fixed;left:0;top:50%;width:1px;height:1px;opacity:0;border:0;padding:0;pointer-events:none";
  document.body.appendChild(input);
  input.focus({ preventScroll: true });
  primed = input;
  // If the maths field never takes over, do not leave the box behind.
  setTimeout(() => {
    if (primed === input) releasePrimedKeyboard();
  }, 4000);
}

export function releasePrimedKeyboard(): void {
  primed?.remove();
  primed = null;
}
