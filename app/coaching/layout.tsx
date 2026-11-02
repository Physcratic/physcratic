import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import styles from "./coaching.module.css";
import { content } from "@/lib/coaching/content";

// v0 kept: Bowlby One as the display font, and no noindex.
const display = localFont({
  src: "../../node_modules/@fontsource/bowlby-one/files/bowlby-one-latin-400-normal.woff2",
  weight: "400",
  variable: "--font-coaching-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: content.meta.title,
  description: content.meta.description,
  alternates: { canonical: "/coaching" },
};

export const viewport: Viewport = { themeColor: "#0c101a" };

export default function CoachingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${styles.page} ${display.variable} font-sans`}
      style={{
        "--background": "240 5% 8%",
        "--foreground": "220 50% 97%",
        backgroundColor: "hsl(var(--background))",
        color: "hsl(var(--foreground))",
        colorScheme: "dark",
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
