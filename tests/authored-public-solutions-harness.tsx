import React from "react";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { createRoot } from "react-dom/client";
import { StudentWorkspace } from "../components/authored/student-workspace";
import { ProblemEditor } from "../components/authoring/problem-editor";
import { ConfirmProvider } from "../components/authoring/confirm-sheet";
import { UnifiedArenaCollection } from "../components/physics/unified-arena-collection";
import type { EditorDraft } from "../lib/problem-authoring-editor";
import type { Viewer } from "../lib/authored-student";
declare global { interface Window { __publicFixture: { problemId: string; viewer: Viewer; draft?: EditorDraft; publicSolutionsEnabled: boolean }; } }
const f = window.__publicFixture;
const arena = location.pathname === "/arena";
createRoot(document.getElementById("root")!).render(<React.StrictMode><AppRouterContext.Provider value={{push(){},replace(){},refresh(){},back(){},forward(){},prefetch(){}} as never}><PathnameContext.Provider value={arena ? "/arena" : f.draft ? "/dashboard/author" : "/dashboard/authored/"+f.problemId}>{arena ? <main className="p-4"><h1>Problem library</h1><UnifiedArenaCollection query="" topic="all" difficulty="all" onReset={() => {}} /></main> : f.draft ? <ConfirmProvider><ProblemEditor publicSolutionsEnabled={f.publicSolutionsEnabled} initial={f.draft} userId="author" onBack={() => {}} /></ConfirmProvider> : <StudentWorkspace publicSolutionsEnabled problemId={f.problemId} viewer={f.viewer} />}</PathnameContext.Provider></AppRouterContext.Provider></React.StrictMode>);
