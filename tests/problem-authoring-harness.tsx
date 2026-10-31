import React from "react";
import { createRoot } from "react-dom/client";
import { AuthoringWorkspace } from "../components/authoring/workspace";
import { SearchParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { ProblemLibrary } from "../components/physics/problem-library";
import { StudentWorkspace } from "../components/authored/student-workspace";
const problemId = location.pathname.match(
  /^\/dashboard\/authored\/([^/]+)$/,
)?.[1];
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {problemId ? (
      <StudentWorkspace
        problemId={problemId}
        viewer={{ state: "verified", id: "workflow-student" }}
      />
    ) : location.pathname === "/dashboard" ? (
      <SearchParamsContext.Provider
        value={new URLSearchParams(location.search)}
      >
        <main className="p-4">
          <h1>Problem library</h1>
          <ProblemLibrary onOpen={() => {}} />
        </main>
      </SearchParamsContext.Provider>
    ) : (
      <AuthoringWorkspace userId="browser-author" />
    )}
  </React.StrictMode>,
);
