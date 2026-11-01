import { REVIEWER } from "../reviewer";
import type { ArticleDraft } from "../types";

// Facts come from the fact sheet for Batch 6.1 (S1 marking rules, S3 exam instructions).
// The worked example uses our own "incline" problem from lib/physics.ts.
export const howMarkingWorks: ArticleDraft = {
  slug: "how-olympiad-solutions-are-marked",
  title: "How Olympiad physics solutions are marked",
  description:
    "How marks are given for IPhO theory solutions, why method and units matter, and how to write work a marker can follow.",
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
      id: "s3",
      title: "IPhO 2026 Theory Instructions",
      url: "https://olimpicos.net/files/ipho/IPhO_2026_TheoryInstructions.pdf",
      publisher: "IPhO 2026 (copy hosted on olimpicos.net)",
      accessed: "2026-11-01",
    },
  ],
  body: [
    { type: "heading", level: 2, text: "Who marks your paper" },
    {
      type: "paragraph",
      text: "At the International Physics Olympiad, the host grades the papers. The markers use a detailed marking scheme that the International Board has approved. They follow that scheme, so the way you write your solution decides what they can find and credit. This guide uses the IPhO rules as of 2026. For any other contest, check the current host site.",
      cite: ["s1"],
    },
    { type: "heading", level: 2, text: "Marks for every correct step" },
    {
      type: "paragraph",
      text: "Marks are added for every correct intermediate or final result. Partial marks are given when work is incomplete. A wrong final number can therefore still carry marks for the correct results that came before it.",
      cite: ["s1"],
    },
    {
      type: "paragraph",
      text: "The rules also cover tasks that are hard to do exactly. For mathematically hard tasks, approximate solutions should get partial credit. The share of marks for pure mathematical manipulation should be small. The physics ideas count for more than the algebra.",
      cite: ["s1"],
    },
    { type: "heading", level: 2, text: "Why the method matters" },
    {
      type: "paragraph",
      text: "A marking scheme lists results. A marker looks through your page for each one and ticks it when they find it. If your method is hidden in a pile of algebra, the marker may not find a result you did reach. So make each result easy to see:",
    },
    {
      type: "list",
      items: [
        "Name the physical law or principle you use.",
        "Define every symbol the first time you use it.",
        "Write the equation in symbols before you put in numbers.",
        "Put one idea on each line.",
        "Mark the result of each step so it stands out.",
      ],
    },
    { type: "heading", level: 2, text: "Why units matter" },
    {
      type: "paragraph",
      text: "The 2026 IPhO theory instructions say that numerical work must show units. A number without a unit is an incomplete answer. Units also help you. If the unit of your answer is wrong, then the equation behind it is wrong, and you can catch the error before the marker does.",
      cite: ["s3"],
    },
    { type: "heading", level: 2, text: "Write for a marker who may not read your language" },
    {
      type: "paragraph",
      text: "The 2026 theory instructions give several rules about the paper itself. Final answers go on answer sheets and working goes on worksheets. Only the front of each page is scanned. Answers should be concise, with little explanatory text, because markers may not read the student's language.",
      cite: ["s3"],
    },
    {
      type: "paragraph",
      text: "In practice, that means:",
    },
    {
      type: "list",
      items: [
        "Write on the front of each page only.",
        "Use equations and short labels instead of long sentences.",
        "Put the final answer, with its unit, where the answer sheet asks for it.",
        "Keep the working on the worksheets, in an order a stranger can follow.",
      ],
      cite: ["s3"],
    },
    {
      type: "callout",
      tone: "note",
      title: "Read your own instructions",
      text: "These rules come from the instructions for one exam, the 2026 IPhO theory paper. Each contest and each year can differ. Read the instructions you are given on the day.",
      cite: ["s3"],
    },
    { type: "heading", level: 2, text: "Estimating and checking" },
    {
      type: "paragraph",
      text: "The sources above do not set rules for checking. This is our own advice. Spend the last minutes of each problem on four quick checks:",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "Units. Does the answer have the unit you expected?",
        "Limits. Set an angle, a mass or a time to zero or to a very large value. Does the answer behave sensibly?",
        "Size. Is the number about the right size for the situation? A person does not run at the speed of sound.",
        "A second route. Can you get the same answer from energy if you first used forces?",
      ],
    },
    {
      type: "paragraph",
      text: "A rough estimate at the start also helps. If you expect an answer near 5 and you get 5000, stop and look for the slip.",
    },
    { type: "heading", level: 2, text: "A worked example: the incline" },
    {
      type: "paragraph",
      text: "This is one of our own practice problems. A 2 kg block rests on a smooth, frictionless incline at 30° to the horizontal. What is the magnitude of its acceleration down the incline? Use a gravitational acceleration of 9.8 m/s². It is far shorter than an olympiad problem, but it shows the habits that earn marks.",
    },
    {
      type: "problemLink",
      problemId: "incline",
      label: "Try it yourself first: A block on an incline",
    },
    {
      type: "heading",
      level: 3,
      text: "Result 1: the force along the slope",
    },
    {
      type: "paragraph",
      text: "On a frictionless incline, only the part of the weight along the slope speeds the block up. The normal force cancels the part perpendicular to the slope. Write the law and the symbols first.",
    },
    { type: "math", tex: "F_{\\parallel} = m g \\sin\\theta" },
    { type: "heading", level: 3, text: "Result 2: Newton's second law" },
    {
      type: "paragraph",
      text: "Divide the net force by the mass. The mass cancels, so the answer does not depend on the 2 kg. Keep this symbolic result on its own line.",
    },
    { type: "math", tex: "a = \\frac{F_{\\parallel}}{m} = g \\sin\\theta" },
    { type: "heading", level: 3, text: "Result 3: the number, with its unit" },
    {
      type: "paragraph",
      text: "Now substitute, and write the unit on the answer.",
    },
    {
      type: "math",
      tex: "a = 9.8 \\times \\sin 30^{\\circ} = 4.9\\ \\mathrm{m/s^2}",
    },
    { type: "heading", level: 3, text: "What the marker sees" },
    {
      type: "paragraph",
      text: "There are three separate results on the page, and each is easy to find. Suppose a student writes the same two equations but uses sin 30° = 0.6. They get 5.9 m/s² (to two significant figures) and the final number is wrong. The two correct equations are still there, and under the IPhO rule that marks are added for every correct intermediate result, a marker has something to credit. If the student had written only the wrong number, the marker would have nothing to credit.",
      cite: ["s1"],
    },
    {
      type: "paragraph",
      text: "Now run the checks. The unit m/s² is the unit of acceleration. At 0° the answer is 0, which is right for a flat surface. At 90° it is g, which is right for free fall. And sin 30° is one half, so the answer should be half of 9.8, which is 4.9.",
    },
    { type: "heading", level: 2, text: "A checklist before you hand in" },
    {
      type: "list",
      items: [
        "Is each key result on its own line, in symbols, before any numbers?",
        "Does every number have a unit?",
        "Is the final answer on the answer sheet, and the working on the worksheets?",
        "Did you write on the front of each page only?",
        "Did you run the four checks?",
        "If you could not finish a hard part, did you write down an approximate result? Partial credit exists for that.",
      ],
      cite: ["s1", "s3"],
    },
  ],
};
