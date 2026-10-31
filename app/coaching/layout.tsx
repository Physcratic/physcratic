import type { Metadata, Viewport } from "next";
import { Bowlby_One } from "next/font/google";
import styles from "./coaching.module.css";

const display = Bowlby_One({ subsets: ["latin"], weight: "400", variable: "--font-coaching-display" });

export const metadata: Metadata = {
  title: "Physics coaching from Olympiad medalists",
  description: "One-to-one physics tutoring for IB, A-Level, IGCSE and Olympiad preparation. Meet the Physcratic tutors and explore your coaching pathway.",
  alternates: { canonical: "/coaching" },
};

export const viewport: Viewport = { themeColor: "#0c101a" };

export default function CoachingLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${styles.page} ${display.variable} font-sans`}>{children}</div>;
}
