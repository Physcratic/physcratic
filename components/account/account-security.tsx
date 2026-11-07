"use client";
import Link from "next/link";
import React, { useEffect, useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { accountErrorMessage, EMAIL_NOT_READY_MESSAGE } from "@/lib/account-messages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const sectionClass = "scroll-mt-6 space-y-5 rounded-2xl border bg-card p-5 sm:p-7";

function Feedback({ error, success }: { error: string; success: string }) {
  return <>
    {error && <p role="alert" className="rounded-lg border border-destructive/50 p-3 text-sm text-destructive">{error}</p>}
    {success && <p role="status" className="flex items-start gap-2 text-sm"><Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{success}</p>}
  </>;
}

export function EmailNotReady() {
  return <p role="status" className="rounded-lg border p-3 text-sm">{EMAIL_NOT_READY_MESSAGE}</p>;
}

export function EmailSection({ email, hasPassword, emailReady }: { email: string; hasPassword: boolean | null; emailReady: boolean }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [success, setSuccess] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const newEmail = String(data.get("newEmail")).trim(), currentPassword = String(data.get("currentPassword"));
    setError(""); setSuccess("");
    if (newEmail.toLowerCase() === email.toLowerCase()) { setError("That’s already your email."); return; }
    setBusy(true);
    try {
      const result = await authClient.changeEmail({ newEmail, callbackURL: "/email-change?step=approved" }, { body: { currentPassword } });
      if (result.error) { setError(accountErrorMessage("change-email", result.error)); return; }
      form.reset();
      setSuccess(`Check ${email} and approve the change. Then click the link we send to ${newEmail}. Your email changes after that.`);
    } catch { setError(accountErrorMessage("change-email", undefined)); }
    finally { setBusy(false); }
  }
  return <section id="email-settings" aria-labelledby="email-heading" className={sectionClass}>
    <header className="space-y-1"><h2 id="email-heading" className="text-lg font-semibold">Email</h2><p className="text-sm leading-6 text-muted-foreground">You sign in with <span className="break-all font-medium text-foreground">{email}</span>. Your current inbox approves a change first, then the new one confirms it.</p></header>
    {!emailReady ? <EmailNotReady /> : hasPassword === false && <p className="rounded-lg border p-3 text-sm">Set a password first. Then you can change your email.</p>}
    <form onSubmit={submit} className="space-y-5">
      <fieldset disabled={busy || hasPassword !== true || !emailReady} className="grid min-w-0 gap-4 sm:grid-cols-2">
        <legend className="sr-only">Change email</legend>
        <div className="space-y-2"><label htmlFor="new-email" className="text-sm font-medium">New email</label><Input id="new-email" name="newEmail" type="email" autoComplete="email" required maxLength={254} /></div>
        <div className="space-y-2"><label htmlFor="email-current-password" className="text-sm font-medium">Current password</label><Input id="email-current-password" name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} /></div>
      </fieldset>
      <Feedback error={error} success={success} />
      <div className="flex flex-wrap items-center gap-3 border-t pt-5"><Button type="submit" disabled={busy || hasPassword !== true || !emailReady}>{busy ? "Sending…" : "Send approval link"}</Button><Link href="/forgot-password" className="inline-flex min-h-11 items-center rounded px-1 text-sm underline underline-offset-4">Forgot password?</Link></div>
    </form>
  </section>;
}

