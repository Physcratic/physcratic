export function formatContestCountdown(
  startsAt: string,
  now: number,
  durationMinutes: number,
) {
  const start = Date.parse(startsAt);
  if (!Number.isFinite(start)) return "Schedule to be announced";

  const remaining = start - now;
  if (remaining <= 0) {
    return now < start + durationMinutes * 60_000 ? "Live now" : "Ended";
  }
  if (remaining < 60_000) return "Under 1 minute";

  const [unit, amount] = remaining >= 86_400_000
    ? ["day", Math.floor(remaining / 86_400_000)]
    : remaining >= 3_600_000
      ? ["hour", Math.floor(remaining / 3_600_000)]
      : ["minute", Math.floor(remaining / 60_000)];

  return `In ${amount} ${unit}${amount === 1 ? "" : "s"}`;
}
