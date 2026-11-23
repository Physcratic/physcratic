"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AUTHOR_CREDIT_POLICY_VERSION,
  authorCreditStatusSchema,
  type AuthorCreditStatus,
} from "@/lib/author-credit-contracts";

const endpoint = "/api/authored-problems/author-credit";

class CreditRequestError extends Error {
  constructor(message: string, readonly code?: string) { super(message); }
}

async function creditRequest(userId: string, signal: AbortSignal, write?: object) {
  const headers = new Headers({ "X-Community-Account": userId });
  if (write) headers.set("Content-Type", "application/json");
  const response = await fetch(endpoint, {
    headers, signal, credentials: "same-origin", cache: "no-store",
    ...(write ? { method: "PATCH", body: JSON.stringify(write) } : {}),
  });
  const body = await response.json();
  if (!response.ok) throw new CreditRequestError(body.error || "Author credit is unavailable.", body.code);
  return authorCreditStatusSchema.parse(body);
}

export function AuthorCredit({ userId }: { userId: string }) {
  const [status, setStatus] = useState<AuthorCreditStatus>();
  const [reload, setReload] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]);
    creditRequest(userId, signal)
      .then(result => { if (!controller.signal.aborted) setStatus(result); })
      .catch(failure => {
        if (!controller.signal.aborted)
          setError(failure instanceof CreditRequestError ? failure.message : "Could not load author credit.");
      });
    return () => controller.abort();
  }, [reload, userId]);

  async function save(write: object, success: string) {
    if (!status || saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      setStatus(await creditRequest(userId, AbortSignal.timeout(15000), write));
      setAgreed(false);
      setNotice(success);
    } catch (failure) {
      const rejected = failure instanceof CreditRequestError;
      setError(rejected ? failure.message : "Could not confirm the change. Reload your credit status.");
      if (!rejected || failure.code === "CREDIT_CHANGED" || failure.code === "ACCOUNT_CHANGED") {
        setStatus(undefined);
        setAgreed(false);
      }
    } finally {
      setSaving(false);
    }
  }

  function refresh() {
    setStatus(undefined);
    setAgreed(false);
    setError("");
    setNotice("");
    setReload(value => value + 1);
  }

  return (
    <details className="mb-5 rounded-md border px-4">
      <summary className="min-h-11 cursor-pointer content-center text-sm font-medium">Author credit</summary>
      <div className="max-w-xl space-y-3 pb-4 text-sm">
        <p>
          Author credit lets Physcratic show your username on all your published community problems, including older
          publications. Credit can appear even with a private profile and stays on after profile deactivation.
        </p>
        <p>You can withdraw credit here. Your published problems stay online.</p>
        {status && !status.handle && (
          <form className="space-y-3" onSubmit={event => {
            event.preventDefault();
            const handle = String(new FormData(event.currentTarget).get("handle") ?? "");
            void save({ action: "claim", handle }, "Username saved. You can now choose whether to show author credit.");
          }}>
            <div className="max-w-xs space-y-2">
              <Label htmlFor="credit-handle">Choose a permanent username</Label>
              <Input id="credit-handle" name="handle" autoCapitalize="none" autoComplete="off" spellCheck={false}
                className="min-h-11 text-base" disabled={saving} required minLength={3} maxLength={24}
                aria-describedby="credit-handle-hint" />
              <p id="credit-handle-hint">
                Choose a pseudonym you are comfortable sharing. Use 3 to 24 letters, numbers or underscores.
                Start with a letter or number.
              </p>
            </div>
            <Button type="submit" variant="outline" disabled={saving}>Claim username</Button>
          </form>
        )}
        {status?.handle && <p>Your username is <strong>@{status.handle}</strong>.</p>}
        {status?.handle && status.credit !== "active" && (
          <form className="space-y-3" onSubmit={event => {
            event.preventDefault();
            if (agreed) void save({
              action: "acknowledge", handle: status.handle,
              policyVersion: AUTHOR_CREDIT_POLICY_VERSION, revision: status.revision,
            }, "Author credit preference saved.");
          }}>
            {status.credit === "review-required" && <p>Review the updated disclosure before agreeing again.</p>}
            <div className="flex items-center gap-2">
              <Checkbox id="credit-ack" checked={agreed} disabled={saving} onCheckedChange={value => setAgreed(value === true)} />
              <Label htmlFor="credit-ack" className="min-h-11 content-center">
                I agree to show my username as author credit.
              </Label>
            </div>
            <Button type="submit" variant="outline" disabled={!agreed || saving}>Save author credit</Button>
          </form>
        )}
        {status && status.credit !== "inactive" && (
          <div className="space-y-2">
            {status.credit === "active" && <p>You have agreed to author credit.</p>}
            <Button type="button" variant="outline" disabled={saving} onClick={() => {
              void save({ action: "withdraw", revision: status.revision }, "Author credit withdrawn.");
            }}>Withdraw author credit</Button>
          </div>
        )}
        {!status && !error && <p role="status">Loading author credit…</p>}
        {notice && <p role="status">{notice}</p>}
        {error && (
          <div className="space-y-2">
            <p role="alert">{error}</p>
            <Button type="button" variant="outline" disabled={saving} onClick={refresh}>Reload credit status</Button>
          </div>
        )}
      </div>
    </details>
  );
}
