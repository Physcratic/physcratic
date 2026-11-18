"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function PreviewControls({ specimen }: { specimen: string }) {
  const [width, setWidth] = useState("full");
  const [theme, setTheme] = useState("light");
  const [version, setVersion] = useState(0);
  const src = `/workshop/preview/${specimen}?theme=${theme}`;
  return <section aria-labelledby="current-heading" className="space-y-4">
    <h2 id="current-heading" className="text-xl font-semibold">Current component preview</h2>
    <div className="flex flex-wrap items-end gap-4">
      <label className="flex flex-col gap-2 text-sm font-medium">Preview width<select className="min-h-11 rounded-md border border-input bg-background px-3" value={width} onChange={event => setWidth(event.target.value)}><option value="full">Available width</option><option value="390">Phone, 390px</option><option value="768">Tablet, 768px</option></select></label>
      <label className="flex flex-col gap-2 text-sm font-medium">Preview theme<select className="min-h-11 rounded-md border border-input bg-background px-3" value={theme} onChange={event => setTheme(event.target.value)}><option value="light">Light</option><option value="dark">Dark</option></select></label>
      <Button variant="outline" className="min-h-11" onClick={() => setVersion(current => current + 1)}>Reset preview</Button>
      <a href={src} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline underline-offset-4">Open preview in a new tab</a>
    </div>
    <p className="text-sm text-muted-foreground">The preview has its own viewport. Selected widths shrink to fit this screen. Open it in a new tab for a full-screen check.</p>
    <iframe key={`${src}-${version}`} src={src} title={`${specimen} component preview`} className="block h-[760px] max-w-full rounded-xl border bg-background" style={{ width: width === "full" ? "100%" : `${width}px` }} />
  </section>;
}
