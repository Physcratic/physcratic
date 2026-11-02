import { LearnHeader } from "@/components/learn-header";
import { SkipLink } from "@/components/skip-link";

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SkipLink targetId="main-content">Skip to main content</SkipLink>
      <LearnHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="focus:outline-none mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12"
      >
        {children}
      </main>
    </div>
  );
}
