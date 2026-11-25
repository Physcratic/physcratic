import type { Metadata, Viewport } from "next";

import styles from "./coaching.module.css";
import { content } from "@/lib/coaching/content";
import { coachingSocial } from "@/lib/coaching/social";


export const metadata: Metadata = {
  title: content.meta.title,
  description: content.meta.description,
  alternates: { canonical: "/coaching" },
  // The image comes from opengraph-image.tsx in this folder.
  ...coachingSocial({ title: content.meta.title, description: content.meta.description, url: "/coaching", withImage: false }),
};

export const viewport: Viewport = { themeColor: "#faf8f3" };

export default function CoachingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${styles.page} font-sans`}
      style={{
        "--background": "43 35% 97%",
        "--foreground": "220 18% 15%",
        backgroundColor: "hsl(var(--background))",
        color: "hsl(var(--foreground))",
        colorScheme: "light",
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
