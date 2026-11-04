"use client";
import * as React from "react";
import Link from "next/link";
import { CircleAlert, CircleCheck, CircleDot, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { solveTokens } from "@/components/physics/solve-ui";

/**
 * Stronger borders for the Problem Studio and the authored-problem student view. Now shared with every
 * solving screen (see `solveTokens`), kept under its old name so existing imports keep working.
 */
export const studioTokens = solveTokens;

/** A numbered step of the editor: one bordered card with a visible heading. */
export function StepCard({
  id,
  step,
  title,
  hint,
  children,
  className,
}: {
  id: string;
  step: number;
  title: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const headingId = `${id}-title`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn("scroll-mt-24 space-y-5 rounded-xl border bg-card p-4 text-card-foreground sm:p-6", className)}
    >
      <header className="space-y-1.5">
        <h2 id={headingId} className="flex items-center gap-3 text-xl font-semibold tracking-tight">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-foreground/60 text-sm font-semibold"
          >
            {step}
          </span>
          <span className="sr-only">Step {step}: </span>
          {title}
        </h2>
        {hint && <p className="text-sm leading-relaxed text-muted-foreground">{hint}</p>}
      </header>
      {children}
    </section>
  );
}

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

/** Draft state, save state and publish readiness. Every value comes from state the editor already has. */
export function StatusBar({
  state,
  version,
  saveMessage,
  saveTone,
  checksLeft,
  className,
}: {
  state: string;
  version: number;
  saveMessage: string;
  saveTone: "ok" | "busy" | "error";
  checksLeft: number;
  className?: string;
}) {
  const SaveIcon = saveTone === "error" ? CircleAlert : saveTone === "ok" ? CircleCheck : CircleDot;
  return (
    <dl
      aria-label="Problem status"
      className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-card px-3 py-2 text-sm", className)}
    >
      <div className="flex items-center gap-2">
        <dt className="sr-only">State</dt>
        <dd className="font-medium capitalize">
          {state} <span className="font-normal text-muted-foreground">version {version}</span>
        </dd>
      </div>
      <div className={cn("flex items-center gap-1.5", saveTone === "error" && "text-destructive")}>
        <dt className="sr-only">Saving</dt>
        <dd className="flex items-center gap-1.5">
          <SaveIcon aria-hidden="true" className="size-4 shrink-0" />
          {saveMessage}
        </dd>
      </div>
      <div className="flex items-center gap-1.5">
        <dt className="sr-only">Publishing</dt>
        <dd className="flex items-center gap-1.5">
          {checksLeft === 0 ? (
            <>
              <CircleCheck aria-hidden="true" className="size-4 shrink-0" />
              Ready to publish
            </>
          ) : (
            <>
              <CircleDot aria-hidden="true" className="size-4 shrink-0" />
              {checksLeft} {checksLeft === 1 ? "check" : "checks"} left
            </>
          )}
        </dd>
      </div>
    </dl>
  );
}
