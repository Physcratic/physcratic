import { medallists as defaultMedallists, type Medallist } from "./medallists";
import type { CoachingPathway } from "./consultation";

/**
 * Every user-visible string on /coaching lives here (the pathway list and the form URL live in
 * consultation.ts). Components only render it. Counts and class numbers are computed, never typed.
 * Copy rules: no em dashes, no en dashes, no semicolons. Time ranges read "15:00 to 17:00".
 */

export const maxStudents = 6;
export const classHours = 2;

export const definition = `Physcratic Coaching is an online Physics Olympiad coaching program where students train in live classes of up to ${maxStudents} with IPhO, APhO and EuPhO medallists.`;

const hour = (h: number) => `${String(h).padStart(2, "0")}:00`;
const timeRange = (from: number, to: number) => `${hour(from)} to ${hour(to)}`;

type FaqItem = { question: string; answer: string; link?: { label: string; href: string } };

export const coachAnchorId = (slug: string) => `coach-${slug}`;
export const coachImageAlt = (name: string, country: string) => `${name}, physics coach from ${country}`;
export const programHref = (pathway: CoachingPathway) => `/coaching?goal=${encodeURIComponent(pathway)}#hero-cta`;

export function buildCoachingContent(list: readonly Medallist[]) {
  const coachCount = list.length;
  const countryCount = new Set(list.map((m) => m.country)).size;
  const counts = `${coachCount} coaches from ${countryCount} countries`;

  const schedule = {
    axisStart: 12,
    axisEnd: 18,
    students: [
      { label: "Student A", from: 13, to: 17 },
      { label: "Student B", from: 15, to: 18 },
      { label: "Student C", from: 15, to: 17 },
    ],
    overlap: { label: "Overlap", from: 15, to: 17 },
  };
  const studentSentence = schedule.students.map((s) => `${s.label} is free ${timeRange(s.from, s.to)}`).join(", ");

  const sessions = { intensive: 16, mastery: 32 };

  return {
    meta: {
      title: "Physics Olympiad coaching from IPhO, APhO and EuPhO medallists",
      description: definition,
    },
    ui: {
      skipLink: "Skip to coaching content",
      brand: "Physcratic Coaching",
      homeLabel: "Physcratic Coaching home",
      menu: "Menu",
      desktopNavLabel: "Coaching navigation",
      mobileNavLabel: "Mobile coaching navigation",
      consultationCta: "Get a consultation",
    },
    nav: [
      { href: "#programs", label: "Programs" },
      { href: "#tutors", label: "Coaches" },
      { href: "#how-it-works", label: "How it works" },
      { href: "#faq", label: "FAQ" },
      { href: "/dashboard", label: "Free practice" },
    ],
    hero: {
      titleMain: "Train with Physics Olympiad winners.",
      titleSub: "Live online classes taught by IPhO, APhO and EuPhO medallists",
      highlight: "IPhO, APhO and EuPhO medallists",
      intro: `Small online classes of up to ${maxStudents} students, taught live by olympiad medallists. Start from wherever you are now: your first provincial round, national selection, or IB and A-Level physics.`,
      facts: [
        { value: `${coachCount}`, label: "coaches" },
        { value: `${countryCount}`, label: "countries" },
        { value: `${maxStudents}`, label: "students max per class" },
        { value: `${classHours}`, label: "hours per live class" },
      ],
      factsLabel: "Coaching at a glance",
      legend: "Where are you right now?",
      pathwayHelp: {
        "Olympiad Beginner": "New to olympiad physics or building foundations",
        "Olympiad Intermediate": "Aiming for a provincial or national olympiad",
        "Olympiad Advanced": "National medallist, team selection, APhO, EuPhO or IPhO",
        "IB or A-Level": "School physics with more problem-solving",
        "Not sure yet": "We will help you find your level",
      } satisfies Record<CoachingPathway, string>,
      continueLabel: "Continue to the consultation form",
      note: "Opens our consultation form. An admin replies on WhatsApp within 2 business days.",
      slideshowLabel: "Featured Physcratic coaches",
      slideshowPause: "Pause coach slideshow",
      slideshowPlay: "Play coach slideshow",
      seeAll: `See all ${coachCount} coaches`,
    },
    coaches: {
      title: "Meet your coaches",
      text: `${counts}. Every one of them won a medal or an honourable mention at IPhO, APhO or EuPhO. We pick your coach by level, goals and language, so a beginner usually works with someone who is great at explaining the basics.`,
      coachesLabel: "Coaches",
      countriesLabel: "Countries",
      coachCount,
      countryCount,
      galleryLabel: "Coach slideshow, hover or focus to pause",
      listLabel: "Physcratic coaches",
      highlight: "IPhO, APhO or EuPhO",
      pause: "Pause coach slider",
      play: "Play coach slider",
      previous: "Previous coaches",
      next: "Next coaches",
      seeAll: `See all ${coachCount} coaches`,
      backToSlider: "Back to the slider",
    },
    programs: {
      title: "Programs for every stage",
      intro: "Three levels take you from your first olympiad to IPhO.",
      highlight: "from your first olympiad to IPhO",
      note: "Everyone in a class is at roughly the same level, so nobody gets lost and nobody gets bored.",
      ladderLabel: "Olympiad levels",
      trackLabel: "Different track",
      forLabel: "For",
      coversLabel: "Covers",
      goalLabel: "Goal",
      linkLabel: "Ask about this program",
      items: [
        {
          title: "Olympiad Beginner",
          pathway: "Olympiad Beginner" as CoachingPathway,
          for: "Students new to olympiad physics, or preparing for the first rounds.",
          covers: ["Fundamental mechanics", "The maths tools physics needs", "Basic thermodynamics", "Introductory electricity and magnetism", "Strong problem-solving habits"],
          goal: "Get from school physics to solving olympiad problems on your own.",
        },
        {
          title: "Olympiad Intermediate",
          pathway: "Olympiad Intermediate" as CoachingPathway,
          for: "Students with some olympiad experience who are aiming for provincial or national olympiads.",
          covers: ["Harder mechanics", "Rotational dynamics", "Orbital mechanics", "Electromagnetism", "Thermodynamics", "Waves and optics", "Steadily harder national problems"],
          goal: "Compete strongly at national level.",
        },
        {
          title: "Olympiad Advanced",
          pathway: "Olympiad Advanced" as CoachingPathway,
          for: "National medallists and students preparing for national team selection, APhO, EuPhO or IPhO.",
          covers: ["Long multi-step problems", "Deeper theory", "Tricks that don't show up in textbooks", "International selection problems", "Problems that mix several topics", "IPhO and APhO difficulty"],
          goal: "Be ready for team selection and the international rounds.",
        },
        {
          title: "IB and A-Level",
          pathway: "IB or A-Level" as CoachingPathway,
          for: "IB Physics and A-Level Physics students.",
          covers: ["Your syllabus", "Taught by people who learned physics for olympiads", "Why things work, not memorised mark schemes"],
          goal: "Top grades, and a strong base if you want to try olympiads later.",
        },
      ],
    },
    classFormat: {
      title: "How a class works",
      listLabel: "What a class includes",
      tilesLabel: "Class facts",
      tiles: [
        { value: `${maxStudents}`, label: "students at most" },
        { value: `${classHours} h`, label: "live, usually weekly" },
        { value: "Every class", label: "recorded" },
        { value: "Notes", label: "homework and worked solutions" },
      ],
      points: [
        "A coach matched to your level and preferred language",
        "Mostly solving olympiad problems together",
        "Classmates from different countries",
      ],
      stretchTitle: "Train slightly above your level",
      highlight: "selection rounds",
      stretchText: "If you are preparing for your national olympiad, we won't just drill its past papers. You will also see problems adapted from selection rounds in China, Russia, the United States, India, Indonesia, Singapore and Europe, and from APhO and IPhO. After a few months of those, your own competition paper tends to feel a lot friendlier.",
      sourcesLabel: "Where the problems come from",
      sources: ["China", "Russia", "United States", "India", "Indonesia", "Singapore", "Europe", "APhO", "IPhO"],
      topicsLabel: "Topics",
      topics: ["Mechanics", "Rotational dynamics", "Orbital mechanics and gravitation", "Electricity and magnetism", "Thermodynamics", "Oscillations", "Waves", "Optics", "Modern physics", "Special relativity"],
      topicsNote: "The order adapts to your strengths, weak spots and competition date.",
    },
    scheduling: {
      title: "No fixed timetable",
      text: `During the consultation, tell us when you are usually free, with your time zone. We look for up to ${maxStudents - 1} other students whose free time overlaps with yours, at a similar level and with a compatible language. Then we set the class at a time that suits everyone.`,
      highlight: "overlaps with yours",
      axisLabel: "Wednesday, GMT",
      schedule,
      ticks: Array.from({ length: schedule.axisEnd - schedule.axisStart + 1 }, (_, i) => schedule.axisStart + i).map(hour),
      ranges: {
        students: schedule.students.map((s) => timeRange(s.from, s.to)),
        overlap: timeRange(schedule.overlap.from, schedule.overlap.to),
      },
      caption: `Class time: Wednesday, ${timeRange(schedule.overlap.from, schedule.overlap.to)} GMT.`,
      description: `Example on a Wednesday in GMT. ${studentSentence}. The class runs when everyone overlaps, ${timeRange(schedule.overlap.from, schedule.overlap.to)}.`,
      note: "If we cannot match you straight away, we wait for compatible students or suggest another arrangement.",
    },
    packages: {
      title: "Two ways to train",
      bestForLabel: "Best for",
      items: [
        {
          title: "Intensive",
          size: `${sessions.intensive} sessions, ${sessions.intensive * classHours} hours`,
          text: "The main olympiad areas from intermediate to harder problems, at a fast pace: mechanics, orbital mechanics, electromagnetism, thermodynamics, waves, optics, modern physics and relativity.",
          bestFor: "You want to cover a lot quickly and can keep up with weekly homework.",
        },
        {
          title: "Mastery",
          size: `${sessions.mastery} sessions, ${sessions.mastery * classHours} hours`,
          text: "The same areas in far more depth: careful derivations, mathematical technique, many problem styles, revisiting weak spots and moving into much harder questions.",
          bestFor: "You want to go deep and have time before your target competition.",
        },
      ],
      pricingTitle: "Priced for your country.",
      pricingText: "Prices follow local tutoring rates and purchasing power, so they differ between countries. Package options can also vary by country.",
      highlight: "local tutoring rates",
      cta: "Ask for your local price",
    },
    path: {
      title: "How to get started",
      stepLabel: "Step",
      steps: [
        { title: "Tell us about you", body: "Fill in the short consultation form: who you are, your country, your level and the languages you are comfortable with." },
        { title: "Find your level", body: "An admin contacts you on WhatsApp, or another channel you prefer, to talk about the competitions you have done, what you are aiming for and when you are free. This happens within 2 business days." },
        { title: "Get matched", body: "We recommend a program and package with your local price, then match your class, coach and time." },
        { title: "Start training", body: "Live classes begin, with recordings, notes, homework and solutions." },
      ],
      startLabel: "Start step 1",
      coachesLabel: "Meet the coaches",
    },
    reviews: {
      title: "What our students say",
      quote: "Honestly, the best tutor ever! I genuinely don't think I would've made it this far if I hadn't met Arrow. Your explanations are always so clear and easy to understand, and you always give me feedback that helps me improve. I've grown so much throughout my training with you. Thank you so much, Arrow, for being my tutor! I'm really grateful I got the chance to learn from you. ❤️",
      linkText: "Arrow",
      linkSlug: "arrow-kristian",
      name: "Raffa",
      medal: "Best Theory and Gold medal",
      achievement: "Indonesian National Science Olympiad (OSN)",
      programs: "Took Beginner and Intermediate, now in Advanced",
      note: "We add reviews as each cohort finishes, always with the student's permission.",
    },
    glance: {
      title: "Physcratic Coaching at a glance",
      items: [
        { term: "Format", detail: "Live online classes" },
        { term: "Class size", detail: `Up to ${maxStudents} students` },
        { term: "Length", detail: `${classHours} hours, usually weekly` },
        { term: "Coaches", detail: `${coachCount} IPhO, APhO and EuPhO medallists and honourable mentions from ${countryCount} countries` },
        { term: "Levels", detail: "Olympiad Beginner, Intermediate and Advanced, plus IB and A-Level" },
        { term: "Packages", detail: `Intensive (${sessions.intensive} sessions) and Mastery (${sessions.mastery} sessions)` },
        { term: "Price", detail: "Set per country" },
        { term: "Languages", detail: "Mainly English, plus other languages when enough students share one" },
      ],
    },
    faq: {
      title: "Frequently asked questions",
      items: <FaqItem[]>[
        { question: "What is Physcratic Coaching?", answer: `${definition} It is run by Physcratic, the free physics olympiad practice platform at physcratic.com.` },
        { question: "Who are the coaches?", answer: `Every Physcratic Coaching coach won a medal or an honourable mention at the International Physics Olympiad (IPhO), the Asian Physics Olympiad (APhO) or the European Physics Olympiad (EuPhO). There are ${counts}.` },
        { question: "How many students are in a class?", answer: `Up to ${maxStudents} students with a similar level and goals. Small enough that the coach knows how each of you thinks.` },
        { question: "How does scheduling work?", answer: `There is no fixed timetable. You tell us when you are usually free, with your time zone, and we form a class with up to ${maxStudents - 1} other students whose free time overlaps with yours.` },
        { question: "Which level should I choose?", answer: "Choose Beginner if you are new to olympiad physics, Intermediate if you are aiming for a provincial or national olympiad, and Advanced if you are a national medallist or preparing for team selection, APhO, EuPhO or IPhO. If you are not sure, choose Not sure yet and we will recommend a level after a short chat." },
        { question: "Do you teach IB and A-Level physics?", answer: "Yes. The IB and A-Level program follows your syllabus but teaches it with olympiad-style depth and problem-solving." },
        { question: "How much does Physcratic Coaching cost?", answer: "Prices are set per country, based on local tutoring rates and purchasing power. Fill in the consultation form and we will tell you the price for your country, together with the package options." },
        { question: "Do you guarantee a medal or selection?", answer: "No, and be careful with anyone who does. What we can promise is hard, well-chosen practice slightly above your current level." },
        { question: "What do I get besides the live class?", answer: "A recording of every class, lesson notes, homework problem sets and worked solutions where appropriate." },
        { question: "Which languages are classes taught in?", answer: "Classes are taught mainly in English. Other languages open when enough students share one, so the consultation form asks which languages you are comfortable with." },
        { question: "Can I get one-to-one classes?", answer: "The standard format is a small group. If you need a private arrangement, mention it when our admin contacts you and we will see what is possible." },
        { question: "Can parents send the inquiry?", answer: "Yes. Choose Parent in the form and we will keep you in the loop." },
        { question: "Is Physcratic free?", answer: "The practice platform is free: olympiad problems, contests and ratings at physcratic.com/dashboard. Our live classes are the paid part." },
        { question: "I am a medallist. Can I coach with Physcratic?", answer: "If you won a medal or an honourable mention at IPhO, APhO or EuPhO, you can apply through our application page. You can also send us a message on Instagram (@physcratic).", link: { label: "Tutor with Physcratic", href: "/coaching/become-a-tutor" } },
      ],
    },
    finalCta: {
      title: "Find your level",
      text: "Tell us where you are now. We will recommend a program and find your class.",
      primary: "Get a consultation",
      secondary: "Try free practice problems",
    },
    consultationPage: {
      meta: {
        title: "Get a coaching consultation",
        description: "Tell Physcratic Coaching your level and goals in a short form. An admin replies on WhatsApp within 2 business days, then we recommend a program and find your class.",
      },
      title: "Get a consultation",
      intro: "Tell us where you are now, what you are aiming for and when you are free. We will recommend a program and find your class.",
      note: "Opens our consultation form. An admin replies on WhatsApp within 2 business days.",
      button: "Continue to the consultation form",
      back: "Back to coaching",
    },
    tutorPage: {
      meta: {
        title: "Tutor with Physcratic",
        description: "Apply to tutor with Physcratic if you won a medal or an honourable mention at IPhO, APhO or EuPhO. Our team will review applications and reply.",
      },
      title: "Tutor with Physcratic",
      intro: "This page is for IPhO, APhO and EuPhO medallists who want to tutor with Physcratic. Apply with the short form.",
      note: "Our team will review applications and reply.",
      button: "Open the application form",
      back: "Back to coaching",
    },
    footer: {
      tagline: definition,
      navLabel: "Coaching footer",
      links: [
        { href: "/coaching/consultation", label: "Get a consultation" },
        { href: "/coaching/become-a-tutor", label: "Tutor with Physcratic" },
        { href: "/dashboard", label: "Free practice" },
        { href: "/terms", label: "Terms and privacy" },
      ],
      instagram: "Instagram",
    },
  };
}

export const content = buildCoachingContent(defaultMedallists);
export const coachCount = content.coaches.coachCount;
export const countryCount = content.coaches.countryCount;
