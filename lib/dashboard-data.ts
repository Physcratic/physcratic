export interface PublishedContest {
  id: string;
  name: string;
  description: string;
  startsAt: string;
  durationMinutes: number;
  rated: boolean;
  registrationOpen: boolean;
  problemIds: string[];
  creators: string[];
  participants: number;
  registered: boolean;
  interactive?: boolean;
}

export interface RatingPoint {
  rating: number;
  change: number;
  createdAt: string;
  contestName: string;
}

export interface DashboardData {
  user: { name: string } | null;
  savedAttempts: number;
  practiceAttempts: number;
  solvedProblems: number;
  archiveReviewed: number;
  ratings: RatingPoint[];
  contests: PublishedContest[];
}

export interface PublicRanking {
  handle: string;
  rating: number;
  change: number;
  contests: number;
  updatedAt: string;
}

export function ratingTitle(rating: number) {
  if (rating >= 2000) return "Master";
  if (rating >= 1600) return "Expert";
  if (rating >= 1200) return "Specialist";
  return "Explorer";
}

export function risingStreak(changes: readonly number[]) {
  let streak = 0;
  for (
    let index = changes.length - 1;
    index >= 0 && changes[index] > 0;
    index--
  )
    streak++;
  return streak;
}

export function contestStatus(
  contest: Pick<PublishedContest, "startsAt" | "durationMinutes">,
  now = Date.now(),
) {
  const start = new Date(contest.startsAt).getTime();
  return now < start
    ? "upcoming"
    : now < start + contest.durationMinutes * 60_000
      ? "live"
      : "past";
}
