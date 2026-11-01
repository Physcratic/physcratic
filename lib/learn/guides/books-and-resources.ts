import { REVIEWER } from "../reviewer";
import type { ArticleDraft } from "../types";

// Titles, authors and the contents of the free handouts come from the task brief
// (sources K1 to K3). Books carry no prices, links or edition claims beyond those given.
export const booksAndResources: ArticleDraft = {
  slug: "physics-olympiad-books-and-resources",
  title: "Best books and resources for Physics Olympiad",
  description:
    "Free handouts and books for physics olympiad preparation, picked by our reviewer Arrow Dunatos and grouped by stage and topic.",
  updated: "2026-11-02",
  published: true,
  reviewedBy: REVIEWER,
  sources: [
    {
      id: "k3",
      title: "IPhO study guides",
      url: "https://www.ioc.ee/~kalda/ipho/",
      publisher: "Jaan Kalda",
      accessed: "2026-11-02",
    },
    {
      id: "k2",
      title: "Physics Olympiad handouts",
      url: "https://knzhou.github.io/teaching/",
      publisher: "Kevin Zhou",
      accessed: "2026-11-02",
    },
    {
      id: "k1",
      title: "Learning Introductory Physics",
      url: "https://knzhou.github.io/writing/Advice.pdf",
      publisher: "Kevin Zhou",
      accessed: "2026-11-02",
    },
    {
      id: "k4",
      title: "Writing (full list of advice notes)",
      url: "https://knzhou.github.io/writing/",
      publisher: "Kevin Zhou",
      accessed: "2026-11-02",
    },
  ],
  body: [
    { type: "heading", level: 2, text: "How to use this list" },
    {
      type: "paragraph",
      text: "These are the picks of our reviewer Arrow Dunatos, IPhO 2026 bronze medallist, plus a few we added. Our additions are marked Also useful. You do not need everything here. Pick one book for the topic you are studying now, add a free handout, and put the rest aside until you need it.",
    },
    {
      type: "paragraph",
      text: "The stages below follow the 12-month outline in our preparation guide. Mechanics comes first, then waves and electromagnetism, then thermodynamics, relativity and quantum physics.",
    },
    {
      type: "callout",
      tone: "tip",
      title: "If you only have time for three things",
      text: "Choose one general textbook, one set of free handouts for the topic you are on, and a regular slot for past problems. That is enough for steady progress. Add more only when one of these three runs dry.",
    },
    { type: "heading", level: 2, text: "Free handouts" },
    {
      type: "paragraph",
      text: "Jaan Kalda's IPhO study guides cover kinematics, mechanics, electrical circuits, thermodynamics, wave optics, relativity and quantum mechanics. There is also a formula sheet for the IPhO. Use them when school-level problems feel easy and you want to learn olympiad technique.",
      cite: ["k3"],
    },
    {
      type: "paragraph",
      text: "Kevin Zhou's Physics Olympiad handouts are a set of 42. The core set runs from mathematical techniques and data analysis through mechanics, electromagnetism, thermodynamics, relativity, waves and semiclassical mechanics. There are also review sets and experimental training. Work through one topic at a time, next to your textbook.",
      cite: ["k2"],
    },
    {
      type: "paragraph",
      text: "Zhou also writes advice notes. Learning Introductory Physics is the source of the study tips in our preparation guide. His writing page lists the other notes.",
      cite: ["k1", "k4"],
    },
    {
      type: "paragraph",
      text: "All three sets above are free to read online. They are handouts, not full textbooks, so pair them with a book from the lists below. When a handout and a textbook explain the same idea in different ways, read both. The second explanation often fills the gap the first one left.",
    },
    { type: "heading", level: 2, text: "Starting out" },
    {
      type: "list",
      items: [
        "Halliday, Resnick and Krane, Physics (5th edition). Use it as your general textbook in the first months. Read it in order and do the problems.",
        "James Stewart, Calculus. Keep it beside the physics book. Open it when a derivative or an integral slows you down.",
      ],
    },
    { type: "heading", level: 2, text: "Mechanics and relativity" },
    {
      type: "list",
      items: [
        "David Morin, Introduction to Classical Mechanics. Use it for the mechanics months. Return to it whenever a mechanics problem beats you.",
        "David Morin, Special Relativity for the Enthusiastic Beginner. Read it when you reach relativity, late in the plan.",
      ],
    },
    { type: "heading", level: 2, text: "Electromagnetism" },
    {
      type: "list",
      items: [
        "David J. Griffiths, Introduction to Electrodynamics. Use it for the electromagnetism block. Do not rush the early chapters.",
        "Edward M. Purcell and David J. Morin, Electricity and Magnetism. Use it as a second view of the same topic, especially when a chapter in the first book does not click.",
      ],
    },
    { type: "heading", level: 2, text: "Optics" },
    {
      type: "list",
      items: [
        "Eugene Hecht, Optics. Use it alongside waves, and keep it for reference when you meet wave optics problems.",
      ],
    },
    { type: "heading", level: 2, text: "Thermodynamics and statistical physics" },
    {
      type: "list",
      items: [
        "Stephen J. Blundell and Katherine M. Blundell, Concepts in Thermal Physics. Use it for the thermodynamics months, and read it with a pencil in hand.",
      ],
    },
    { type: "heading", level: 2, text: "Also useful" },
    {
      type: "paragraph",
      text: "These three are our additions, not Arrow's picks. They are problem books. Reach for them once you can solve the problems in your textbooks.",
    },
    {
      type: "list",
      items: [
        "David Morin, Problems and Solutions in Introductory Mechanics. Kevin Zhou recommends it for practice.",
        "Péter Gnädig, Gyula Honyek and Ken Riley, 200 Puzzling Physics Problems. Use it when you want short problems that make you think.",
        "I. E. Irodov, Problems in General Physics. Use it for more practice, after the books above.",
      ],
      cite: ["k1"],
    },
    { type: "heading", level: 2, text: "Past papers" },
    {
      type: "paragraph",
      text: "Past olympiad papers are the closest thing to the real exam. Our preparation guide lists two unofficial archives and explains how to use papers well.",
    },
    {
      type: "guideLink",
      slug: "start-preparing-physics-olympiad",
      hash: "how-to-use-past-papers",
      label: "How to use past papers",
      note: "From our preparation guide.",
    },
    { type: "heading", level: 2, text: "A suggested order" },
    {
      type: "list",
      ordered: true,
      items: [
        "Start with one general textbook and a calculus book. Work through the problems in order.",
        "For each topic, pair one topic textbook with the matching free handouts.",
        "Do the experimental training alongside the theory, not after it.",
        "Add the problem books once textbook problems feel manageable.",
        "Move to past papers. Time yourself, then mark your work step by step.",
        "Keep a log of mistakes and return to the book that covers each one.",
      ],
    },
    {
      type: "paragraph",
      text: "Come back to this order every few months. If a topic feels shaky, go back one stage instead of pushing on. A weak base shows up again in harder problems.",
    },
    {
      type: "paragraph",
      text: "Resources are only half of it. The other half is solving problems every week and reviewing what went wrong.",
    },
  ],
};
