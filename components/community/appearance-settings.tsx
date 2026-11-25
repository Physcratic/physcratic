"use client";
import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { themeChoice, themeOptions } from "@/lib/theme-setting";

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const value = mounted ? themeChoice(theme) : "light";
  return <section id="appearance-settings" aria-labelledby="appearance-heading" className="scroll-mt-6 space-y-6 rounded-2xl border bg-card p-5 sm:p-7">
    <header className="space-y-1"><h2 id="appearance-heading" className="text-lg font-semibold">Appearance</h2><p className="text-sm text-muted-foreground">Changes apply immediately and are saved on this device.</p></header>
    <fieldset disabled={!mounted} className="space-y-6"><legend className="sr-only">Color theme</legend>
      {(["light", "dark"] as const).map(mode => <div key={mode} className="space-y-3">
        <h3 className="text-base font-semibold">{mode === "light" ? "Light Themes" : "Dark Themes"}</h3>
        <div className="grid gap-3 sm:grid-cols-3">{themeOptions.filter(option => option.mode === mode).map(option => <label key={option.value} className={`flex cursor-pointer flex-col gap-3 rounded-xl border p-3 focus-within:ring-2 focus-within:ring-ring ${value === option.value ? "border-foreground bg-muted/50" : "hover:bg-muted/30"}`}>
          <div aria-hidden="true" className="overflow-hidden rounded-md border" style={{ background: option.colors[0], borderColor: option.colors[2] }}>
            <div className="h-3" style={{ background: option.colors[2] }} />
            <div className="flex h-16"><div className="w-1/4 border-r" style={{ background: option.colors[1], borderColor: option.colors[2] }} /><div className="flex flex-1 flex-col gap-2 p-2"><div className="h-5 rounded border" style={{ background: option.colors[1], borderColor: option.colors[2] }} /><div className="h-2 w-1/2 rounded" style={{ background: option.colors[3] }} /></div></div>
          </div>
          <span className="flex items-center gap-2"><input type="radio" name="theme" value={option.value} checked={value === option.value} onChange={() => setTheme(option.value)} className="size-4 accent-[hsl(var(--accent-foreground))]" /><span className="text-sm font-medium">{option.label}</span></span>
          <span className="text-sm text-muted-foreground">{option.description}</span>
        </label>)}</div>
      </div>)}
      <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-4 focus-within:ring-2 focus-within:ring-ring"><input type="radio" name="theme" value="system" checked={value === "system"} onChange={() => setTheme("system")} className="size-4" /><span className="text-sm">Follow system preference</span></label>
    </fieldset>
  </section>;
}
