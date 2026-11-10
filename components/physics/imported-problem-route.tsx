"use client";

import { useRouter } from "next/navigation";
import type { ImportedProblem } from "@/lib/imported-corpus-schema"
import type { CatalogProblem } from "@/lib/corpus-catalog";
import { ImportedProblemReader } from "./imported-problem-reader";

export function ImportedProblemRoute({ problem, initialData }: {
  problem: CatalogProblem
  initialData?: ImportedProblem
}) {
  const router = useRouter();
  return <ImportedProblemReader asPage problem={problem} initialData={initialData} onBack={() => router.push("/dashboard?view=problems")} />
}
