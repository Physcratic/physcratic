"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { themeChoice, themeOptions } from "@/lib/theme-setting";

/**
 * The one place for personal settings. Only Theme for now. Add further settings as more
 * `<fieldset>` blocks inside the dialog body, each with its own legend.
 */
export function SettingsDialog({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const value = mounted ? themeChoice(theme) : "light";
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Changes apply straight away on this device.</DialogDescription>
        </DialogHeader>
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Theme</legend>
          {/* Native radios: the browser handles arrow keys, selection and grouping. */}
          <div className="grid gap-2">
            {themeOptions.map((option) => (
              <label key={option.value} htmlFor={`theme-${option.value}`} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-1 text-sm">
                <input
                  id={`theme-${option.value}`}
                  type="radio"
                  name="theme"
                  value={option.value}
                  checked={value === option.value}
                  onChange={() => setTheme(option.value)}
                  className="size-5 shrink-0 cursor-pointer accent-[hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      </DialogContent>
    </Dialog>
  );
}
