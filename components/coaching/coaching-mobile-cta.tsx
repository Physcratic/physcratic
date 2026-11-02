"use client";

import { useEffect, useState } from "react";
import { hideMobileCta } from "@/lib/coaching/mobile-cta";

/** The fixed "Get a consultation" bar for small screens. It steps aside while its own call to action or the footer is on screen. */
export function CoachingMobileCta({ label }: { label: string }) {
  const [onScreen, setOnScreen] = useState({ hero: false, footer: false });
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const targets: [string, "hero" | "footer"][] = [["#hero-cta", "hero"], ["footer", "footer"]];
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const key = (entry.target as HTMLElement).dataset.ctaWatch as "hero" | "footer";
        setOnScreen((current) => ({ ...current, [key]: entry.isIntersecting }));
      }
    });
    for (const [selector, key] of targets) {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) continue;
      element.dataset.ctaWatch = key;
      observer.observe(element);
    }
    return () => observer.disconnect();
  }, []);
  const hidden = hideMobileCta(onScreen);
  return (
    <a
      href="#hero-cta"
      className="coaching-mobile-cta"
      data-hidden={hidden ? "" : undefined}
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : undefined}
    >
      {label}
    </a>
  );
}
