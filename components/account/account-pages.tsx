"use client";
import Link from "next/link";
import React, { useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { accountErrorMessage } from "@/lib/account-messages";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function Shell({ children }: { children: ReactNode }) {
  return <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-10 font-sans">
    <div className="flex w-full max-w-md flex-col gap-6">
      <Button variant="ghost" className="w-fit" asChild><Link href="/dashboard"><ArrowLeft data-icon="inline-start" /> Back to Physcratic</Link></Button>
      {children}
    </div>
  </main>;
}

const footerLink = "inline-flex min-h-11 items-center justify-center text-center text-sm text-muted-foreground underline underline-offset-4";

export function ForgotPasswordForm() {
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [sent, setSent] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const email = String(new FormData(event.currentTarget).get("email")).trim();
    setBusy(true); setError("");
    try {
      const result = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
      if (result.error) { setError(accountErrorMessage("request-reset", result.error)); return; }
      setSent(email);
    } catch { setError(accountErrorMessage("request-reset", undefined)); }
    finally { setBusy(false); }
  }
  return <Shell><Card>
    <CardHeader><CardTitle><h1>Forgot your password?</h1></CardTitle><CardDescription>Type your email and we’ll send you a reset link.</CardDescription></CardHeader>
    <CardContent>
      {sent ? <Alert role="status"><AlertTitle>Check your inbox</AlertTitle><AlertDescription>If {sent} has an account, a reset link is on its way. It expires in 1 hour.</AlertDescription></Alert>
        : <form id="forgot-form" onSubmit={submit}><fieldset disabled={busy}><FieldGroup>
          <Field><FieldLabel htmlFor="forgot-email">Email</FieldLabel><Input id="forgot-email" name="email" type="email" autoComplete="email" required maxLength={254} /></Field>
          {error && <Alert variant="destructive" role="alert"><AlertTitle>Could not send</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
        </FieldGroup></fieldset></form>}
    </CardContent>
    <CardFooter className="flex flex-col items-stretch gap-4">
      {sent ? <Button type="button" variant="outline" onClick={() => setSent("")}>Use a different email</Button>
        : <Button form="forgot-form" type="submit" disabled={busy}>{busy && <Loader2 data-icon="inline-start" className="animate-spin" />}Send reset link</Button>}
      <Link href="/sign-in" className={footerLink}>Back to sign in</Link>
    </CardFooter>
  </Card></Shell>;
}

export function ResetPasswordForm({ token, linkError }: { token: string | null; linkError: boolean }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [done, setDone] = useState(false), [dead, setDead] = useState(linkError || !token);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !token) return;
    const data = new FormData(event.currentTarget);
    const newPassword = String(data.get("newPassword"));
    setError("");
    if (newPassword !== String(data.get("confirmPassword"))) { setError("The passwords don’t match. Type them again."); return; }
    setBusy(true);
    try {
      const result = await authClient.resetPassword({ newPassword, token });
      if (result.error) {
        if (result.error.code === "INVALID_TOKEN") setDead(true);
        else setError(accountErrorMessage("reset-password", result.error));
        return;
      }
      setDone(true);
    } catch { setError(accountErrorMessage("reset-password", undefined)); }
    finally { setBusy(false); }
  }
  if (dead) return <Shell><Card>
    <CardHeader><CardTitle><h1>Link didn’t work</h1></CardTitle><CardDescription>That link has expired or was already used. Ask for a new one.</CardDescription></CardHeader>
    <CardFooter className="flex flex-col items-stretch gap-4"><Button asChild><Link href="/forgot-password">Get a new link</Link></Button><Link href="/sign-in" className={footerLink}>Back to sign in</Link></CardFooter>
  </Card></Shell>;
  if (done) return <Shell><Card>
    <CardHeader><CardTitle><h1>Password updated</h1></CardTitle><CardDescription>We signed you out everywhere. Sign in with your new password.</CardDescription></CardHeader>
    <CardFooter className="flex flex-col items-stretch gap-4"><Button asChild><Link href="/sign-in">Sign in</Link></Button></CardFooter>
  </Card></Shell>;
  return <Shell><Card>
    <CardHeader><CardTitle><h1>Pick a new password</h1></CardTitle><CardDescription>Use at least 8 characters. Pick one you don’t use anywhere else.</CardDescription></CardHeader>
    <CardContent><form id="reset-form" onSubmit={submit}><fieldset disabled={busy}><FieldGroup>
      <Field><FieldLabel htmlFor="reset-password">New password</FieldLabel><Input id="reset-password" name="newPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} /></Field>
      <Field><FieldLabel htmlFor="reset-confirm">New password again</FieldLabel><Input id="reset-confirm" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} /></Field>
      {error && <Alert variant="destructive" role="alert"><AlertTitle>Could not save</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
    </FieldGroup></fieldset></form></CardContent>
    <CardFooter className="flex flex-col items-stretch gap-4"><Button form="reset-form" type="submit" disabled={busy}>{busy && <Loader2 data-icon="inline-start" className="animate-spin" />}Save new password</Button></CardFooter>
  </Card></Shell>;
}

export function EmailChangeResult({ title, body, ok }: { title: string; body: string; ok: boolean }) {
  return <Shell><Card>
    <CardHeader><CardTitle><h1>{title}</h1></CardTitle><CardDescription role={ok ? "status" : "alert"}>{body}</CardDescription></CardHeader>
    <CardFooter className="flex flex-col items-stretch gap-4"><Button asChild><Link href="/settings#email-settings">Go to Settings</Link></Button></CardFooter>
  </Card></Shell>;
}
