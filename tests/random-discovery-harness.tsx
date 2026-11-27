import React from "react";
import { createRoot } from "react-dom/client";
import { ProblemToCheckOut } from "../components/physics/dashboard-highlights";

createRoot(document.getElementById("root")!).render(<React.StrictMode><main className="mx-auto max-w-xl p-4"><h1 className="text-2xl">Discovery test</h1><ProblemToCheckOut /></main></React.StrictMode>);
