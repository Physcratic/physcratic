import React from "react";
import { createRoot } from "react-dom/client";
import { ProblemRoom } from "../components/physics/problem-room";
import { ImportedProblemReader } from "../components/physics/imported-problem-reader";
import { catalogProblems } from "../lib/corpus-catalog";
import type { ImportedProblem } from "../lib/imported-corpus-schema";
declare global { interface Window { __nativeRecord: ImportedProblem } }
const record = window.__nativeRecord;
createRoot(document.getElementById("root")!).render(<ProblemRoom><ImportedProblemReader problem={catalogProblems.find(p => p.id === record.id)!} initialData={record} onBack={() => {}} asPage /></ProblemRoom>);
