"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authorMediaPath } from "@/lib/author-media";

const PdfPageViewer = dynamic(() => import("@/components/physics/pdf-page-viewer"), { ssr: false });

export function StatementPdfs({ problemId, ids, revisionId }: { problemId: string; ids: string[]; revisionId?: string }) {
  return <div className="space-y-4">{ids.map((id, index) => <AuthoredPdf key={`${revisionId ?? 'draft'}:${id}`} url={authorMediaPath(problemId, id, revisionId)} label={`Statement PDF ${index + 1}`} />)}</div>;
}

export function AuthoredPdf({ url, label }: { url: string; label: string }) {
  const [page, setPage] = useState(1), [pages, setPages] = useState<number | null>(null);
  return <section aria-label={label} className="min-w-0 space-y-3">
    <div className="flex flex-wrap items-center gap-3">
      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm underline">Open or download {label}</a>
    </div>
      <p className="text-sm text-muted-foreground">Scanned PDFs may not contain selectable text. Native text and image descriptions, when supplied, follow below.</p>
      <nav aria-label={`${label} pages`} className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" className="min-h-11" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous page</Button>
        <span role="status" className="text-sm">Page {page}{pages === null ? "" : ` of ${pages}`}</span>
        <Button type="button" variant="outline" className="min-h-11" disabled={pages === null || page >= pages} onClick={() => setPage(p => p + 1)}>Next page</Button>
      </nav>
      <PdfPageViewer file={url} page={page} label={`${label}, page ${page}`} onPages={setPages} />
  </section>;
}
