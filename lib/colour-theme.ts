/**
 * The colour theme is a device setting, like Light and Dark. It changes colour only. It lives in localStorage and is put on the page as a
 * data-colour attribute before the page paints. A second next-themes provider cannot do this, because next-themes hands a nested provider
 * straight through, so this is a small script of its own.
 */
export const colourOptions = [
  { value: "paper", label: "Paper" },
  { value: "ink", label: "Ink" },
  { value: "sky", label: "Sky" },
] as const;

export type ColourChoice = (typeof colourOptions)[number]["value"];

export const colourStorageKey = "physcratic-colour";
export const defaultColour: ColourChoice = "ink";

/** Anything stored that is not one of the three shows as Ink. */
export function colourChoice(value: string | null | undefined): ColourChoice {
  return colourOptions.some((option) => option.value === value) ? (value as ColourChoice) : defaultColour;
}

/** Reads the stored choice. Storage can be blocked, and then the default shows. */
export function readColour(storage: Pick<Storage, "getItem"> | undefined): ColourChoice {
  try {
    return colourChoice(storage?.getItem(colourStorageKey));
  } catch {
    return defaultColour;
  }
}

/** Keeps the choice on this device and puts it on the page. */
export function applyColour(choice: ColourChoice, root: Pick<HTMLElement, "setAttribute">, storage: Pick<Storage, "setItem"> | undefined) {
  root.setAttribute("data-colour", choice);
  try {
    storage?.setItem(colourStorageKey, choice);
  } catch {
    /* The choice still applies for this visit. */
  }
}

/** Runs in the page head before first paint. It repeats colourChoice on purpose, so it needs no bundle. */
export const colourScript = `(function(){var d=document.documentElement,c="${defaultColour}";try{var v=localStorage.getItem("${colourStorageKey}");if(${colourOptions.map((o) => `v==="${o.value}"`).join("||")})c=v}catch(e){}d.setAttribute("data-colour",c)})()`;
