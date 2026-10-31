"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function VerificationNotice({ email: initialEmail, returnTo, onBack }: { email: string; returnTo: string; onBack: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const signInPath = `/sign-in?returnTo=${encodeURIComponent(returnTo)}`;

  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (Date.now() < retryAt) {
      setError("Please wait a minute before requesting another email.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await authClient.sendVerificationEmail({
        email: email.trim(),
        callbackURL: `${signInPath}&verified=1`,
      });
      if (result.error) {
        setError("We could not request an email right now. Wait a minute and try again.");
        return;
      }
      setRetryAt(Date.now() + 60_000);
      setMessage("If this address belongs to an account awaiting verification, a new link will arrive shortly. Check your spam folder too.");
    } catch {
      setError("The email service is temporarily unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <Mail className="mb-2 size-6 text-muted-foreground" aria-hidden="true" />
        <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold leading-tight tracking-tight">Check your email</h1>
        <CardDescription>If your account needs verification, we will send a link to your inbox. Open it to verify your address, then sign in.</CardDescription>
      </CardHeader>
      <CardContent>
        <form id="resend-verification" aria-busy={busy} onSubmit={resend} onKeyDown={(event) => {
          if (event.key === "Enter" && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault();
        }}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="verification-email">Email</FieldLabel>
              <Input className="border-muted-foreground" id="verification-email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} disabled={busy} />
            </Field>
            <p className="text-sm leading-relaxed text-muted-foreground">Links expire in 1 hour. If your link has expired or you cannot find the email, request another below.</p>
            {message && <Alert role="status"><AlertTitle aria-level={2}>Request received</AlertTitle><AlertDescription>{message}</AlertDescription></Alert>}
            {error && <Alert variant="destructive" role="alert"><AlertTitle aria-level={2}>Could not send</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-3">
        <p role="status" className="sr-only">{busy ? "Requesting verification email…" : ""}</p>
        <Button type="submit" form="resend-verification" disabled={busy} variant="outline">{busy && <Loader2 data-icon="inline-start" className="animate-spin" />}Resend verification email</Button>
        <Button asChild><Link href={signInPath}>Go to sign in</Link></Button>
        <Button type="button" variant="ghost" onClick={onBack}>Back to account form</Button>
      </CardFooter>
    </Card>
  );
}
