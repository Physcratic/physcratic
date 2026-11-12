import type { ArticleDraft } from "../types";

// Facts come from the fact sheet for Batch 6.1 (S1 marking rules, S3 exam instructions).
// The worked example uses the published Arena Mind the Gap solution.
export const howMarkingWorks: ArticleDraft = {
  slug: "how-olympiad-solutions-are-marked",
  title: "How Olympiad physics solutions are marked",
  description:
    "How marks are given for IPhO theory solutions, why method and units matter, and how to write work a marker can follow.",
  updated: "2026-11-12",
  published: true,
  // The replacement Mind the Gap example awaits explicit owner editorial approval.
  reviewedBy: null,
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
    { type: "heading", level: 2, text: "A worked example: Mind the Gap" },
    { type: "paragraph", text: "Use the Arena optics problem Mind the Gap to practise presenting a derivation and a fitted numerical result. Arena is unrated and does not award exam marks. The example below illustrates how to make your reasoning visible." },
    { type: "problemLink", problemId: "arena-mind-the-gap", label: "Open Mind the Gap before reading the example" },
    { type: "heading", level: 3, text: "Result 1: write the physical relation" },
    { type: "paragraph", text: "For the reflected dark rings, write the gap geometry and interference condition before substituting numbers. State the near-normal incidence approximation and the ordering of the two positive curvature radii." },
    { type: "math", tex: "2t \\simeq r_m^2(1/R_1 - 1/R_0) = m\\lambda" },
    { type: "heading", level: 3, text: "Result 2: isolate the quantity" },
    { type: "paragraph", text: "Rearrange for the ring radius and keep the symbolic result separate. A marker can inspect this step even if a later arithmetic result is wrong." },
    { type: "math", tex: "r_m = \\sqrt{\\frac{m\\lambda}{1/R_1 - 1/R_0}}" },
    { type: "paragraph", text: "Successive rings differ by one in order. Subtract the squared-radius equations before fitting so that the unknown order of the first measured ring drops out. Explain which measurements you used, convert the ring radii into metres, and show the quantity plotted on each axis. If your fitted radius differs from the published result, the plotted points and conversion steps help a marker distinguish a calculation slip from an incorrect model." },
    { type: "heading", level: 3, text: "Result 3: report the fit and its unit" },
    { type: "paragraph", text: "The published worked solution fits the consecutive ring measurements and obtains a lens curvature radius of 0.89895 m, rounded to 0.90 m at the precision of the data. Show the fit method, the numerical result and the unit. A final number alone does not show the method." },
    { type: "paragraph", text: "Check that the denominator in the squared-radius expression has units of inverse length. The result then has units of length squared, as required. Explain this check in your working instead of only writing a number." },
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
