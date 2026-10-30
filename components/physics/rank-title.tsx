import { ratingTitle } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

export function RankTitle({ rating, className }: { rating: number; className?: string }) {
  const title = ratingTitle(rating);
  return <span data-rank={title.toLowerCase()} className={cn("rank-title text-sm font-medium", className)}>{title}</span>;
}
