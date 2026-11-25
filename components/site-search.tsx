"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { SiteSearchResult } from "@/lib/site-search-ranking";

export function SiteSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [response, setResponse] = useState<{ key: string; results?: SiteSearchResult[]; error?: boolean }>();
  const list = useRef<HTMLDivElement>(null);
  const key = JSON.stringify([query, attempt]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault(); setOpen(value => !value);
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const result = await fetch(`/api/site-search?q=${encodeURIComponent(query)}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) });
        if (!result.ok) throw Error("Search unavailable");
        const body = await result.json() as { results: SiteSearchResult[] };
        if (!controller.signal.aborted) setResponse({ key, results: body.results });
      } catch { if (!controller.signal.aborted) setResponse({ key, error: true }); }
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [open, query, key]);
  const current = response?.key === key ? response : undefined;
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant="outline" className="h-11 w-40 justify-start gap-2 text-muted-foreground sm:w-56" aria-label="Search website" title="Search website (Ctrl+K)"><Search aria-hidden="true" /><span>Search</span></Button></DialogTrigger>
    <DialogContent className="top-[12vh] flex max-h-[76dvh] w-[calc(100%-2rem)] max-w-3xl translate-y-0 flex-col gap-0 overflow-hidden rounded-xl border-border bg-popover p-0 text-popover-foreground shadow-2xl [&>button]:right-2 [&>button]:top-2 [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center">
      <DialogHeader className="sr-only"><DialogTitle>Search Physcratic</DialogTitle><DialogDescription>Find pages, topics, problems, guides and coaches.</DialogDescription></DialogHeader>
      <label htmlFor="site-search-input" className="sr-only">Search website</label>
      <div className="flex items-center gap-3 border-b border-border pl-5 pr-16 has-[:focus-visible]:border-foreground">
      <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <Input id="site-search-input" type="search" className="h-14 rounded-none border-0 bg-transparent px-0 text-base shadow-none outline-none ring-0 ring-offset-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0" placeholder="Search problems, guides and coaches" maxLength={160} value={query} onChange={event => setQuery(event.target.value)} aria-controls="site-search-results" onKeyDown={event => { if (event.key === "ArrowDown") { event.preventDefault(); list.current?.querySelector<HTMLAnchorElement>("a")?.focus(); } }} />
      </div>
      <div id="site-search-results" ref={list} className="min-h-40 overflow-y-auto px-3 py-3" aria-busy={!current}>
        {!current ? <p role="status" className="p-4 text-sm text-muted-foreground">Searching.</p> : current.error ? <div className="space-y-3 p-4"><p role="alert">Search could not be loaded.</p><Button variant="outline" onClick={() => setAttempt(value => value + 1)}>Retry search</Button></div> : <>
          <p role="status" className="px-3 py-2 text-sm text-muted-foreground">{query.trim() ? `${current.results?.length ?? 0} results` : "Quick links"}</p>
          {current.results?.length ? <ul className="space-y-1">{current.results.map(result => <li key={result.href}>
            <a href={result.href} className="flex min-h-12 flex-col gap-1 rounded-lg p-3 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
              <span className="flex items-start justify-between gap-3"><span className="font-semibold">{result.title}</span><span className="shrink-0 text-xs text-muted-foreground">{result.kind}</span></span>
              <span className="text-sm text-muted-foreground">{result.description}</span>
            </a>
          </li>)}</ul> : <p className="p-4 text-sm text-muted-foreground">No matches. Try a shorter phrase, a topic or a competition year.</p>}
        </>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-5 py-3 text-xs text-muted-foreground">
        <span>Arrow down to results <kbd className="ml-2 rounded border px-1 py-0.5">Enter</kbd> to open <kbd className="ml-2 rounded border px-1 py-0.5">Esc</kbd> to close</span>
        <span>Physcratic</span>
      </div>
    </DialogContent>
  </Dialog>;
}
