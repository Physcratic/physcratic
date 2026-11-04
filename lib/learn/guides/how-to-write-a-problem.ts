import type { ArticleDraft } from "../types";

const dir = "/learn/how-to-write-a-problem";

export const howToWriteAProblem: ArticleDraft = {
  kind: "product",
  slug: "how-to-write-a-problem",
  title: "How to write a problem in Problem Studio",
  description: "Write a physics problem in Problem Studio, add answer keys, choose tags, preview it as a student, publish it and see where students find it.",
  updated: "2026-11-04",
  reviewedBy: null,
  sources: [],
  published: true,
  body: [
    { type: "heading", level: 2, text: "Open Problem Studio" },
    { type: "paragraph", text: "Sign in with an email-verified account and choose Problem Studio in the sidebar. There is no separate staff invitation requirement. You can edit only your own problems. The draft list has New problem, Open and Delete. The How it works link at the top of Problem Studio opens this guide." },
    { type: "siteLink", href: "/dashboard/author", label: "Open Problem Studio", note: "You need to be signed in with a verified email." },

    { type: "heading", level: 2, text: "Find your way around the editor" },
    { type: "paragraph", text: "The editor has five numbered step cards: Statement, Parts and answers, Tags, Images and PDFs, and Publish. The Steps list on the right jumps to each card. Write and Student preview switch between editing and the student view." },
    { type: "paragraph", text: "The status bar under the title shows the state, such as Draft version 2. It also shows whether your changes are saved. It says Ready to publish, or how many checks are left." },
    { type: "image", src: `${dir}/studio-editor.webp`, alt: "The Problem Studio editor with the status bar showing Draft version 2, All changes saved and Ready to publish, and the Statement card open beside the Steps list.", width: 1280, height: 1000, caption: "The status bar, the Write and Student preview buttons, and the Steps list." },

    { type: "heading", level: 2, text: "Step 1: Statement" },
    { type: "paragraph", text: "Type a Problem title. The estimated difficulty is optional. It is an author estimate, not an Elo rating. Put the setup shared by every part in Common context. Add text blocks, equation blocks and inline equations. Equations use LaTeX and show a preview. State the units and your assumptions. Do not rely on an image alone." },

    { type: "heading", level: 2, text: "Step 2: Parts and answers" },
    { type: "paragraph", text: "Add a section for each group of questions, then add parts to it. Give each part a short label such as a, b or c, and write its statement. Each part gets its own colour: blue, violet, teal, amber, rose and green, then the colours repeat. The colour shows as a left border and a label chip, and the letter is always written out. Colours start again in each section. Students see the same colour on the statement, the answer box and the worked solution." },
    { type: "paragraph", text: "Open Answer key, hints and solution on each part. This content is private and never appears in the student preview. Choose an answer type." },
    { type: "list", items: [
      "Numeric with units. Set Expected value, Absolute tolerance, Relative tolerance and Units. For an expected 10 N, set Absolute tolerance to 0.05 and Relative tolerance to 0.01. The larger allowance is 0.1 N, so 10.08 N is accepted. Units are not converted.",
      "Expression. Use calculator notation such as x^2+2*x+1 and declare the variables. The checker handles a limited set of identities. Other answers can come back as Needs review.",
      "Manual / ungraded. Use it for open reasoning. Answers are saved without a correctness decision.",
    ] },
    { type: "paragraph", text: "Add Hints and a Worked solution in the same panel. Saving them does not show them to students." },
    { type: "image", src: `${dir}/studio-parts.webp`, alt: "The answer key panel of part a, with Numeric with units chosen and fields for Expected value, Absolute tolerance, Relative tolerance and Units, above the Hints and Worked solution sections.", width: 1280, height: 1000, caption: "The private answer key, hints and worked solution of one part." },

    { type: "heading", level: 2, text: "Step 3: Tags" },
    { type: "paragraph", text: "Choose Topics and Methods from the lists the library uses. For a cart on a track, choose Mechanics and Newton’s laws. The pickers are searchable, and the methods for your chosen topics come first. If the pickers show a Feedback link, use it to ask for a missing tag." },

    { type: "heading", level: 2, text: "Step 4: Images and PDFs" },
    { type: "paragraph", text: "Upload PNG, JPEG or WebP diagrams up to 3 MiB. Write alt text for every image. Statement PDFs are optional, and a solution PDF must stay private. Wait for an upload to finish, then let the draft save." },

    { type: "heading", level: 2, text: "Preview and save" },
    { type: "paragraph", text: "Autosave runs after a short pause. Wait for All changes saved, or choose Save now. Student preview shows the public statement with the same coloured parts. It includes unsaved edits, so check the status bar as well." },
    { type: "image", src: `${dir}/studio-preview.webp`, alt: "The Student preview of Forces on a cart, with parts a, b and c shown with blue, violet and teal left borders and matching letter chips.", width: 1280, height: 1000, caption: "Student preview. The answer keys are not included." },

    { type: "heading", level: 2, text: "Step 5: Publish" },
    { type: "paragraph", text: "Choose My original work or Used with permission. Write a Rights declaration. If you used permission, add a Source / permission reference. Work through any publication checks, then choose Publish problem. The server checks everything again. Open student problem room shows what students see." },

    { type: "heading", level: 2, text: "What students see" },
    { type: "paragraph", text: "A published problem appears in the library under Physcratic Arena, on a card marked Community. It follows the problems written by Physcratic. A separate view lists only published community problems." },
    { type: "siteLink", href: "/dashboard?view=problems&collection=authored", label: "Browse published community problems" },
    { type: "image", src: `${dir}/studio-library.webp`, alt: "The problem library showing the topic buttons and a single Community card titled Forces on a cart with an Open problem button.", width: 1280, height: 1000, caption: "A published problem in the library." },
    { type: "paragraph", text: "Students open the card and read the statement, with each part in its colour. They answer on the same page. Reading is public. Saving an answer needs a signed-in account with a verified email. Each result is saved with an attempt number and says Correct, Incorrect, Needs review or Ungraded. Try again starts a new attempt." },
    { type: "paragraph", text: "Worked solutions stay private until you approve them. After publishing, use Student worked-solution access, choose a part and confirm. Once a student opens a solution, their later attempts on that revision count as assisted." },

    { type: "heading", level: 2, text: "Change or unpublish" },
    { type: "paragraph", text: "Editing the draft does not change the public problem. Choose Publish new revision when you are ready. Old attempts keep the revision they used. In the Danger zone, Unpublish problem stops public reading and keeps the history." },
    { type: "guideLink", slug: "how-to-use-physcratic", label: "How to use Physcratic", note: "See the student side of solving a problem." },
  ],
};
