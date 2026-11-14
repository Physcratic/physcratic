/**
 * The two guided tours. A step points at elements by `data-tour` name, never by class or text. It uses the first name
 * that is visible. Under 1024px a step can name its own `compact` targets and text, because the sidebar is a closed menu.
 * A step is never skipped silently: if nothing can be found, the card shows without a ring. tests/tour-targets.test.ts checks every name exists in the source.
 */
export type TourId = "welcome" | "studio";

export type TourStep = {
  id: string;
  /** `data-tour` names, in order of preference. */
  targets: string[];
  title: string;
  text: string;
  /** Under 1024px the sidebar is a closed menu. The step points at what is visible there instead, and says how to get to it. */
  compact?: { targets: string[]; text: string };
  /** Only show this step on a path that matches. The tour waits on other pages. */
  path?: RegExp;
  /** A button that replaces Next and takes the author somewhere. */
  go?: { label: string; href: string };
};

export type Tour = {
  id: TourId;
  name: string;
  /** Where the tour starts by itself on a first visit. */
  autoStart: RegExp;
  steps: TourStep[];
};

const onDashboard = /^\/dashboard\/?$/;
const onLobby = /^\/(?:dashboard\/?)?$/;
const onProblem = /^\/dashboard\/problems\//;

export const tours: Record<TourId, Tour> = {
  welcome: {
    id: "welcome",
    name: "Welcome to Physcratic",
    autoStart: onDashboard,
    steps: [
      {
        id: "library",
        targets: ["nav-problems", "nav-open"],
        title: "The library",
        text: "Every problem lives in the library. Open it to browse, search and filter.",
        compact: { targets: ["nav-open"], text: "Every problem lives in the library. Open the menu, then Problems, to browse, search and filter." },
      },
      {
        id: "topics",
        targets: ["nav-topics"],
        title: "Topics",
        text: "Pick a topic to see only those problems.",
        compact: { targets: ["nav-open"], text: "Open the menu and pick a topic under Explore to see only those problems." },
      },
      { id: "coaching", targets: ["nav-coaching"], title: "Coaching", text: "Want help from medallists? Coaching is up here." },
      {
        id: "settings",
        targets: ["nav-settings", "nav-open"],
        title: "Settings",
        text: "Your account lives in Settings. You can replay this tour there too.",
        compact: { targets: ["nav-open"], text: "Your account lives in Settings, at the bottom of the menu. You can replay this tour there too." },
      },
      {
        id: "open",
        targets: ["problem-card"],
        path: onLobby,
        title: "Open a problem",
        text: "Open a problem to start solving. Or I can open one for you, to show how solving works.",
        go: { label: "Open one for me", href: "/dashboard/problems/arena-mind-the-gap" },
      },
      { id: "answer", targets: ["answer-box"], path: onProblem, title: "Your answer", text: "Type your answer here. A [[/]] makes a fraction and a [[^]] makes a power, like on paper." },
      { id: "typing", targets: ["answer-box"], path: onProblem, title: "Type it like you say it", text: "Type sin and it turns into the function. Type [[\\]]theta and press Space to get θ." },
      { id: "palette", targets: ["answer-palette"], path: onProblem, title: "Symbols", text: "These buttons drop a symbol or a function in where your cursor is." },
      { id: "check", targets: ["check-button"], path: onProblem, title: "Check", text: "Press Check to see if you got it. A wrong answer is fine, you can try again." },
      { id: "help", targets: ["hint-button", "solution-tab"], path: onProblem, title: "Hints and solutions", text: "Stuck? Take a hint or open the worked solution, but try first." },
    ],
  },
  studio: {
    id: "studio",
    name: "Write your first problem",
    autoStart: /^\/dashboard\/author\/?$/,
    steps: [
      { id: "main", targets: ["studio-main"], title: "The main question", text: "Put the setup every part shares here, if you have one. You can add equations and an image too." },
      { id: "question", targets: ["studio-question"], title: "Part a", text: "Then type the first question, just like you would write it." },
      { id: "equation", targets: ["studio-equation"], title: "Equations", text: "Press Equation, or type [[$]], to drop a formula into your text. Click a formula to change it." },
      { id: "typing", targets: ["studio-equation"], title: "Type it like you say it", text: "Inside an equation, type sin and it turns into the function. Type [[\\]]theta and press Space to get θ." },
      { id: "picture", targets: ["studio-image"], title: "An image", text: "Got a diagram? Add an image here, or paste or drop one in." },
      { id: "solution", targets: ["studio-solution"], title: "The worked solution", text: "Write the steps that lead to the answer. Every problem needs one." },
      { id: "answer", targets: ["studio-answer"], title: "Final Answer (Solution)", text: "This is the answer we check students against. We find the symbols for you." },
      { id: "try", targets: ["studio-try"], title: "Answer preview", text: "Type an answer here to see what a student would get. Only you see this." },
      { id: "source", targets: ["studio-source"], title: "Where it's from", text: "Say if you wrote it or adapted it. If you adapted it, add the source." },
      { id: "difficulty", targets: ["studio-difficulty"], title: "Difficulty rating", text: "Type a whole number from 0 to 4,000, or pick a band to fill one in. Publish needs it." },
      { id: "publish", targets: ["studio-publish"], title: "Publish", text: "Happy with it? Tick the box above and press Publish." },
    ],
  },
};

export const tourIds = Object.keys(tours) as TourId[];
