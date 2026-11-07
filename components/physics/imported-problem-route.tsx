"use client";

import { useRouter } from "next/navigation";
import type { CatalogProblem } from "@/lib/corpus-catalog";
import { ImportedProblemReader } from "./imported-problem-reader";

export function ImportedProblemRoute({ problem }: { problem: CatalogProblem }) {
  const router = useRouter();
  return <ImportedProblemReader asPage problem={problem} onBack={() => router.push("/dashboard?view=problems")} />;
}
