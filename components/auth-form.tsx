"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getSignupCaptchaToken } from "@/lib/signup-captcha-client";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { PROFILE_PUBLICATION_POLICY_VERSION, profileHandleSchema } from "@/lib/community/profile-contracts";
import { TERMS_VERSION } from "@/lib/terms";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { VerificationNotice } from "@/components/verification-notice";

/** The account name sent at sign-up. With public profiles it is the username, trimmed. Otherwise it is the Name field. */
export function signUpName(form: FormData, publicProfileSignup: boolean): string {
  return String(form.get(publicProfileSignup ? "username" : "name") ?? "").trim();
}

export function AuthForm({ mode, returnTo, verified = false, verificationError = false, publicProfileSignup = false }: { mode: "sign-in" | "sign-up"; returnTo: string; verified?: boolean; verificationError?: boolean; publicProfileSignup?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setErrorText] = useState("");
  // What the button under an error does: sign in instead, reset a password, jump to the Terms box, or try the same thing again.
  const [fix, setFix] = useState<"sign-in" | "reset" | "terms" | "retry" | "reload" | null>(null);
  const setError = (text: string, next: typeof fix = null) => { setErrorText(text); setFix(next); };
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const creating = mode === "sign-up";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (creating && !termsAccepted) {
      setError("The Terms of Service box is not ticked yet. Tick it, then tap Create account again.", "terms");
      return;
    }
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const username = publicProfileSignup ? profileHandleSchema.safeParse(form.get("username")) : null;
    if (username && !username.success) {
      setError("Choose an available username with 3 to 24 letters, numbers or underscores. Start with a letter or number.");
      document.getElementById("account-username")?.focus();
      setBusy(false);
      return;
    }
    const credentials = { email: String(form.get("email")).trim(), password: String(form.get("password")) };
    const callbackURL = `/sign-in?verified=1&returnTo=${encodeURIComponent(returnTo)}`;
    try {
      const captchaToken = creating ? await getSignupCaptchaToken() : undefined;
      const result = creating
        ? await authClient.signUp.email({ ...credentials, name: signUpName(form, publicProfileSignup), callbackURL }, { body: { termsAccepted, termsVersion: TERMS_VERSION, ...(username?.success ? { username: username.data, profileDisclosureVersion: PROFILE_PUBLICATION_POLICY_VERSION } : {}) }, headers: { "x-captcha-response": captchaToken! } })
        : await authClient.signIn.email({ ...credentials, callbackURL });
      if (result.error) {
        if (creating && result.error.code === "TERMS_ACCEPTANCE_REQUIRED") {
          setError("The Terms of Service have changed since this page opened. Reload the page, read them and tick the box again.", "reload");
          return;
        }
        if (creating && publicProfileSignup && result.error.code === "PROFILE_SIGNUP_REQUIRED") {
          setError("Reload this page to review the current public profile notice and check your username.", "reload");
          return;
        }
        if (creating && publicProfileSignup && result.error.code === "FAILED_TO_CREATE_USER") {
          setError("We could not create your account. Try a different username, or sign in if you already have an account.", "sign-in");
          return;
        }
        if (!creating && result.error.code === "EMAIL_NOT_VERIFIED") {
          setVerificationEmail(credentials.email);
          return;
        }
        setError(creating ? "We could not create your account. Check that your email is spelled right and your password has at least 8 characters. If you already have an account, sign in instead." : "That email and password did not match. Check them and try again, or reset your password.", creating ? "sign-in" : "reset");
        return;
      }
      if (creating) {
        setVerificationEmail(credentials.email);
        return;
      }
      router.push(returnTo);
      router.refresh();
    } catch {
      setError("We could not reach the account service. Check your connection and try again. What you typed is still here.", "retry");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-10 font-sans">
      <div className="flex w-full max-w-[30rem] flex-col gap-6">
        <Button variant="ghost" className="w-fit" asChild><Link href="/dashboard"><ArrowLeft data-icon="inline-start" /> Back to Physcratic</Link></Button>
        {verificationEmail !== null ? <VerificationNotice email={verificationEmail} returnTo={returnTo} onBack={() => setVerificationEmail(null)} /> : <Card>
          <CardHeader><CardTitle><h1>{creating ? "Create an account" : "Sign in"}</h1></CardTitle><CardDescription>{creating ? "Save your olympiad solutions privately." : "Sign in to see your saved attempts."}</CardDescription></CardHeader>
          <CardContent>
            <form id="account-form" method="post" onSubmit={submit} onKeyDown={(event) => {
              if (event.key === "Enter" && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault();
            }}>
              <fieldset disabled={busy}><FieldGroup className="gap-6">
                {!creating && verified && !verificationError && <Alert role="status"><AlertTitle>Ready to sign in</AlertTitle><AlertDescription>If your email verification succeeded, sign in below to continue.</AlertDescription></Alert>}
                {!creating && verificationError && <Alert variant="destructive" role="alert"><AlertTitle>Link unavailable</AlertTitle><AlertDescription>This verification link is invalid or has expired. Request a new email below.</AlertDescription></Alert>}
                {creating && !publicProfileSignup && <Field className="gap-2"><FieldLabel htmlFor="account-name">Name</FieldLabel><Input id="account-name" className="md:text-base" name="name" autoComplete="name" required minLength={1} maxLength={80} /></Field>}
                {creating && publicProfileSignup && <Field className="gap-2">
                  <FieldLabel htmlFor="account-username">Username</FieldLabel>
                  <Input id="account-username" className="md:text-base" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={24} aria-describedby="signup-profile-notice" />
                  <FieldDescription id="signup-profile-notice" className="text-xs last:-mt-1">Choose a permanent username with 3 to 24 letters, numbers or underscores.</FieldDescription>
                </Field>}
                <Field className="gap-2"><FieldLabel htmlFor="account-email">Email</FieldLabel><Input id="account-email" className="md:text-base" name="email" type="email" autoComplete="email" required maxLength={254} /></Field>
                <Field className="gap-2"><FieldLabel htmlFor="account-password">Password</FieldLabel><Input id="account-password" className="md:text-base" name="password" type="password" autoComplete={creating ? "new-password" : "current-password"} required minLength={8} maxLength={128} />{creating && <p className="-mt-1 text-xs leading-relaxed text-muted-foreground">Use at least 8 characters.</p>}{!creating && <Link href="/forgot-password" className="inline-flex min-h-11 w-fit items-center text-sm text-foreground underline underline-offset-4">Forgot password?</Link>}</Field>
                {/* The label keeps its text height and gets 12px above and below, so its box is the 44px target. The row moves up 12px so the visible text is 24px from the field above, and the description moves up 8px to sit 4px under the text. */}
                {creating && <Field orientation="horizontal" className="-mt-3 gap-x-3">
                  <Checkbox id="account-terms" className="relative top-3.5" name="termsAccepted" required checked={termsAccepted} onCheckedChange={(checked) => setTermsAccepted(checked === true)} aria-describedby="account-terms-description" />
                  <FieldContent className="gap-0">
                    <FieldLabel htmlFor="account-terms" className="py-3 leading-5">I agree to the Terms of Service.</FieldLabel>
                    <FieldDescription id="account-terms-description" className="last:-mt-2"><Link href="/terms" target="_blank" rel="noopener noreferrer">Read the Terms of Service<span className="sr-only"> (opens in a new tab)</span></Link> and <Link href="/privacy" target="_blank" rel="noopener noreferrer">the Privacy Notice<span className="sr-only"> (opens in a new tab)</span></Link>. We record the version and acceptance time with your account.</FieldDescription>
                  </FieldContent>
                </Field>}
                {error && <Alert variant="destructive" role="alert"><AlertTitle>Could not continue</AlertTitle><AlertDescription>{error}
                  {fix && <span className="mt-3 block"><Button type="button" variant="outline" className="min-h-11 bg-background" asChild={fix === "sign-in" || fix === "reset"} onClick={fix === "terms" ? () => document.getElementById("account-terms")?.focus() : fix === "reload" ? () => window.location.reload() : fix === "retry" ? () => { setError(""); (document.getElementById("account-form") as HTMLFormElement | null)?.requestSubmit(); } : undefined}>
                    {fix === "sign-in" ? <Link href={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`}>Sign in instead</Link> : fix === "reset" ? <Link href="/forgot-password">Reset your password</Link> : fix === "terms" ? "Go to the Terms box" : fix === "reload" ? "Reload the page" : "Try again"}
                  </Button></span>}
                </AlertDescription></Alert>}
              </FieldGroup></fieldset>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-4">
            <Button form="account-form" type="submit" disabled={busy}>{busy && <Loader2 data-icon="inline-start" className="animate-spin" />}{creating ? "Create account" : "Sign in"}</Button>
            <p className="text-center text-sm leading-relaxed text-muted-foreground">{creating ? "Already have an account? " : "New to Physcratic? "}<Link className="text-foreground underline underline-offset-4" href={`/${creating ? "sign-in" : "sign-up"}?returnTo=${encodeURIComponent(returnTo)}`}>{creating ? "Sign in" : "Create an account"}</Link></p>
            {!creating && <Button type="button" variant="ghost" disabled={busy} onClick={() => setVerificationEmail("")}>Need a verification email?</Button>}
            <div className="flex flex-wrap justify-center gap-x-4">
              <Link href="/terms" className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline underline-offset-4">Terms of Service</Link>
              <Link href="/privacy" className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline underline-offset-4">Privacy Notice</Link>
            </div>
          </CardFooter>
        </Card>}
      </div>
    </main>
  );
}
