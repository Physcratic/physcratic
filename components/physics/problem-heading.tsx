import React, { type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { bandForEstimate, describeEstimate } from "@/lib/rating-bands";
export function ProblemHeading({ id, title, source, estimate, tags = [], children }: { id?: string; title: string; source: string; estimate?: string | null; tags?: readonly string[]; children?: ReactNode }) {
  const label = describeEstimate(estimate);
  const band = bandForEstimate(estimate);
  return <header className="flex min-w-0 max-w-full flex-col gap-3">
    <div className="flex min-w-0 flex-wrap gap-2"><Badge variant="concept">{source}</Badge>{label && <Badge variant={band?.variant ?? "outline"} className="max-w-full whitespace-normal break-words text-sm" aria-label={`Estimated difficulty: ${label}`}>{label}</Badge>}</div>
    <h1 id={id} className="text-balance text-2xl font-medium tracking-tight [overflow-wrap:anywhere] sm:text-3xl">{title}</h1>
    {tags.length > 0 && <div className="flex min-w-0 flex-wrap gap-2" aria-label="Problem tags">{[...new Set(tags)].map(tag => <Badge key={tag} variant="secondary" className="max-w-full whitespace-normal break-words">{tag}</Badge>)}</div>}
    {children}
  </header>;
}
