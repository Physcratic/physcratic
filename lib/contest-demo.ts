import { problems } from "@/lib/physics";

export type ContestStatus = "live" | "upcoming" | "past";

export interface DemoContest {
  id: string;
  name: string;
  tagline: string;
  description: string;
  status: ContestStatus;
  date: string;
  durationMinutes: number;
  participants: number;
  rated: boolean;
  problemIds: string[];
}

export const demoContests: DemoContest[] = [
  {
    id: "round-12",
    name: "Newton Round #12",
    tagline: "A little pressure. A lot of possibility.",
    description:
      "Five problems. One ticking clock. Put your physics intuition to the test alongside other curious minds.",
    status: "live",
    date: "Live demo round",
    durationMinutes: 90,
    participants: 186,
    rated: true,
    problemIds: ["incline", "circuit", "string", "projectile", "first-law"],
  },
  {
    id: "round-13",
    name: "Newton Round #13",
    tagline: "Fields of possibility",
    description:
      "A fresh set of problems across mechanics, electricity, waves, and heat. Open to every level.",
    status: "upcoming",
    date: "Nov 7, 2026 · 16:00 UTC",
    durationMinutes: 90,
    participants: 124,
    rated: true,
    problemIds: ["spring", "resistors", "wave", "heat", "gas"],
  },
  {
    id: "mechanics-sprint-5",
    name: "Mechanics Sprint #5",
    tagline: "Find your momentum",
    description:
      "A short, unrated round all about motion, forces, and energy. A good place to try your first contest.",
    status: "upcoming",
    date: "Nov 14, 2026 · 16:00 UTC",
    durationMinutes: 45,
    participants: 78,
    rated: false,
    problemIds: ["incline", "spring", "projectile"],
  },
  {
    id: "round-11",
    name: "Newton Round #11",
    tagline: "Making connections",
    description:
      "Revisit the problems from our last mixed-topic round and try to beat your own pace.",
    status: "past",
    date: "Oct 24, 2026 · 16:00 UTC",
    durationMinutes: 90,
    participants: 208,
    rated: true,
    problemIds: ["spring", "resistors", "echo", "gas", "projectile"],
  },
  {
    id: "mechanics-sprint-4",
    name: "Mechanics Sprint #4",
    tagline: "Moving in the right direction",
    description:
      "Three focused mechanics problems, from a first step to a satisfying challenge.",
    status: "past",
    date: "Oct 17, 2026 · 16:00 UTC",
    durationMinutes: 45,
    participants: 142,
    rated: false,
    problemIds: ["incline", "spring", "projectile"],
  },
  {
    id: "round-10",
    name: "Newton Round #10",
    tagline: "Energy, everywhere",
    description:
      "An archived round exploring the many ways that energy moves through our world.",
    status: "past",
    date: "Oct 10, 2026 · 16:00 UTC",
    durationMinutes: 90,
    participants: 192,
    rated: true,
    problemIds: ["power", "heat", "spring", "gas", "first-law"],
  },
];

export function getContestProblems(contest: DemoContest) {
  return contest.problemIds.map((id, index) => {
    const problem = problems.find((item) => item.id === id);
    if (!problem) throw new Error(`Unknown contest problem: ${id}`);
    return {
      ...problem,
      letter: String.fromCharCode(65 + index),
      points: (index + 1) * 100,
    };
  });
}

export const demoRatingHistory = [
  { date: "2026-07-04", rating: 1000, contest: "Starting rating" },
  { date: "2026-07-11", rating: 1042, contest: "Newton Round #1" },
  { date: "2026-07-25", rating: 1088, contest: "Newton Round #2" },
  { date: "2026-08-01", rating: 1064, contest: "Newton Round #3" },
  { date: "2026-08-08", rating: 1126, contest: "Newton Round #4" },
  { date: "2026-08-22", rating: 1154, contest: "Newton Round #5" },
  { date: "2026-08-29", rating: 1138, contest: "Newton Round #6" },
  { date: "2026-09-05", rating: 1186, contest: "Newton Round #7" },
  { date: "2026-09-19", rating: 1198, contest: "Newton Round #8" },
  { date: "2026-10-03", rating: 1236, contest: "Newton Round #9" },
  { date: "2026-10-10", rating: 1218, contest: "Newton Round #10" },
  { date: "2026-10-24", rating: 1284, contest: "Newton Round #11" },
];

export const demoProfile = {
  rating: 1284,
  rank: 247,
  totalPlayers: 1024,
  contests: 11,
};

export function ratingTitle(rating: number) {
  if (rating >= 2000) return "Master";
  if (rating >= 1600) return "Expert";
  if (rating >= 1200) return "Specialist";
  return "Explorer";
}

export const demoRankings = [
  { rank: 1, handle: "orbital", rating: 2316, change: 42, contests: 28 },
  { rank: 2, handle: "noether", rating: 2248, change: 36, contests: 24 },
  { rank: 3, handle: "fieldnotes", rating: 2172, change: -12, contests: 31 },
  { rank: 4, handle: "quantumleap", rating: 2084, change: 58, contests: 22 },
  { rank: 5, handle: "inertia", rating: 1986, change: 24, contests: 19 },
  { rank: 6, handle: "curious_mind", rating: 1928, change: -8, contests: 21 },
  { rank: 7, handle: "wavefunction", rating: 1864, change: 31, contests: 17 },
  {
    rank: 247,
    handle: "You",
    rating: demoProfile.rating,
    change: 66,
    contests: demoProfile.contests,
  },
];

export interface ContestStanding {
  handle: string;
  solved: number;
  points: number;
  penalty: number;
  isYou?: boolean;
}

export function sampleStandings(contest: DemoContest): ContestStanding[] {
  const items = getContestProblems(contest);
  return [
    "orbital",
    "noether",
    "fieldnotes",
    "inertia",
    "wavefunction",
    "curious_mind",
  ].map((handle, index) => {
    const solved = Math.max(1, items.length - Math.floor(index / 2));
    return {
      handle,
      solved,
      points: items
        .slice(0, solved)
        .reduce((total, problem) => total + problem.points, 0),
      penalty: 38 + index * 17,
    };
  });
}

export function sortStandings(rows: ContestStanding[]) {
  return [...rows].sort(
    (a, b) =>
      b.points - a.points ||
      a.penalty - b.penalty ||
      a.handle.localeCompare(b.handle),
  );
}

export function formatClock(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return [hours, minutes, Math.floor(seconds % 60)]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}
