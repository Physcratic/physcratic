// What the account screens say when Better Auth answers with an error. Each one says what to do next.
export type AccountAction = "change-email" | "change-password" | "request-reset" | "reset-password";
export type AuthErrorLike = { code?: string; status?: number; message?: string } | null | undefined;

export function accountErrorMessage(action: AccountAction, error: AuthErrorLike) {
  const code = error?.code;
  if (code === "EMAIL_BUDGET") return "That’s a lot of emails for one hour. Try again later.";
  if (error?.status === 429) return "Too many tries. Wait a minute, then try again.";
  if (code === "INVALID_PASSWORD") return action === "change-password"
    ? "That current password didn’t match. Try again or reset it."
    : "That password didn’t match. Try again or reset it.";
  if (code === "CURRENT_PASSWORD_REQUIRED") return "Enter your current password first.";
  if (code === "PASSWORD_NOT_SET" || code === "CREDENTIAL_ACCOUNT_NOT_FOUND") return "Set a password first. Then you can change your email.";
  if (code === "PASSWORD_TOO_SHORT") return "Use at least 8 characters.";
  if (code === "PASSWORD_TOO_LONG") return "Use 128 characters or fewer.";
  if (code === "INVALID_TOKEN" || code === "TOKEN_EXPIRED") return "That link has expired or was already used. Ask for a new one.";
  if (code === "UNAUTHORIZED" || error?.status === 401) return "You’ve been signed out. Sign in again, then try that.";
  if (action === "change-email" && (code === "INVALID_EMAIL" || error?.message === "Email is the same"))
    return error?.message === "Email is the same" ? "That’s already your email." : "Check the new address and try again.";
  if (error?.status === 503 || error?.status === undefined) return "Something went wrong on our side. Try again in a minute.";
  return action === "change-email" ? "That didn’t work. Check the address and try again." : "That didn’t work. Check what you typed and try again.";
}

/** Copy for the page an email-change link lands on. */
export function emailChangeOutcome(step: string | undefined, error: string | undefined) {
  if (error) return { ok: false, title: "Link didn’t work", body: "That link has expired or was already used. Start again from Settings." };
  if (step === "approved") return { ok: true, title: "Approved", body: "Now check your new inbox for one more link. Your email changes after you click it." };
  if (step === "done") return { ok: true, title: "Email changed", body: "You’re all set. Use your new email next time you sign in." };
  return { ok: false, title: "Nothing to do here", body: "To change your email, go to Settings." };
}
