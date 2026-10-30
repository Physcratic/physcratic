"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function DataFeedback({ loading, error, retry }: { loading?: boolean; error?: unknown; retry: () => unknown }) {
  if (error) return <Alert variant="destructive" role="alert"><AlertTitle>Could not load current data</AlertTitle><AlertDescription><Button variant="outline" size="sm" onClick={() => void retry()}>Retry</Button></AlertDescription></Alert>;
  if (loading) return <p role="status" className="text-sm text-muted-foreground">Loading current data…</p>;
  return null;
}
