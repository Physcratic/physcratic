import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { StudentWorkspace } from "../components/authored/student-workspace";
import type { Viewer } from "../lib/authored-student";
declare global {
  interface Window {
    __student: { problemId: string; viewer: Viewer };
    __setViewer: (v: Viewer) => void;
  }
}
function Harness() {
  const [viewer, setViewer] = useState(window.__student.viewer);
  window.__setViewer = setViewer;
  return (
    <StudentWorkspace problemId={window.__student.problemId} viewer={viewer} />
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Harness />
  </React.StrictMode>,
);
