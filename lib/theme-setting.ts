/** Persistent device-local themes. */
export const themeOptions = [
{value:"light",label:"Physcratic Light",mode:"light",description:"Warm ivory and white panels",colors:["#f7f4ef","#ffffff","#ebe4da","#9b481b"]},
{value:"light-paper",label:"Paper",mode:"light",description:"Soft cream and warm ink",colors:["#eee8dc","#fffaf0","#e2d8c8","#8a4019"]},
{value:"light-cool",label:"Daylight",mode:"light",description:"Cool gray and crisp white panels",colors:["#eef2f6","#ffffff","#dfe6ee","#924318"]},
{value:"dark",label:"Physcratic Dark",mode:"dark",description:"Deep slate with warm accents",colors:["#080c12","#111820","#202b38","#f4b183"]},
{value:"dark-dimmed",label:"Dimmed",mode:"dark",description:"Soft charcoal surface layers",colors:["#202126","#2a2c32","#383b44","#f4b183"]},
{value:"dark-midnight",label:"Midnight",mode:"dark",description:"Deep navy and blue slate panels",colors:["#070d1c","#101c30","#263650","#f4b183"]},
] as const;
export type ThemeChoice = (typeof themeOptions)[number]["value"] | "system";
export function themeChoice(value: string | undefined): ThemeChoice {return value === "system" || themeOptions.some(o=>o.value===value) ? value as ThemeChoice : "light";}
export function themeMode(value: string | undefined): "light" | "dark" | "system" {return value === "system" || !value ? "system" : value.startsWith("dark") ? "dark" : "light";}
