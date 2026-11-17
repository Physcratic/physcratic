import React from "react";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { createRoot } from "react-dom/client";
import { StudentWorkspace } from "../components/authored/student-workspace";
import { ProblemEditor } from "../components/authoring/problem-editor";
import type { EditorDraft } from "../lib/problem-authoring-editor";
import type { Viewer } from "../lib/authored-student";
declare global { interface Window { __publicFixture: { problemId: string; viewer: Viewer; draft?: EditorDraft }; } }
const f = window.__publicFixture;
createRoot(document.getElementById("root")!).render(<React.StrictMode><AppRouterContext.Provider value={{push(){},replace(){},refresh(){},back(){},forward(){},prefetch(){}} as never}><PathnameContext.Provider value={f.draft ? "/dashboard/author" : "/dashboard/authored/"+f.problemId}>{f.draft ? <ProblemEditor publicSolutionsEnabled initial={f.draft} userId="author" onBack={() => {}} /> : <StudentWorkspace publicSolutionsEnabled problemId={f.problemId} viewer={f.viewer} />}</PathnameContext.Provider></AppRouterContext.Provider></React.StrictMode>);
