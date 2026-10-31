import { FeedbackLink } from "@/components/feedback-link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>&copy; {new Date().getFullYear()} Physcratic</p>
        <div className="flex flex-wrap items-center gap-2 [&_a]:min-h-11">
          <a
            href="/terms"
            className="inline-flex min-h-11 items-center rounded-md px-3 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Terms
          </a>
          <FeedbackLink variant="inline" />
        </div>
      </div>
    </footer>
  );
}
