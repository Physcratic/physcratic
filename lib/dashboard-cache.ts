import { z } from "zod";
import type { DashboardData } from "./dashboard-data";

const count = z.number().int().nonnegative();
const dashboardSchema = z.object({
  user: z.object({ name: z.string().max(200) }).nullable(),
  savedAttempts: count, practiceAttempts: count.nullable(), solvedProblems: count.nullable(), archiveReviewed: count,
  practiceProgressAvailable: z.boolean().optional(), inProgressProblems: count.nullable().optional(),
  legacyPracticeAttempts: count.optional(), legacySolvedProblems: count.optional(),
  ratings: z.array(z.object({ rating: z.number().finite(), change: z.number().finite(), createdAt: z.string().max(64), contestName: z.string().max(500) })).max(2000),
  contests: z.array(z.object({ id: z.string().max(200), name: z.string().max(500), description: z.string().max(10000), startsAt: z.string().max(64), durationMinutes: z.number().nonnegative(), rated: z.boolean(), registrationOpen: z.boolean(), problemIds: z.array(z.string().max(200)).max(1000), creators: z.array(z.string().max(200)).max(100), participants: count, registered: z.boolean(), interactive: z.boolean().optional() })).max(200),
});
const envelope = z.object({ account: z.string(), savedAt: z.number().finite(), data: dashboardSchema });
export const DASHBOARD_CACHE_TTL = 10 * 60_000;
const prefix = "physcratic.dashboard.v1.";
const limit = 256_000;
type CacheStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const key = (account: string) => prefix + encodeURIComponent(account);
/** Only call after the current session has resolved. Never guess an account from storage. */
export function readDashboardCache(account: string, storage?: CacheStorage, now = Date.now()): DashboardData | undefined {
  try {
    const target = storage ?? window.sessionStorage;
    const raw = target.getItem(key(account));
    if (!raw) return undefined;
    if (raw.length > limit) { target.removeItem(key(account)); return undefined; }
    const parsed = envelope.safeParse(JSON.parse(raw));
    if (!parsed.success || parsed.data.account !== account || parsed.data.savedAt > now || now - parsed.data.savedAt >= DASHBOARD_CACHE_TTL) {
      target.removeItem(key(account)); return undefined;
    }
    return parsed.data.data;
  } catch { return undefined; }
}
/** Cache only validated display data for this tab. Never persist session credentials or answers. */
export function writeDashboardCache(account: string, data: DashboardData, storage?: CacheStorage, now = Date.now()) {
  try {
    const parsed = dashboardSchema.safeParse(data);
    if (!parsed.success) return;
    const raw = JSON.stringify({ account, savedAt: now, data: parsed.data });
    if (raw.length <= limit) (storage ?? window.sessionStorage).setItem(key(account), raw);
  } catch { /* Restricted storage must not prevent normal API reads. */ }
}
