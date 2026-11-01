import React from "react";
import { createRoot } from "react-dom/client";
import { AuthoringWorkspace } from "../components/authoring/workspace";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthoringWorkspace userId="browser-author" />
  </React.StrictMode>,
);
