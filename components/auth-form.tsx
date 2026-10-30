"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { TERMS_VERSION } from "@/lib/terms";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { VerificationNotice } from "@/components/verification-notice";

export function AuthForm({ mode, returnTo, verified = false, verificationError = false }: { mode: "sign-in" | "sign-up"; returnTo: string; verified?: boolean; verificationError?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const creating = mode === "sign-up";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (creating && !termsAccepted) {
      setError("Please read and accept the Terms of Service to create an account.");
      return;
    }
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const credentials = { email: String(form.get("email")).trim(), password: String(form.get("password")) };
    const callbackURL = `/sign-in?verified=1&returnTo=${encodeURIComponent(returnTo)}`;
    try {
      const result = creating
        ? await authClient.signUp.email({ ...credentials, name: String(form.get("name")).trim(), callbackURL }, { body: { termsAccepted, termsVersion: TERMS_VERSION } })
        : await authClient.signIn.email({ ...credentials, callbackURL });
      if (result.error) {
        if (creating && result.error.code === "TERMS_ACCEPTANCE_REQUIRED") {
          setError("Please reload this page, review the current Terms of Service, and accept them before continuing.");
          return;
        }
        if (!creating && result.error.code === "EMAIL_NOT_VERIFIED") {
          setVerificationEmail(credentials.email);
          return;
        }
        setError(creating ? "We could not create your account. Check your details or try signing in." : "Sign-in failed. Check your details and try again.");
        return;
      }
      if (creating) {
        setVerificationEmail(credentials.email);
        return;
      }
      router.push(returnTo);
      router.refresh();
    } catch {
      setError("The account service is temporarily unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-10 font-sans">
      <div className="flex w-full max-w-md flex-col gap-6">
        <Button variant="ghost" className="w-fit" asChild><Link href="/dashboard"><ArrowLeft data-icon="inline-start" /> Back to Physcratic</Link></Button>
        {verificationEmail !== null ? <VerificationNotice email={verificationEmail} returnTo={returnTo} onBack={() => setVerificationEmail(null)} /> : <Card>
          <CardHeader><CardTitle>{creating ? "Keep your working. Track your progress." : "Welcome back."}</CardTitle><CardDescription>{creating ? "Create an account to privately save your olympiad solutions." : "Sign in to return to your saved attempts."}</CardDescription></CardHeader>
          <CardContent>
            <form id="account-form" onSubmit={submit} onKeyDown={(event) => {
              if (event.key === "Enter" && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault();
            }}>
              <fieldset disabled={busy}><FieldGroup>
                {!creating && verified && !verificationError && <Alert role="status"><AlertTitle>Ready to sign in</AlertTitle><AlertDescription>If your email verification succeeded, sign in below to continue.</AlertDescription></Alert>}
                {!creating && verificationError && <Alert variant="destructive" role="alert"><AlertTitle>Link unavailable</AlertTitle><AlertDescription>This verification link is invalid or has expired. Request a new email below.</AlertDescription></Alert>}
                {creating && <Field><FieldLabel htmlFor="account-name">Name</FieldLabel><Input id="account-name" name="name" autoComplete="name" required minLength={1} maxLength={80} /></Field>}
                <Field><FieldLabel htmlFor="account-email">Email</FieldLabel><Input id="account-email" name="email" type="email" autoComplete="email" required maxLength={254} /></Field>
                <Field><FieldLabel htmlFor="account-password">Password</FieldLabel><Input id="account-password" name="password" type="password" autoComplete={creating ? "new-password" : "current-password"} required minLength={8} maxLength={128} />{creating && <p className="text-sm leading-relaxed text-muted-foreground">Use at least 8 characters. Choose a password you do not use elsewhere.</p>}</Field>
                {creating && <Field orientation="horizontal">
                  <Checkbox id="account-terms" name="termsAccepted" required checked={termsAccepted} onCheckedChange={(checked) => setTermsAccepted(checked === true)} aria-describedby="account-terms-description" />
                  <FieldContent>
                    <FieldLabel htmlFor="account-terms">I agree to the Terms of Service.</FieldLabel>
                    <FieldDescription id="account-terms-description"><Link href="/terms" target="_blank" rel="noopener noreferrer">Read the Terms of Service (opens in a new tab)</Link>. We record the version and acceptance time with your account.</FieldDescription>
                  </FieldContent>
                </Field>}
                {error && <Alert variant="destructive" role="alert"><AlertTitle>Could not continue</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
              </FieldGroup></fieldset>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-4">
            <Button form="account-form" type="submit" disabled={busy}>{busy && <Loader2 data-icon="inline-start" className="animate-spin" />}{creating ? "Create account" : "Sign in"}</Button>
            <p className="text-center text-sm leading-relaxed text-muted-foreground">{creating ? "Already have an account? " : "New to Physcratic? "}<Link className="text-foreground underline underline-offset-4" href={`/${creating ? "sign-in" : "sign-up"}?returnTo=${encodeURIComponent(returnTo)}`}>{creating ? "Sign in" : "Create an account"}</Link></p>
            {!creating && <Button type="button" variant="ghost" disabled={busy} onClick={() => setVerificationEmail("")}>Need a verification email?</Button>}
            <Link href="/terms" className="text-center text-sm text-muted-foreground underline underline-offset-4">Terms of Service</Link>
          </CardFooter>
        </Card>}
      </div>
    </main>
  );
}
