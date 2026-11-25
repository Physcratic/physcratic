import "server-only";
import arena from "./arena/index.json";
import { catalogProblems } from "./corpus-catalog";
import { physicsTopics } from "./physics-taxonomy";
import { publishedArticles } from "./learn/articles";
import { medallists } from "./coaching/medallists";
import { coachProfileHref } from "./coaching/coach-profile";
import { searchSite, type SearchEntry } from "./site-search-ranking";

// Public metadata only. Never import sessions, private content or database bindings here.
const pages: SearchEntry[] = [
  { title: "Lobby", href: "/", kind: "Page", description: "Home, topics and recommended practice", keywords: "homepage dashboard" },
  { title: "Problems", href: "/problems", kind: "Page", description: "Browse and filter physics problems", keywords: "library practice" },
  { title: "Physcratic Arena", href: "/dashboard?view=problems&collection=arena", kind: "Page", description: "Original physics problems and community practice" },
  { title: "Olympiad Archive", href: "/problems/archive", kind: "Page", description: "Past IPhO, APhO and EuPhO problems" },
  { title: "Guides", href: "/learn", kind: "Page", description: "Preparation advice and learning resources", keywords: "learn tutorials books" },
  { title: "Coaching", href: "/coaching", kind: "Page", description: "Physics classes and medallist coaches", keywords: "tutors lessons" },
  { title: "Contests", href: "/dashboard?view=contests", kind: "Page", description: "Upcoming and past contests", keywords: "competition rounds" },
  { title: "Rankings", href: "/dashboard?view=rankings", kind: "Page", description: "Contest ratings and standings", keywords: "leaderboard elo" },
  { title: "Problem Studio", href: "/dashboard/author", kind: "Page", description: "Write and publish a problem. Sign in required.", keywords: "create author editor drafts" },
  { title: "Settings", href: "/settings", kind: "Page", description: "Account, profile and appearance", keywords: "dark mode theme password" },
  { title: "My Attempts", href: "/dashboard/submissions", kind: "Page", description: "Open your private submission history. Sign in required." },
  { title: "Sign In", href: "/sign-in", kind: "Page", description: "Access your account", keywords: "login" },
  { title: "Terms of Service", href: "/terms", kind: "Page", description: "Account requirements and service terms", keywords: "privacy rules" },
];
const entries: SearchEntry[] = [
  ...pages,
  ...physicsTopics.map(topic => ({ title: topic.label, href: `/problems/topics/${topic.id}`, kind: "Topic", description: `Browse ${topic.label.toLowerCase()} problems`, keywords: topic.aliases.join(" ") })),
  ...arena.problems.map(problem => ({ title: problem.title, href: `/dashboard/problems/${problem.id}`, kind: "Arena Problem", description: problem.summary, keywords: [problem.topic, ...problem.tags].join(" ") })),
  ...catalogProblems.map(problem => ({ title: problem.title, href: `/dashboard/problems/${problem.id}`, kind: "Archive Problem", description: `${problem.competition} ${problem.year} ${problem.code}`, keywords: [...problem.topics, ...problem.tags, ...problem.searchAliases, problem.id].join(" ") })),
  ...publishedArticles.map(article => ({ title: article.title, href: `/learn/${article.slug}`, kind: "Guide", description: article.description })),
  ...medallists.map(coach => ({ title: coach.name, href: coachProfileHref(coach.slug), kind: "Coach", description: `Physics coach from ${coach.country}`, keywords: coach.achievements.map(item => `${item.contest} ${item.year} ${item.medal}`).join(" ") })),
];
export const siteSearch = (query: string) => searchSite(entries, query);
