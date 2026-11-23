import { CircleCheck, CircleDashed, CircleDot } from "lucide-react";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type ProgressStatus = "solved" | "in-progress" | "not-graded";

/**
 * What each progress list looks like. The status is always in words (the title), and the icon and the colour only add to it.
 * Green is solved, peach is in progress and grey is not graded. Red is left for something wrong.
 */
export const progressStatus: Record<ProgressStatus, { title: string; description: string; Icon: typeof CircleCheck; header: string; ink: string; badge: string }> = {
  solved: { title: "Solved correctly", description: "All required checkable parts have been correct on this version.", Icon: CircleCheck, header: "bg-success-tint", ink: "text-success-ink", badge: "bg-success text-success-foreground" },
  "in-progress": { title: "Not yet solved", description: "Some required parts still need a correct check.", Icon: CircleDot, header: "bg-progress-tint", ink: "text-progress-ink", badge: "bg-progress text-progress-foreground" },
  "not-graded": { title: "Not graded", description: "Saved checks are invalid, inconclusive or for self-review.", Icon: CircleDashed, header: "bg-idle-tint", ink: "text-idle-ink", badge: "bg-idle text-idle-foreground" },
};

/** A tinted card header: an icon, the title in words and the count in a coloured badge. The heading reads "Solved correctly 3". */
export function ProgressCardHeader({ status, count }: { status: ProgressStatus; count: number }) {
  const { title, description, Icon, header, ink, badge } = progressStatus[status];
  return (
    <CardHeader className={`rounded-t-[calc(var(--radius)-1px)] ${header}`}>
      <CardTitle>
        <h2 className="text-base font-semibold">
          <Icon aria-hidden="true" className={`mr-2 inline size-5 align-text-bottom ${ink}`} />
          {title}{" "}
          <span className={`inline-flex min-h-6 min-w-6 items-center justify-center rounded-full px-2 text-sm font-semibold ${badge}`}>{count}</span>
        </h2>
      </CardTitle>
      <CardDescription className="text-foreground">{description}</CardDescription>
    </CardHeader>
  );
}

const week = 7 * 24 * 60 * 60 * 1000;
/** How many of the saved problems were last checked in the 7 days before `now`. It only uses the dates the page already loaded. */
export function checkedInLastWeek(entries: readonly { lastCheckedAt: string }[], now: number): number {
  return entries.filter((entry) => { const at = Date.parse(entry.lastCheckedAt); return Number.isFinite(at) && at <= now && now - at <= week; }).length;
}

/** The one big number, the solved count, with its word. The recent line shows only when there is something to say. */
export function SolvedSummary({ solved, recent }: { solved: number; recent: number }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-success bg-success-tint p-4 sm:p-6">
      <CircleCheck aria-hidden="true" className="size-8 shrink-0 text-success-ink" />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-foreground">
          <span className="text-5xl font-semibold leading-none text-success-ink">{solved}</span>{" "}
          <span className="text-lg font-medium">solved</span>
        </p>
        {recent > 0 && <p className="text-sm text-foreground">{recent} checked in the last 7 days</p>}
      </div>
    </div>
  );
}

/** A thin bar for the required parts already correct. The words beside it say the same, so it is decoration. */
export function PartsMeter({ done, total }: { done: number; total: number }) {
  if (total <= 0) return null;
  const percent = Math.max(0, Math.min(100, Math.round((done / total) * 100)));
  return (
    <span aria-hidden="true" className="block h-2 w-full overflow-hidden rounded-full bg-progress-tint">
      <span className="block h-full rounded-full bg-progress-ink" style={{ width: `${percent}%` }} />
    </span>
  );
}
