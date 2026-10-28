"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, NotebookPen } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function AccountNav() {
  const { data, isPending, error, refetch } = authClient.useSession();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const router = useRouter();
  if (isPending) return <span role="status" className="text-sm text-muted-foreground">Account…</span>;
  if (error) return <Button size="sm" variant="outline" onClick={() => refetch()}>Retry account</Button>;
  if (!data?.user) return <Button asChild variant="outline" size="sm"><Link href="/sign-in">Sign in</Link></Button>;
  async function signOut() {
    setBusy(true);
    setFailed(false);
    try {
      const result = await authClient.signOut();
      if (result.error) { setFailed(true); return; }
      router.push("/dashboard");
      router.refresh();
    } catch { setFailed(true); } finally { setBusy(false); }
  }
  return <div className="flex items-center gap-2"><Button size="sm" variant="ghost" asChild><Link href="/dashboard/submissions"><NotebookPen data-icon="inline-start" /><span className="hidden sm:inline">My attempts</span><span className="sr-only sm:hidden">My attempts</span></Link></Button><Button size="icon" variant="ghost" onClick={signOut} disabled={busy} aria-label={failed ? "Sign-out failed. Retry sign out" : "Sign out"} title={failed ? "Sign-out failed. Retry" : `Sign out ${data.user.name}`}><LogOut /></Button>{failed && <span role="alert" className="text-sm text-destructive">Try again</span>}</div>;
}
