import type { Metadata, Viewport } from "next";
import { Fraunces } from "next/font/google";
import styles from "./coaching.module.css";
import { content } from "@/lib/coaching/content";

const display = Fraunces({ subsets: ["latin"], variable: "--font-coaching-display", display: "swap" });

export const metadata: Metadata = {
  title: content.meta.title,
  description: content.meta.description,
  alternates: { canonical: "/coaching" },
  // Temporary until Coaching Phase 2 and 3 land. Phase 3 removes this.
  robots: { index: false, follow: true },
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
