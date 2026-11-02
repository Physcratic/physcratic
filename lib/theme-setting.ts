/** The theme choices offered in Settings. "system" follows the device. */
export const themeOptions = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

export type ThemeChoice = (typeof themeOptions)[number]["value"];

/** next-themes may report undefined before it has read storage, so anything unknown shows as the default. */
export function themeChoice(value: string | undefined): ThemeChoice {
  return themeOptions.some((option) => option.value === value) ? (value as ThemeChoice) : "light";
}
