import type { ReactNode } from "react";
import Layout from "@/components/kokonutui/layout";
export function AttemptsPageShell({ children }: { children: ReactNode }) {
  return <Layout view="problems" topic="My attempts"><div className="flex flex-col gap-6"><header className="flex flex-col gap-2"><h1 className="text-balance text-2xl font-medium tracking-tight">My Solution Attempts</h1><p className="text-sm leading-relaxed text-muted-foreground">Saved attempts are private and ungraded until an approved marking rubric is available.</p></header>{children}</div></Layout>;
}
