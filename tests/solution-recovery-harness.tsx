import React from "react";
import { createRoot } from "react-dom/client";
import { SWRConfig, useSWRConfig } from "swr";
import { SolutionSubmissionForm } from "../components/physics/solution-submission-form";
import "./practice-session-fixture";

const actor = document.cookie.match(/viewer=([^;]+)/)?.[1] || "A";
window.__setPracticeSession(actor);
function Harness() {
  const { mutate } = useSWRConfig();
  return <main className="mx-auto max-w-5xl p-4"><h1 className="text-2xl">Written solution recovery test</h1>
    <button type="button" className="min-h-11" onClick={() => void mutate(key => Array.isArray(key) && String(key[0]).startsWith("/api/submission-info/"))}>Refresh fixture source</button>
    <SolutionSubmissionForm problemId="ipho-2025-t1" />
  </main>;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, revalidateOnFocus: false, errorRetryCount: 0 }}><Harness /></SWRConfig></React.StrictMode>);
