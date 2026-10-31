"use client";

import { getSignupCaptchaToken } from "@/lib/signup-captcha-client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { TermsConsent } from "@/components/terms-consent";
import { TERMS_VERSION } from "@/lib/terms";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { VerificationNotice } from "@/components/verification-notice";

export function AuthForm({ mode, returnTo, verified = false, verificationError = false }: { mode: "sign-in" | "sign-up"; returnTo: string; verified?: boolean; verificationError?: boolean }) {
  const router = useRouter();
  const heading = useRef<HTMLHeadingElement>(null);
  const [busy, setBusy] = useState(false);
  const [checkingCaptcha, setCheckingCaptcha] = useState(false);
  const [error, setError] = useState("");
  const [termsInvalid, setTermsInvalid] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const creating = mode === "sign-up";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (creating && !termsAccepted) {
      setTermsInvalid(true);
      setError("Please read and accept the Terms of Service to create an account.");
      return;
    }
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const credentials = { email: String(form.get("email")).trim(), password: String(form.get("password")) };
    const callbackURL = `/sign-in?verified=1&returnTo=${encodeURIComponent(returnTo)}`;
    try {
      let captchaToken: string | undefined;
      if (creating) {
        setCheckingCaptcha(true);
        try { captchaToken = await getSignupCaptchaToken(); }
        catch { setError("Security check unavailable. Please try again."); return; }
        finally { setCheckingCaptcha(false); }
      }
      const result = creating
        ? await authClient.signUp.email({ ...credentials, name: String(form.get("name")).trim(), callbackURL }, { body: { termsAccepted, termsVersion: TERMS_VERSION }, headers: { "x-captcha-response": captchaToken! } })
        : await authClient.signIn.email({ ...credentials, callbackURL });
      if (result.error) {
        if (creating && result.error.code === "TERMS_ACCEPTANCE_REQUIRED") {
          setError("Please reload this page, review the current Terms of Service, and accept them before continuing.");
          return;
        }
        if (!creating && result.error.code === "EMAIL_NOT_VERIFIED") {
          setVerificationRequired(true);
          setVerificationEmail(credentials.email);
          return;
        }
        setError(creating ? "We could not create your account. Please try again or sign in." : "Sign-in failed. Check your details and try again.");
        return;
      }
      if (creating) {
        setVerificationRequired(false);
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
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-10 font-sans [--ring:var(--foreground)]">
      <div className="flex w-full max-w-md flex-col gap-6">
        <Button variant="ghost" className="w-fit" asChild><Link href="/dashboard"><ArrowLeft data-icon="inline-start" /> Back to Physcratic</Link></Button>
        {verificationEmail !== null ? <VerificationNotice verificationRequired={verificationRequired} email={verificationEmail} returnTo={returnTo} onBack={() => { setVerificationEmail(null); requestAnimationFrame(() => heading.current?.focus()); }} /> : <Card>
          <CardHeader><h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold leading-tight tracking-tight">{creating ? "Keep your working. Track your progress." : "Welcome back."}</h1><CardDescription>{creating ? "Create an account to privately save your olympiad solutions." : "Sign in to return to your saved attempts."}</CardDescription></CardHeader>
          <CardContent>
            <form id="account-form" aria-busy={busy} onInvalidCapture={() => { if (creating && !termsAccepted) setTermsInvalid(true); }} onSubmit={submit} onKeyDown={(event) => {
              if (event.key === "Enter" && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault();
            }}>
              <fieldset disabled={busy}><FieldGroup>
                {!creating && verified && !verificationError && <Alert role="status"><AlertTitle aria-level={2}>Ready to sign in</AlertTitle><AlertDescription>If your email verification succeeded, sign in below to continue.</AlertDescription></Alert>}
                {!creating && verificationError && <Alert variant="destructive" role="alert"><AlertTitle aria-level={2}>Link unavailable</AlertTitle><AlertDescription>This verification link is invalid or has expired. Request a new email below.</AlertDescription></Alert>}
                {creating && <Field><FieldLabel htmlFor="account-name">Name</FieldLabel><Input className="border-muted-foreground" id="account-name" name="name" autoComplete="name" required minLength={1} maxLength={80} /></Field>}
                <Field><FieldLabel htmlFor="account-email">Email</FieldLabel><Input className="border-muted-foreground" id="account-email" name="email" type="email" autoComplete="email" required maxLength={254} /></Field>
                <Field><FieldLabel htmlFor="account-password">Password</FieldLabel><Input className="border-muted-foreground" id="account-password" aria-describedby={creating ? "account-password-help" : undefined} name="password" type="password" autoComplete={creating ? "new-password" : "current-password"} required minLength={8} maxLength={128} />{creating && <p id="account-password-help" className="text-sm leading-relaxed text-muted-foreground">Use at least 8 characters.</p>}</Field>
                {creating && <TermsConsent checked={termsAccepted} invalid={termsInvalid} onChange={(checked) => { setTermsAccepted(checked); if (checked) setTermsInvalid(false); }} />}
                {error && <Alert variant="destructive" role="alert"><AlertTitle aria-level={2}>Could not continue</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
              </FieldGroup></fieldset>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-4">
            <p role="status" aria-live="polite" className={creating ? "text-sm text-muted-foreground" : "sr-only"}>{checkingCaptcha ? "Running security check…" : busy ? (creating ? "Creating account…" : "Signing in…") : creating ? "Submit to run a security check." : ""}</p>
            {creating && <p className="mx-auto max-w-sm text-center text-xs leading-5 text-muted-foreground">Protected by reCAPTCHA. Google <a href="https://policies.google.com/privacy" className="underline">Privacy Policy</a> and <a href="https://policies.google.com/terms" className="underline">Terms of Service</a> apply.</p>}
            <Button form="account-form" type="submit" disabled={busy}>{busy && <Loader2 data-icon="inline-start" className="animate-spin" />}{creating ? "Create account" : "Sign in"}</Button>
            <p className="text-center text-sm leading-relaxed text-muted-foreground">{creating ? "Already have an account? " : "New to Physcratic? "}<Link className="text-foreground underline underline-offset-4" href={`/${creating ? "sign-in" : "sign-up"}?returnTo=${encodeURIComponent(returnTo)}`}>{creating ? "Sign in" : "Create an account"}</Link></p>
            {!creating && <Button type="button" variant="ghost" disabled={busy} onClick={() => { setVerificationRequired(false); setVerificationEmail(""); }}>Need a verification email?</Button>}
            <Link href="/terms" className="text-center text-sm text-muted-foreground underline underline-offset-4">Terms of Service</Link>
          </CardFooter>
        </Card>}
      </div>
    </main>
  );
}
