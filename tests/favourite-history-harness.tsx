import React from "react";
import { createRoot } from "react-dom/client";
import { FavouriteHistory } from "../components/physics/favourite-history";
import "./practice-session-fixture";

const actor = document.cookie.match(/viewer=([^;]+)/)?.[1] || (new URLSearchParams(location.search).has("guest") ? null : "A");
window.__setPracticeSession(actor);
createRoot(document.getElementById("root")!).render(<React.StrictMode><main className="mx-auto max-w-3xl p-4"><h1 className="text-2xl">Favourite history test</h1><FavouriteHistory /></main></React.StrictMode>);
