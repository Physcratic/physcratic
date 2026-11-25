"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatementBlocks } from "./public-content";
import { AuthoredPdf } from "./statement-pdfs";
import { publicSolutionPath, publicSolutionSchema, type PublicSolution } from "@/lib/authored-public-solution-contracts";

export function PublicSolutionContent({ solution }: { solution: PublicSolution }) {
  const urls = Object.fromEntries(solution.media.map(m => [m.id, publicSolutionPath(solution.problemId, solution.revisionId, m.id)]));
  const hasSolution = solution.parts.some(p => p.solution.some(b => b.kind === "image" || (b.kind === "math" ? b.latex.trim() : b.spans.some(s => (s.kind === "text" ? s.text : s.latex).trim())))) || solution.media.some(m => m.purpose === "solution-pdf");
  return <section aria-label="Public worked solution" className="min-w-0 space-y-6 rounded-xl border bg-card p-5 sm:p-8">
    <h2 className="text-xl font-semibold">Worked Solution</h2>
    {!hasSolution && <p>No worked solution has been supplied for this revision.</p>}
    {solution.parts.map((part, i) => part.solution.length > 0 ? <section key={part.partId} className="min-w-0 space-y-3">
      <h3 className="font-semibold">Part {part.label || i + 1}</h3>
      <StatementBlocks problemId={solution.problemId} revisionId={solution.revisionId} blocks={part.solution} mediaUrls={urls} />
    </section> : null)}
    {solution.media.filter(m => m.purpose === "solution-pdf").map((m, i) => <AuthoredPdf key={m.id} url={urls[m.id]} label={`Solution PDF ${i + 1}`} />)}
  </section>;
}
export function PublicWorkedSolution({ problemId, revisionId, onStale, initialSolution }: { problemId: string; revisionId: string; onStale: () => void; initialSolution?: PublicSolution | null }) {
  const [solution, setSolution] = useState<PublicSolution | null>(initialSolution?.problemId === problemId && initialSolution.revisionId === revisionId ? initialSolution : null);
  const [error, setError] = useState(""), [retry, setRetry] = useState(0);
  useEffect(() => {
    const abort = new AbortController(); let alive = true;
    async function load() {
      try {
        const response = await fetch(publicSolutionPath(problemId, revisionId), { credentials: "omit", cache: "no-store", signal: AbortSignal.any([abort.signal, AbortSignal.timeout(15000)]) });
        if (!alive) return;
        if (response.status === 409 || response.status === 404) { setSolution(null); onStale(); return; }
        if (!response.ok) throw Error("Unavailable");
        const data = publicSolutionSchema.parse(await response.json());
        if (data.problemId !== problemId || data.revisionId !== revisionId || data.media.some(m => m.url !== publicSolutionPath(problemId, revisionId, m.id))) throw Error("Wrong selection");
        if (alive) { setSolution(data); setError(""); }
      } catch { if (alive && !abort.signal.aborted) { setSolution(null); setError("The worked solution could not be loaded. Please retry."); } }
    }
    void load();
    return () => { alive = false; abort.abort(); };
  }, [problemId, revisionId, onStale, retry]);
  if (error) return <div role="alert" className="space-y-3 rounded-xl border p-5"><p>{error}</p><Button variant="outline" onClick={() => { setError(""); setRetry(n => n + 1); }}>Retry worked solution</Button></div>;
  return solution ? <PublicSolutionContent solution={solution} /> : <p role="status">Loading worked solution…</p>;
}
