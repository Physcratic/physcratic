import React from "react";
import { createRoot } from "react-dom/client";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { AuthForm } from "@/components/auth-form";
const router = { back() {}, forward() {}, refresh() {}, hmrRefresh() {}, push() {}, replace() {}, prefetch() {} } as never;
const p = location.pathname;
createRoot(document.getElementById("root")!).render(
  <AppRouterContext.Provider value={router}>
    {p === "/sign-in" ? <AuthForm mode="sign-in" returnTo="/dashboard" /> : p === "/sign-up-plain" ? <AuthForm mode="sign-up" returnTo="/dashboard" /> : <AuthForm mode="sign-up" returnTo="/dashboard" publicProfileSignup />}
  </AppRouterContext.Provider>,
);
