import { REVIEWER } from "../reviewer";
import type { ArticleDraft } from "../types";

// Facts come from the fact sheet for Batch 6.1. Source ids match its S-numbers.
export const startPreparing: ArticleDraft = {
  slug: "start-preparing-physics-olympiad",
  title: "How to start preparing for the Physics Olympiad",
  description:
    "A plain guide for students and parents. What to study first, how to use past papers, a 12-month outline and the mistakes to avoid.",
  updated: "2026-11-01",
  published: true,
  reviewedBy: REVIEWER,
  sources: [
    {
      id: "s1",
      title: "IPhO Statutes, Regulations, Appendices and Syllabus",
      url: "https://www.ipho-new.org/statutes-syllabus/",
      publisher: "International Physics Olympiad",
      accessed: "2026-11-01",
    },
    {
      id: "s9",
      title: "IPhO past problems and results",
      url: "https://ipho-unofficial.org",
      publisher: "ipho-unofficial.org",
      accessed: "2026-11-01",
      unofficial: true,
    },
    {
      id: "s10",
      title: "APhO problems and solutions",
      url: "https://apho.olimpicos.net/",
      publisher: "apho.olimpicos.net",
      accessed: "2026-11-01",
      unofficial: true,
    },
    {
      id: "k1",
      title: "Learning Introductory Physics",
      url: "https://knzhou.github.io/writing/Advice.pdf",
      publisher: "Kevin Zhou",
      accessed: "2026-11-02",
    },
  ],
  body: [
    { type: "heading", level: 2, text: "What you are preparing for" },
    {
      type: "paragraph",
      text: "The International Physics Olympiad, or IPhO, is a contest for secondary school students. There are also two regional contests, the Asian Physics Olympiad (APhO) and the European Physics Olympiad (EuPhO). Our other guides explain how the three differ and how the papers are marked.",
    },
    {
      type: "paragraph",
      text: "This guide is for a student who enjoys physics and wants a plan, and for the parents who want to know what that plan involves. Nobody needs to be sure about the Olympiad on day one. You can start with the physics and decide later.",
    },
    { type: "heading", level: 2, text: "How selection works" },
    {
      type: "paragraph",
      text: "Each country runs its own selection. We do not describe any country's process here, because the steps and the dates differ from country to country and they can change. Ask your physics teacher or your national olympiad organiser what the first step is and when it happens. Then work backwards from that date.",
    },
    {
      type: "callout",
      tone: "note",
      title: "For parents",
      text: "Ask early. The most useful single question is: what is the first selection round, and when is it? Everything else in the plan depends on the answer.",
    },
    {
      type: "paragraph",
      text: "Before you plan, ask your organiser these questions:",
    },
    {
      type: "list",
      items: [
        "What is the first selection round, and when does it take place?",
        "Which age and school rules apply to me?",
        "How do I register, and who registers me?",
        "Where can I find past papers from earlier rounds?",
      ],
    },
    { type: "heading", level: 2, text: "Check the age and school rules" },
    {
      type: "paragraph",
      text: "As of 2026, the IPhO statutes say a student must not be older than 20 on June 30 of the competition year. Students must come from general or technical secondary schools. A student who finishes school that year can still compete, as long as they have not started university. Rules can change, so confirm them with your national organiser and the current host site.",
      cite: ["s1"],
    },
    { type: "heading", level: 2, text: "What to study first" },
    {
      type: "paragraph",
      text: "The IPhO syllabus is a good map, even if you never reach the IPhO itself. It covers mechanics, electromagnetic fields, oscillations and waves, relativity, quantum physics, and thermodynamics and statistical physics. It also lists experimental skills, which means measurement, uncertainty and data analysis, and the mathematics you need.",
      cite: ["s1"],
    },
    {
      type: "paragraph",
      text: "The syllabus does not give a study order. This order is our suggestion:",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "Mechanics. Forces, energy and motion. Many later topics lean on it.",
        "Oscillations and waves.",
        "Electromagnetic fields.",
        "Thermodynamics and statistical physics.",
        "Relativity and quantum physics.",
        "Experimental skills, practised alongside all of the above.",
      ],
    },
    {
      type: "paragraph",
      text: "For each topic, use the same loop. Read a short section of a textbook. Do the easy problems to check you followed it. Then try problems that need more than one idea. If a problem takes you more than one session, that is normal. Write down where you got stuck and come back to it.",
    },
    {
      type: "paragraph",
      text: "On the mathematics, the statutes say problems should be solvable with standard high school mathematics. Calculus is in the syllabus. That means derivatives, and integration as the inverse of differentiation. Partial derivatives are not needed. If you have not met calculus yet, learn it alongside mechanics rather than waiting.",
      cite: ["s1"],
    },
    {
      type: "problemLink",
      problemId: "incline",
      label: "Try a starter mechanics problem: A block on an incline",
      note: "A short problem on Newton's laws. Our marking guide uses it as a worked example.",
    },
    { type: "heading", level: 2, text: "How to use past papers" },
    {
      type: "paragraph",
      text: "Past papers are the best practice because they look like the real thing. Two archives are useful, and both are unofficial. They are the IPhO problems and results at ipho-unofficial.org and the APhO problems and solutions at apho.olimpicos.net. Check any detail that matters against the official source.",
      cite: ["s9", "s10"],
    },
    {
      type: "paragraph",
      text: "A real IPhO theory exam has 3 problems and lasts 5 hours. Practise with that in mind. This routine works well:",
      cite: ["s1"],
    },
    {
      type: "list",
      ordered: true,
      items: [
        "Pick one problem and give it a fixed block of time. Do not look at the solution.",
        "Write your answer as if a marker will read it.",
        "Only then read the official solution. Mark yourself step by step.",
        "Write each mistake in a log, with the cause. Was it a missing idea, an algebra slip or a unit error?",
        "Return to the problem a few weeks later and solve it again from a blank page.",
      ],
    },
    { type: "heading", level: 2, text: "A 12-month outline" },
    {
      type: "paragraph",
      text: "This is a suggested plan, not an official one. Move the blocks around to fit your national selection dates. Short, regular sessions beat rare long ones.",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "Months 1 to 3. Mechanics and the mathematics it needs, including the start of calculus. Solve many short problems.",
        "Months 4 to 6. Oscillations and waves, then electromagnetic fields. Begin timed work on single past problems.",
        "Months 7 to 9. Thermodynamics, relativity and quantum physics. Start simple experiments at home and practise estimating uncertainty.",
        "Months 10 to 12. Full papers under exam conditions. Review your mistake log. Check the selection dates again and make time to rest.",
      ],
    },
    { type: "heading", level: 2, text: "How to study and solve problems" },
    {
      type: "paragraph",
      text: "Kevin Zhou's free guide Learning Introductory Physics has study advice that suits olympiad preparation. We summarise the main points in our own words. Read his guide for the full argument.",
      cite: ["k1"],
    },
    {
      type: "list",
      items: [
        "Learn from one good textbook, in order, instead of scattered videos and web pages. Zhou suggests spending about as much time on problems as on reading.",
        "Read actively. Ask where an idea shows up in real life, check limiting cases, and try to rederive the results yourself.",
        "Study in short, regular, focused sessions. Cramming and over-planning do not work, he says. Sleep and exercise help.",
        "Try each problem properly before you read the solution. Practise at a level that is hard but mostly solvable on your own. After a mistake, look for the principle you were missing, not only the line where it went wrong.",
        "Check every answer. Look at the units, the limiting cases, and the numbers as a separate step.",
        "A strong base in calculus-based physics matters more than exam tricks.",
      ],
      cite: ["k1"],
    },
    { type: "heading", level: 2, text: "Common mistakes" },
    {
      type: "list",
      items: [
        "Reading the solution too soon. Try the problem properly first.",
        "Skipping the experiment side. The IPhO has an experimental exam as well as a theory exam, and the syllabus lists experimental skills.",
        "Studying only the topics you already like.",
        "Memorising formulas instead of learning where they come from.",
        "Ignoring units. Our marking guide explains why they matter.",
        "Collecting problems but never reviewing the mistakes.",
        "Waiting until the selection date is close before starting.",
      ],
      cite: ["s1"],
    },
    { type: "heading", level: 2, text: "A note for parents" },
    {
      type: "paragraph",
      text: "You do not need to know the physics to help. Find out the selection dates, protect time for regular practice, and make sure your child sleeps. Treat each result as information about what to study next. It is not a verdict on ability. Nobody can promise a place on a team, and this guide does not.",
    },
  ],
};
