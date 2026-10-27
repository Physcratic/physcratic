import type { ReactNode } from "react";
import type { View } from "@/lib/physics";
import Sidebar from "./sidebar";
import TopNav from "./top-nav";

export default function Layout({
  children,
  view,
  topic,
}: {
  children: ReactNode;
  view: View;
  topic?: string;
}) {
  return (
    <div className="flex min-h-dvh font-sans">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-3 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <Sidebar view={view} topic={topic} />
      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <TopNav view={view} topic={topic} />
        <main id="main-content" className="flex-1 p-5 sm:p-8 xl:p-10">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
