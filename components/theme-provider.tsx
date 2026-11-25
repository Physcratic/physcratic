"use client"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { themeOptions } from "@/lib/theme-setting"
import type { ThemeProviderProps } from "next-themes"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider enableColorScheme={false} themes={themeOptions.map(option => option.value)} {...props}>{children}</NextThemesProvider>
}

