"use client";

import { useEffect } from "react";

/**
 * Sections fade in and rise 8px the first time they scroll into view, once only. Sections already
 * on screen when the page loads are marked revealed straight away, so nothing flashes. Without JS,
 * or under prefers-reduced-motion (handled in CSS), every section is simply visible.
 */
export function CoachingReveal() {
  useEffect(() => {
    const main = document.getElementById("coaching-main");
    if (!main || !("IntersectionObserver" in window)) return;
    const sections = Array.from(main.querySelectorAll<HTMLElement>(":scope > section"));
    for (const section of sections) if (section.getBoundingClientRect().top < window.innerHeight) section.dataset.revealed = "";
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        (entry.target as HTMLElement).dataset.revealed = "";
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -8% 0px" });
    for (const section of sections) if (!("revealed" in section.dataset)) observer.observe(section);
    main.dataset.reveal = "ready";
    return () => observer.disconnect();
  }, []);
  return null;
}
