import { medallists, medalLabel, type Medallist } from "./medallists";
export const coachDirectoryDescription = "Browse Physcratic's physics coaches, compare their competition achievements, and explore Physics Olympiad coaching options.";

export const coachProfileHref = (slug: string) => `/coaching/coaches/${encodeURIComponent(slug)}`;
export const findCoach = (slug: string) => medallists.find(coach => coach.slug === slug);
export function coachProfileDescription(coach: Medallist) {
  const awards = coach.achievements.map(item => `${item.contest} ${item.year} ${medalLabel[item.medal]}`).join(", ");
  return `${coach.name}, physics coach from ${coach.country}. ${awards}. See competition achievements and coaching options.`;
}
