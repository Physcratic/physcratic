// The real Appearance section on its own, for tests/colour-themes.browser.mjs.
import React from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { AppearanceSettings } from "../components/community/appearance-settings";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <main className="mx-auto max-w-3xl p-4"><h1 className="sr-only">Colour themes test</h1><AppearanceSettings /></main>
    </ThemeProvider>
  </React.StrictMode>,
);
