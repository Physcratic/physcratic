"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { formatContestCountdown } from "@/lib/contest-countdown";

export function ContestCountdown({
  startsAt,
  durationMinutes,
}: {
  startsAt: string;
  durationMinutes: number;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <Badge variant="outline">
      <time dateTime={startsAt} title={startsAt}>
        {now === null ? "…" : formatContestCountdown(startsAt, now, durationMinutes)}
      </time>
    </Badge>
  );
}
