import React from "react";
import { createRoot } from "react-dom/client";
import { SearchParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { ProblemLibrary } from "../components/physics/problem-library";
import { StudentWorkspace } from "../components/authored/student-workspace";

const id = location.pathname.match(/^\/dashboard\/authored\/([^/]+)$/)?.[1];
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {id ? (
      <StudentWorkspace problemId={id} viewer={{ state: "guest" }} />
    ) : (
      <SearchParamsContext.Provider
        value={new URLSearchParams(location.search)}
      >
        <main className="mx-auto max-w-6xl p-4">
          <h1 className="mb-6 text-2xl">Problem library</h1>
          <ProblemLibrary
            onOpen={(problem) =>
              location.assign(`/dashboard/problems/${problem.id}`)
            }
          />
        </main>
      </SearchParamsContext.Provider>
    )}
  </React.StrictMode>,
);
