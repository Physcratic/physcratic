import React from "react";
import { createRoot } from "react-dom/client";
import { ProblemRoom } from "../components/physics/problem-room";
import { ProblemReader } from "../components/physics/problem-reader";
import { ArenaProblemReader } from "../components/physics/arena-problem-reader";
import { ImportedProblemReader } from "../components/physics/imported-problem-reader";
import { problems } from "../lib/physics";
import arena from "../lib/arena/index.json";
import { catalogProblems } from "../lib/corpus-catalog";
import imported from "../public/corpus/english-problems/ipho-2026-t1.json";
import type { ImportedProblem } from "../lib/imported-corpus-schema";
import type { ArenaCatalogEntry } from "../lib/arena-schema";
const kind = new URLSearchParams(location.search).get("kind");
createRoot(document.getElementById("root")!).render(<ProblemRoom>
  {kind === "arena" ? <ArenaProblemReader problem={arena.problems[0] as ArenaCatalogEntry} statement={<p>Find the displacement of a moving particle.</p>} /> : kind === "imported" ? <ImportedProblemReader asPage problem={catalogProblems.find(p => p.id === "ipho-2026-t1")!} initialData={imported as ImportedProblem} onBack={() => {}} /> : <ProblemReader problem={problems[0]} />}
</ProblemRoom>);
