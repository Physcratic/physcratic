// Browser-only synthetic auth adapter. Never imported by application code.
import { useSyncExternalStore } from "react";
type Session = { isPending: boolean; error: Error | null; data: { user: { id: string; emailVerified: boolean } } | null };
declare global { interface Window { __practiceSession: Session; __setPracticeSession: (id: string | null, verified?: boolean, pending?: boolean) => void } }
const listeners = new Set<() => void>();
window.__practiceSession = { isPending: new URLSearchParams(location.search).has("pending"), error: null, data: null };
window.__setPracticeSession = (id, verified = true, pending = false) => {
  document.cookie = `viewer=${id ?? ""}; Path=/; SameSite=Lax`;
  window.__practiceSession = { isPending: pending, error: null, data: id ? { user: { id, emailVerified: verified } } : null };
  for (const listener of listeners) listener();
};
export const authClient = { useSession: () => useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => window.__practiceSession) };