export function PasswordSection({ email, hasPassword, emailReady }: { email: string; hasPassword: boolean | null; emailReady: boolean }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [success, setSuccess] = useState("");
  async function change(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const newPassword = String(data.get("newPassword"));
    setError(""); setSuccess("");
    if (newPassword !== String(data.get("confirmPassword"))) { setError("The new passwords don’t match. Type them again."); return; }
    setBusy(true);
    try {
      const result = await authClient.changePassword({ currentPassword: String(data.get("currentPassword")), newPassword, revokeOtherSessions: data.get("revokeOtherSessions") === "on" });
      if (result.error) { setError(accountErrorMessage("change-password", result.error)); return; }
      form.reset();
      setSuccess("Password changed.");
    } catch { setError(accountErrorMessage("change-password", undefined)); }
    finally { setBusy(false); }
  }
  async function sendSetLink() {
    if (busy) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      const result = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
      if (result.error) { setError(accountErrorMessage("request-reset", result.error)); return; }
      setSuccess(`Check ${email} for the link. It expires in 1 hour.`);
    } catch { setError(accountErrorMessage("request-reset", undefined)); }
    finally { setBusy(false); }
  }
  if (hasPassword === null) return <section id="password-settings" aria-labelledby="password-heading" className={sectionClass}><h2 id="password-heading" className="text-lg font-semibold">Password</h2><p role="status" className="text-sm text-muted-foreground">Loading…</p></section>;
  if (!hasPassword) return <section id="password-settings" aria-labelledby="password-heading" className={sectionClass}>
    <header className="space-y-1"><h2 id="password-heading" className="text-lg font-semibold">Set a password</h2><p className="text-sm leading-6 text-muted-foreground">You sign in without a password right now. We’ll email you a link to set one.</p></header>
    {!emailReady && <EmailNotReady />}
    <Feedback error={error} success={success} />
    <div className="border-t pt-5"><Button type="button" disabled={busy || !emailReady} onClick={sendSetLink}>{busy ? "Sending…" : "Email me a link"}</Button></div>
  </section>;
  return <section id="password-settings" aria-labelledby="password-heading" className={sectionClass}>
    <header className="space-y-1"><h2 id="password-heading" className="text-lg font-semibold">Password</h2><p className="text-sm leading-6 text-muted-foreground">Use at least 8 characters. Pick one you don’t use anywhere else.</p></header>
    <form onSubmit={change} className="space-y-5">
      <fieldset disabled={busy} className="grid min-w-0 gap-4 sm:grid-cols-2">
        <legend className="sr-only">Change password</legend>
        {/* Lets password managers tie the new password to this account. */}
        <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
        <div className="space-y-2 sm:col-span-2"><label htmlFor="current-password" className="text-sm font-medium">Current password</label><Input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} /></div>
        <div className="space-y-2"><label htmlFor="new-password" className="text-sm font-medium">New password</label><Input id="new-password" name="newPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} /></div>
        <div className="space-y-2"><label htmlFor="confirm-password" className="text-sm font-medium">New password again</label><Input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} /></div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm sm:col-span-2"><input type="checkbox" name="revokeOtherSessions" defaultChecked className="size-5 shrink-0 accent-[hsl(var(--foreground))]" />Sign out my other devices</label>
      </fieldset>
      <Feedback error={error} success={success} />
      <div className="flex flex-wrap items-center gap-3 border-t pt-5"><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Change password"}</Button><Link href="/forgot-password" className="inline-flex min-h-11 items-center rounded px-1 text-sm underline underline-offset-4">Forgot password?</Link></div>
    </form>
  </section>;
}

export function AccountSecurity({ email, emailReady = true }: { email: string; emailReady?: boolean }) {
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  useEffect(() => {
    let live = true;
    authClient.listAccounts().then((result) => {
      if (!live) return;
      if (result.error || !Array.isArray(result.data)) { setLoadFailed(true); return; }
      setHasPassword(result.data.some((account) => account.providerId === "credential"));
    }).catch(() => { if (live) setLoadFailed(true); });
    return () => { live = false; };
  }, []);
  if (loadFailed) return <section id="email-settings" aria-labelledby="email-heading" className={sectionClass}><h2 id="email-heading" className="text-lg font-semibold">Email and password</h2><p role="alert" className="text-sm">Your sign-in details didn’t load. Reload the page to try again.</p></section>;
  return <>
    <EmailSection email={email} hasPassword={hasPassword} emailReady={emailReady} />
    <PasswordSection email={email} hasPassword={hasPassword} emailReady={emailReady} />
  </>;
}
