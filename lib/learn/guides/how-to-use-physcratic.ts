import type { ArticleDraft } from "../types";

const dir = "/learn/how-to-use-physcratic";

export const howToUsePhyscratic: ArticleDraft = {
  kind: "product",
  slug: "how-to-use-physcratic",
  title: "How to use Physcratic",
  description: "Find a physics problem, solve it in four steps, read the feedback, open hints and solutions, and use the archive, Settings and Coaching on Physcratic.",
  updated: "2026-11-04",
  reviewedBy: null,
  sources: [],
  published: true,
  body: [
    { type: "heading", level: 2, text: "Find a problem" },
    { type: "paragraph", text: "Choose Problems in the sidebar. The library opens Physcratic Arena by default. It has three tabs: Physcratic Arena, Olympiad archive and Guided exercises. Arena lists problems written by Physcratic and published community problems." },
    { type: "paragraph", text: "Pick a topic with the Topic buttons. On a phone the row scrolls sideways inside its box. You can also type in Find a problem, choose a Tag or set the Estimated difficulty. The Olympiad archive adds a Competition box. Difficulty is an estimate, not a mark you have earned. Random quick practice opens one of the short practice problems, which have no library tab." },
    { type: "siteLink", href: "/dashboard?view=problems", label: "Open the problem library" },
    { type: "image", src: `${dir}/library-topic.webp`, alt: "The problem library with the Waves topic button selected and three Physcratic Arena problem cards below the search boxes.", width: 1280, height: 1000, caption: "The library with a topic chosen." },

    { type: "heading", level: 2, text: "Solve a problem in four steps" },
    { type: "paragraph", text: "Every problem page shows the same four numbered steps." },
    { type: "list", ordered: true, items: [
      "Read the problem. Check the units, the diagrams and every part.",
      "Answer. Type your answer in the box for each part. Type a number, or LaTeX such as \\frac{1}{2}. Use the units shown, because units are not converted.",
      "Check. Choose Check answer. The button stays off until you type something.",
      "Solution. It stays closed until you open it.",
    ] },
    { type: "paragraph", text: "Problems with parts show each part in its own colour, on the statement and on its answer box. The part letter is always written as well. Checks are not saved and do not change your rating. Optional working is neither graded nor saved." },
    { type: "problemLink", problemId: "incline", label: "Try a short incline problem" },
    { type: "image", src: `${dir}/practice-steps-feedback.webp`, alt: "A practice problem about a block on an incline, with the Read, Answer, Check and Solution steps, a wrong answer marked Not correct, and a Not correct yet box with Try again and See hint buttons.", width: 1280, height: 1000, caption: "A wrong answer, with the buttons for what to do next." },

    { type: "heading", level: 2, text: "Read the feedback" },
    { type: "paragraph", text: "Each answer gets a result next to it, with an icon and words: Correct, Not correct, Could not read this answer, Could not be decided or Not answered. A summary under the button says Correct, Correct so far or Not correct yet. Could not be decided means the checker could not prove a result. It does not mean you are wrong. Parts marked Check this one yourself have no automatic check, so compare them with the worked solution. Correct confirms the final answer, not your working." },
    { type: "paragraph", text: "After a wrong answer, Try again takes you back to the first answer to fix and keeps what you typed. See hint opens the hint on practice problems. After a correct answer, Next problem opens the next problem in the list." },

    { type: "heading", level: 2, text: "Hints and solutions" },
    { type: "paragraph", text: "Hints and solutions stay closed until you ask. On practice problems use Need a hint? and Show solution. The solution also opens by itself after a correct answer. Arena problems have a Worked solution tab instead, which you can open at any time." },

    { type: "heading", level: 2, text: "Arena problems" },
    { type: "paragraph", text: "Arena problems have longer statements with text, mathematics and diagrams. Lettered parts such as (a) and (b) have their own colours, and the answer boxes below use the same colours. Arena problems are unrated." },
    { type: "siteLink", href: "/dashboard/problems/arena-mind-the-gap", label: "Open an Arena example" },
    { type: "image", src: `${dir}/arena-parts.webp`, alt: "An Arena problem with part (a) in a blue bordered box and part (b) in a violet one, above answer boxes for parts a and b in the same colours.", width: 1280, height: 1000, caption: "Parts keep their colour from the statement to the answer box." },

    { type: "heading", level: 2, text: "Olympiad archive and Guided exercises" },
    { type: "paragraph", text: "The Olympiad archive has imported IPhO, APhO and EuPhO problems with the original pages. Each has three tabs: Problem statement, Your solution and Worked solution. Sign in to save your solution. Most archive problems have no automatic check, so compare your work with the worked solution." },
    { type: "paragraph", text: "Guided exercises split selected papers into parts such as 1.1 and 1.2. Each part has its own colour, a Reading notes box and a Reveal official solution box. Choose Mark as reviewed when you have compared your work. Sign in to save your notes." },
    { type: "image", src: `${dir}/guided-reader.webp`, alt: "The Guided reader for an IPhO 2011 problem, with the list of parts on the left and the Read, Answer, Check and Solution steps above the statement of part 1.1.", width: 1280, height: 1000, caption: "A Guided exercise, part 1.1." },

    { type: "heading", level: 2, text: "Community problems" },
    { type: "paragraph", text: "Community problems save each answer as a numbered attempt. The result says Correct, Incorrect, Needs review or Ungraded. Opening a permitted worked solution makes your later attempts on that revision count as assisted." },

    { type: "heading", level: 2, text: "Accounts, Settings, Coaching and Learn" },
    { type: "paragraph", text: "You can browse and run checks without an account. Sign up to save archive attempts and notes. To answer community problems your email must be verified. Settings is at the bottom of the sidebar. Its Appearance section has Light, Dark and System. Light is the default. Coaching in the top bar opens the page about medallist coaches. Learn has study guides." },
    { type: "siteLink", href: "/settings", label: "Open Settings" },
    { type: "siteLink", href: "/coaching", label: "Meet the coaches" },
    { type: "siteLink", href: "/learn", label: "Browse the guides" },

    { type: "heading", level: 2, text: "Write your own" },
    { type: "paragraph", text: "Problem Studio, at the top of the sidebar, is where you write and publish problems." },
    { type: "guideLink", slug: "how-to-write-a-problem", label: "How to write a problem in Problem Studio" },
    { type: "guideLink", slug: "start-preparing-physics-olympiad", label: "Plan your study" },
  ],
};
