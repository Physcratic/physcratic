import type { ArticleDraft } from "../types";

const dir = "/learn/how-to-use-physcratic";

export const howToUsePhyscratic: ArticleDraft = {
  kind: "product",
  slug: "how-to-use-physcratic",
  title: "How to use Physcratic",
  description: "Find a physics problem, type your answer in the maths field, read what the checker says, open hints and solutions, and replay the tour.",
  updated: "2026-11-05",
  reviewedBy: null,
  sources: [],
  published: true,
  body: [
    { type: "heading", level: 2, text: "Find a problem" },
    { type: "paragraph", text: "Choose Problems in the sidebar. The library opens Physcratic Arena, with the Olympiad archive and Guided exercises in the other tabs. Pick a topic with the Topic buttons, or type in Find a problem. Choose Open problem on a card to start." },
    { type: "paragraph", text: "The dashboard has a Recommended problem card. It shows a random Arena problem that you have not solved in this browser, and Another problem swaps it for a different one. Random quick practice, in the library, opens one of the short practice problems." },
    { type: "siteLink", href: "/dashboard?view=problems", label: "Open the problem library" },
    { type: "image", src: `${dir}/library-topic.webp`, alt: "The problem library with the Waves topic button selected and three Physcratic Arena problem cards below the search boxes.", width: 1280, height: 1000, caption: "Pick a topic, then open a card." },

    { type: "heading", level: 2, text: "Type your answer" },
    { type: "paragraph", text: "Each part has its own answer box, in the same colour as the part. Numbers go in a plain box, with the unit next to it. Units are not converted, and a number within 1 percent counts as right. Anything with letters goes in the maths field, where you type the way you write on paper." },
    { type: "list", items: [
      "Type / for a fraction and ^ for a power.",
      "Type _ for a subscript, sqrt for a root, and a Greek name such as theta for the letter.",
      "Use the symbols the problem gives you. The palette under the field has them first.",
    ] },
    { type: "paragraph", text: "The palette buttons put a symbol, a fraction, a power, a root, a Greek letter or a function such as sin where your cursor is. You can use them instead of typing at all." },
    { type: "image", src: `${dir}/maths-field.webp`, alt: "An Arena problem with the maths field for part a holding r_o, the symbol palette under it starting with r0, k, z and theta0, and a message saying r_o isn't used here and asking if you meant r0.", width: 1280, height: 1000, caption: "The maths field, its palette and a message about a symbol." },
    { type: "siteLink", href: "/dashboard/problems/arena-a-grin-and-a-wiggle", label: "Try it on an Arena problem" },

    { type: "heading", level: 2, text: "Read what the checker says" },
    { type: "paragraph", text: "Choose Check answer. Each part gets a result in words: Correct, Not correct, Could not read this answer, Could not be decided or Not answered. Checks are not saved and do not change your rating. Correct confirms the final answer, not your working." },
    { type: "list", items: [
      "“X isn’t used here. Did you mean Y?” means you used a symbol the problem does not have. It names the closest one.",
      "“Add brackets: a/(bc) or (a/b)c.” The checker will not guess how you meant a divide followed by several letters, so it shows both readings.",
      "Could not be decided means the checker could not tell. It does not mean you are wrong. Compare with the worked solution.",
    ] },
    { type: "paragraph", text: "After a wrong answer, Try again keeps what you typed. After a correct one, Next problem opens the next problem in the list." },
    { type: "problemLink", problemId: "incline", label: "Try a short incline problem" },
    { type: "image", src: `${dir}/practice-steps-feedback.webp`, alt: "A practice problem about a block on an incline, with the answer box, a wrong answer marked Not correct, and a Not correct yet summary under the Check answer button.", width: 1280, height: 1000, caption: "A wrong answer and its result." },

    { type: "heading", level: 2, text: "Hints and solutions" },
    { type: "paragraph", text: "Both stay closed until you ask. Practice problems have Need a hint? and Show solution. Arena problems have a Worked solution tab that you can open at any time. Try the problem first. It helps more." },
    { type: "image", src: `${dir}/arena-parts.webp`, alt: "An Arena problem with part (a) in a blue bordered box and part (b) in a violet one, above answer boxes for parts a and b in the same colours.", width: 1280, height: 1000, caption: "An Arena problem. Each part has its own colour." },

    { type: "heading", level: 2, text: "Other problems and your account" },
    { type: "paragraph", text: "The Olympiad archive has imported IPhO, APhO and EuPhO papers. Most have no automatic check, so compare your work with the worked solution. Guided exercises split papers into parts with a Reading notes box. Community problems save every answer as a numbered attempt, and opening a permitted worked solution makes later attempts on that revision count as assisted. They have no library tab of their own. They sit in Physcratic Arena." },
    { type: "paragraph", text: "You can browse and run checks without an account. Sign up to save notes and attempts, and verify your email to answer community problems. Settings is at the bottom of the sidebar. Coaching in the top bar is about medallist coaches." },
    { type: "siteLink", href: "/settings", label: "Open Settings" },
    { type: "siteLink", href: "/coaching", label: "Meet the coaches" },

    { type: "heading", level: 2, text: "Replay the tour" },
    { type: "paragraph", text: "The Help button, a question mark in the top bar, plays the Welcome to Physcratic tour again. Replay tours in Settings starts every tour from the beginning." },

    { type: "heading", level: 2, text: "Write your own" },
    { type: "paragraph", text: "Problem Studio, at the top of the sidebar, is where you write and publish problems." },
    { type: "guideLink", slug: "how-to-write-a-problem", label: "How to write a problem in Problem Studio" },
    { type: "guideLink", slug: "start-preparing-physics-olympiad", label: "Plan your study" },
  ],
};
