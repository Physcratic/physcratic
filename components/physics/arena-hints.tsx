"use client";

import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MathText } from "./arena-document";

/** Three hints for each lettered part of an Arena problem, shown one at a time. Nothing is shown until asked for. */
export function ArenaHints({ hints }: { hints: Record<string, string[]> }) {
  const [shown, setShown] = useState<Record<string, number>>({});
  const parts = Object.keys(hints).sort();
  if (!parts.length) return null;
  return (
    <Card id="arena-hints" tabIndex={-1} className="min-w-0 scroll-mt-24 shadow-none">
      <CardHeader>
        <CardTitle><h2>Hints</h2></CardTitle>
        <CardDescription>Each part has three hints. Each one says a little more than the last.</CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-5">
        {parts.map((part) => {
          const total = hints[part].length;
          const count = Math.min(shown[part] ?? 0, total);
          return (
            <section key={part} aria-label={`Hints for part (${part})`} className="flex min-w-0 flex-col gap-3">
              <h3 className="text-base font-medium">Part ({part})</h3>
              <ol role="list" aria-live="polite" className="flex min-w-0 list-none flex-col gap-3">
                {hints[part].slice(0, count).map((hint, index) => (
                  <li key={index} className="rounded-lg border border-border bg-muted/50 p-4 text-base leading-relaxed text-foreground">
                    <span className="font-medium">Hint {index + 1}. </span>
                    <MathText text={hint} />
                  </li>
                ))}
              </ol>
              {count < total && (
                <Button type="button" variant="outline" className="min-h-11 w-fit bg-background" onClick={() => setShown((current) => ({ ...current, [part]: count + 1 }))}>
                  <Lightbulb data-icon="inline-start" />
                  Show hint {count + 1} of {total} for part ({part})
                </Button>
              )}
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
}
