"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadingLines } from "@/components/loading-lines";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

export default function PdfPageViewer({ file, page, label }: { file: string; page: number; label: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [rendered, setRendered] = useState(false);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const fallback = <Alert variant="destructive"><AlertTitle>Inline PDF preview unavailable</AlertTitle><AlertDescription>Use Open PDF or Download PDF above to read the complete original document.</AlertDescription></Alert>;
  return <div ref={container} role="group" aria-label={label} className="min-w-0 overflow-hidden rounded-lg border border-border" data-pdf-rendered={rendered ? "true" : "false"}>
    {width > 0 && <Document file={file} suspense={false} loading={<LoadingLines label="Loading original PDF…" />} error={fallback}>
      <Page key={page} pageNumber={page} width={width} renderTextLayer renderAnnotationLayer loading={<p role="status" className="p-6 text-sm text-muted-foreground">Rendering PDF page…</p>} error={fallback} onRenderSuccess={() => setRendered(true)} onLoadSuccess={() => setRendered(false)} />
    </Document>}
  </div>;
}
