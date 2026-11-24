"use client";
import * as React from "react";
import Link from "next/link";
import { ChevronDown, CircleAlert, CircleCheck, CircleDot, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { solveTokens } from "@/components/physics/solve-ui";

/**
 * Stronger borders for the Problem Studio and the authored-problem student view. Now shared with every
 * solving screen (see `solveTokens`), kept under its old name so existing imports keep working.
 */
export const studioTokens = solveTokens;

/** An inline error: destructive text with an icon, so colour is never the only signal. */
export function ErrorText({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-1.5 text-sm text-destructive">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** The existing "How it works" guide. The guide may not exist yet, which is fine. */
export const HOW_IT_WORKS_HREF = "/learn/how-to-write-a-problem";
export function HowItWorksLink({ className }: { className?: string }) {
  return (
    <Link
      href={HOW_IT_WORKS_HREF}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-sm text-sm font-medium underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <HelpCircle aria-hidden="true" className="size-4" />
      How it works
    </Link>
  );
}

/** The save state, in words with an icon. The value comes from state the editor already has. */
export function StatusBar({
  saveMessage,
  saveTone,
  className,
}: {
  saveMessage: string;
  saveTone: "ok" | "busy" | "error";
  className?: string;
}) {
  const SaveIcon = saveTone === "error" ? CircleAlert : saveTone === "ok" ? CircleCheck : CircleDot;
  return (
    <p
      role="status"
      aria-live="polite"
      aria-label="Problem status"
      className={cn("flex items-center gap-2 text-base", saveTone === "error" ? "text-destructive" : "text-muted-foreground", className)}
    >
      <SaveIcon aria-hidden="true" className="size-4 shrink-0" />
      {saveMessage}
    </p>
  );
}

/**
 * The recovery tools, in one collapsed section. It is closed until something needs attention (a saved copy to
 * restore, a copy that cannot be read, or a version conflict), and then it opens by itself so nothing urgent is
 * hidden. A person can still close it. The heading is a button at least 44px tall. What is inside is the same as before.
 */
export function nextRecoveryState(state: { open: boolean; seen: boolean }, active: boolean) {
  // Opens the moment `active` becomes true. Turning it off leaves the section as the person left it.
  return active === state.seen ? state : { seen: active, open: active ? true : state.open };
}

export function RecoverySection({ active, narrow = false, children }: { active: boolean; narrow?: boolean; children: React.ReactNode }) {
  const id = React.useId();
  const [state, setState] = React.useState({ open: active, seen: active });
  // Updated in the same render, so a new alert is announced together with its section.
  const next = nextRecoveryState(state, active);
  if (next !== state) setState(next);
  const open = next.open;
  return (
    <section aria-labelledby={`${id}-heading`} className={cn("mb-6 space-y-3", narrow && "mx-auto max-w-2xl")}>
      <h2 id={`${id}-heading`} className="text-base font-semibold">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md border px-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setState({ ...next, open: !open })}
        >
          <span>Recovery{active ? ", needs attention" : ""}</span>
          <ChevronDown aria-hidden="true" className={cn("size-4 shrink-0 transition-transform motion-reduce:transition-none", open && "rotate-180")} />
        </button>
      </h2>
      {open && <div id={id} className="space-y-4">{children}</div>}
    </section>
  );
}
