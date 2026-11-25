import type { ArticleDraft } from "../types";

const dir = "/learn/how-to-write-a-problem";

export const howToWriteAProblem: ArticleDraft = {
  kind: "product",
  slug: "how-to-write-a-problem",
  title: "How to Write a Problem in Problem Studio",
  description: "Write a physics problem in Problem Studio, add the final answer and a picture, try an answer, publish it, and find the extra settings in More options.",
  updated: "2026-11-12",
  reviewedBy: null,
  sources: [],
  published: true,
  body: [
    { type: "heading", level: 2, text: "Open Problem Studio" },
    { type: "paragraph", text: "Sign in with an email-verified account and choose Problem Studio in the sidebar. There is no separate staff invitation requirement. You can edit only your own problems. Studio opens on your drafts. Press New problem to start a blank one, and the Back to drafts arrow in the editor takes you back to the list." },
    { type: "paragraph", text: "The Help button, a question mark at the top, plays the Write your first problem tour. It points at each part of the page." },
    { type: "siteLink", href: "/dashboard/author", label: "Open Problem Studio", note: "You need to be signed in with a verified email." },
    { type: "image", src: `${dir}/studio-simple.webp`, alt: "Problem Studio. The question about a ball thrown straight up has an equation inside the sentence, an Equation button sits under it, and a drawing of the ball\u2019s path is added as an image.", width: 1280, height: 1000, caption: "Problem Studio. Everything is in one column." },

    { type: "heading", level: 2, text: "Write the Question" },
    { type: "paragraph", text: "If every part shares a setup, write it under Main question. Otherwise leave it empty and type the question under What’s the question? Press Equation, or type $ or Alt+=, and an equation box opens where your cursor is. Type the maths, then press Esc or Done. The equation shows as maths inside your text. Click it to change it." },
    { type: "image", src: `${dir}/studio-equation.webp`, alt: "The question box with a rendered equation inside the sentence and the Type your equation panel open under it, with the maths field and a palette of symbols.", width: 1280, height: 1000, caption: "Click an equation to change it." },
    { type: "paragraph", text: "An image is optional. Choose an image, or paste or drop one, then describe the image for readers who cannot see it. Studio needs that description before you can publish. The title comes from the first words of your question. Change it if you like." },

    { type: "heading", level: 2, text: "Add the Worked Solution and the Final Answer" },
    { type: "paragraph", text: "Worked solution is required and uses the same equation box. It stays private until a student opens it. Final Answer (Solution) comes right under it and is what the checker compares students against. Type a number and choose its unit, or type an expression in the maths field. Studio finds the symbols for you and lists them. A number within 1 percent counts as right, so 10.08 N is accepted for an answer of 10 N. Units are not converted. For a logarithm, write ln for the natural log or log₁₀ for base 10. A bare log is not accepted." },
    { type: "paragraph", text: "Answer preview sits right under it, and only you see it. Type what a student might write, and it shows Correct, Incorrect or Needs review, the same as a student would see." },

    { type: "heading", level: 2, text: "More Parts, Source and Publishing" },
    { type: "paragraph", text: "Add part b repeats the question, solution and answer for the next part, and the button names the next letter. Each part gets its own colour." },
    { type: "paragraph", text: "Studio saves by itself. Wait for All changes saved. Say where it is from: I wrote it, or Adapted from with the source. Give it a difficulty rating, a whole number from 0 to 4,000. Its difficulty band appears beside the number. Publish needs a rating. Pick a topic such as Mechanics so people can find the problem. Tick the box that says you have the right to share it, then choose Publish. The server checks everything again." },
    { type: "paragraph", text: "A published problem appears in the library under Physcratic Arena, on a card marked Community." },
    { type: "siteLink", href: "/dashboard?view=problems&collection=authored", label: "Browse published community problems" },
    { type: "image", src: `${dir}/studio-library.webp`, alt: "The problem library showing the topic buttons and a single Community card titled Forces on a cart with an Open problem button.", width: 1280, height: 1000, caption: "A published problem in the library." },

    { type: "heading", level: 2, text: "More options" },
    { type: "paragraph", text: "More options, below the parts and inside each part, holds what most problems do not need: extra sections, PDFs, method tags such as Newton’s laws, your own rights wording, hints, tolerances, conditions on symbols and extra text, equations and pictures in the question or the worked solution. Everything you save there is published with the problem." },
  ],
};
