import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { StudentWorkspace } from "../components/authored/student-workspace";
import { SolutionPermissions } from "../components/authoring/solution-permissions";
import { ConfirmProvider } from "../components/authoring/confirm-sheet";
import type { Viewer } from "../lib/authored-student";
declare global {
  interface Window {
    __student: { problemId: string; viewer: Viewer; attributionEnabled?: boolean };
    __setViewer: (v: Viewer) => void;
  }
}
function Harness() {
  const [viewer, setViewer] = useState(window.__student.viewer);
  window.__setViewer = setViewer;
  if (window.location.search.includes("permissions"))
    return (
      <main>
        <ConfirmProvider><SolutionPermissions problemId={window.__student.problemId} /></ConfirmProvider>
      </main>
    );
  return (
    <StudentWorkspace problemId={window.__student.problemId} viewer={viewer} attributionEnabled={window.__student.attributionEnabled} />
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Harness />
  </React.StrictMode>,
);
