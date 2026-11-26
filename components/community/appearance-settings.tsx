"use client";
import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { themeChoice, themeOptions } from "@/lib/theme-setting";
import { applyColour, colourChoice, colourOptions, colourStorageKey, defaultColour, readColour, type ColourChoice } from "@/lib/colour-theme";

const icons = { light: Sun, dark: Moon, system: Monitor };
export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const value = mounted ? themeChoice(theme) : "light";
  const [colour, setColour] = useState<ColourChoice>(defaultColour);
  useEffect(() => {
    setColour(readColour(window.localStorage));
    // Another tab changed it, so this one follows.
    const follow = (event: StorageEvent) => {
      if (event.key !== colourStorageKey) return;
      const next = colourChoice(event.newValue);
      document.documentElement.setAttribute("data-colour", next);
      setColour(next);
    };
    window.addEventListener("storage", follow);
    return () => window.removeEventListener("storage", follow);
  }, []);
  return <section id="appearance-settings" aria-labelledby="appearance-heading" className="scroll-mt-6 space-y-6 rounded-2xl border bg-card p-5 sm:p-7">
    <header className="space-y-1"><h2 id="appearance-heading" className="text-lg font-semibold">Appearance</h2><p className="text-sm text-muted-foreground">Choose how Physcratic looks on this device.</p></header>
    <fieldset><legend className="mb-3 text-sm font-medium">Theme</legend><div className="grid gap-3 sm:grid-cols-3">{themeOptions.map(option => {
      const Icon = icons[option.value];
      return <label key={option.value} className={`flex min-h-20 cursor-pointer items-center gap-3 rounded-xl border p-4 ${value === option.value ? "border-foreground bg-muted/50" : "hover:bg-muted/30"}`}>
        <input type="radio" name="theme" value={option.value} checked={value === option.value} onChange={() => setTheme(option.value)} className="size-4 accent-[hsl(var(--foreground))]" />
        <Icon aria-hidden="true" className="size-4" /><span className="text-sm font-medium">{option.label}</span>
      </label>;
    })}</div></fieldset>
    <fieldset><legend className="mb-3 text-sm font-medium">Colour</legend><div className="grid gap-3 sm:grid-cols-3">{colourOptions.map(option => (
      <label key={option.value} className={`flex min-h-20 cursor-pointer items-center gap-3 rounded-xl border p-4 ${colour === option.value ? "border-foreground bg-muted/50" : "hover:bg-muted/30"}`}>
        <input type="radio" name="colour" value={option.value} checked={colour === option.value} onChange={() => { setColour(option.value); applyColour(option.value, document.documentElement, window.localStorage); }} className="size-4 accent-[hsl(var(--foreground))]" />
        <span className="text-sm font-medium">{option.label}</span>
        {/* The preview carries its own data-colour, so it shows its own theme in the current Light or Dark. */}
        <span aria-hidden="true" data-colour={option.value} className="ml-auto flex items-center gap-1.5 rounded-md border bg-background p-1.5">
          <span className="rounded bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">Button</span>
          <span className="size-3 rounded-full bg-progress" /><span className="size-3 rounded-full bg-success" />
        </span>
      </label>
    ))}</div></fieldset>
    <p className="text-xs leading-5 text-muted-foreground">Changes apply straight away. System follows your device preference. Both choices stay on this device.</p>
  </section>;
}
