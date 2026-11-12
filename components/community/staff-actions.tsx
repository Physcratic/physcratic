"use client";
import React, { useEffect, useRef, useState } from 'react';
import { actionDecision, actionDetail, actionLookup, type ActionDetail } from '@/lib/community/actions-contracts';
import { moderationFetch, ModerationRequestError } from '@/lib/community/moderation-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const endpoint = '/api/community/actions';
export function StaffActions() {
  const [kind, setKind] = useState<'problem' | 'user'>('problem');
  const [identity, setIdentity] = useState('');
  const [detail, setDetail] = useState<ActionDetail | null>(null);
  const [reason, setReason] = useState(''), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false), [stale, setStale] = useState(false), [older, setOlder] = useState(false);
  const [pending, setPending] = useState<ReturnType<typeof actionDecision.parse> | null>(null);
  const flight = useRef<AbortController | null>(null), confirmation = useRef<HTMLDivElement>(null), reasonField = useRef<HTMLTextAreaElement>(null);
  const generation = useRef(0);
  const returnFocus = useRef(false);
  function clear() {
    generation.current++; flight.current?.abort(); flight.current = null;
    setDetail(null); setPending(null); setReason(''); setError(''); setNotice(''); setBusy(false); setStale(false); setOlder(false);
  }
  useEffect(() => {
    const forget = () => {
      generation.current++; flight.current?.abort(); flight.current = null;
      setDetail(null); setPending(null); setReason(''); setBusy(false); setStale(true);
    };
    const hidden = () => { if (document.hidden) forget(); };
    window.addEventListener('blur', forget);
    document.addEventListener('visibilitychange', hidden);
    const timer = setInterval(forget, 60000);
    return () => { forget(); window.removeEventListener('blur', forget); document.removeEventListener('visibilitychange', hidden); clearInterval(timer); };
  }, []);
  useEffect(() => {
    if (pending) confirmation.current?.focus();
    else if (returnFocus.current) { returnFocus.current = false; reasonField.current?.focus(); }
  }, [pending]);
  async function lookup(beforeAudit?: string) {
    if (flight.current) return;
    const value = identity.trim(), by = kind === 'user' && value.startsWith('@') ? 'handle' : 'id';
    const input = actionLookup.safeParse({ kind, id: by === 'handle' ? value.slice(1).toLowerCase() : value, by, ...(beforeAudit ? { beforeAudit } : {}) });
    if (!input.success) { setError(kind === 'problem' ? 'Enter a valid community question ID.' : 'Enter a user ID or public @handle.'); return; }
    const controller = new AbortController(), token = ++generation.current;
    flight.current = controller; setBusy(true); setDetail(null); setPending(null); setReason(''); setError(''); setNotice(''); setStale(true);
    try {
      const result = actionDetail.parse(await moderationFetch(endpoint + '?' + new URLSearchParams(input.data), { signal: controller.signal }));
      if (controller.signal.aborted || token !== generation.current) return;
      setDetail(result); setStale(false); setOlder(Boolean(beforeAudit));
    } catch (e) { if (!controller.signal.aborted && token === generation.current) setError(e instanceof Error ? e.message : 'Could not load this target.'); }
    finally { if (token === generation.current) { flight.current = null; setBusy(false); } }
  }
  function prepare() {
    if (!detail || busy || stale || older) return;
    const parsed = actionDecision.safeParse({ kind: detail.target.kind, id: detail.target.id, version: detail.target.version, restricted: !detail.target.restricted, reason });
    if (!parsed.success) { setError('Give a reason of 1 to 1000 characters.'); return; }
    setError(''); setPending(parsed.data);
  }
  async function decide() {
    if (!pending || flight.current) return;
    const fixed = pending, token = ++generation.current, controller = new AbortController();
    flight.current = controller; setBusy(true); setError(''); setNotice('');
    try {
      await moderationFetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fixed), signal: controller.signal });
      if (controller.signal.aborted || token !== generation.current) return;
      setDetail(null); setPending(null); setReason(''); setStale(true);
      setNotice('Decision recorded. Reload the target to inspect its current status and audit.');
    } catch (e) {
      if (controller.signal.aborted || token !== generation.current) return;
      setPending(null); setStale(true);
      if (e instanceof ModerationRequestError && [401, 403].includes(e.status)) setDetail(null);
      setError('Decision was not confirmed. Reload the target and check its audit before retrying.');
    } finally { if (token === generation.current) { flight.current = null; setBusy(false); } }
  }
  const target = detail?.target;
  const label = target ? target.kind === 'user' ? target.restricted ? 'Unban user' : 'Ban user' : target.restricted ? 'Restore question' : 'Remove question' : '';
  return <section aria-label="Questions and accounts" className="space-y-5 border-t pt-6 [overflow-wrap:anywhere]">
    <h2 className="text-lg font-semibold">Questions and accounts</h2>
    <p className="text-sm text-muted-foreground">Remove community questions or ban users. Administrators can restore questions and unban users.</p>
    <form className="flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); void lookup(); }}>
      <label className="space-y-2 text-sm">Target<select aria-label="Staff action target" className="block min-h-11 rounded border bg-background px-3" value={kind} disabled={busy} onChange={e => { clear(); setKind(e.target.value as typeof kind); setIdentity(''); }}><option value="problem">Community question</option><option value="user">User account</option></select></label>
      <label className="min-w-0 flex-1 space-y-2 text-sm">{kind === 'problem' ? 'Question ID' : 'User ID or public @handle'}<Input value={identity} maxLength={128} disabled={busy} onChange={e => { clear(); setIdentity(e.target.value); }}/></label>
      <Button type="submit" disabled={busy}>{busy ? 'Loading.' : 'Load target'}</Button>
    </form>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {stale && !busy && <p role="status" className="text-sm">Load the target again before recording a decision.</p>}
    {detail && target && <div className="space-y-5 rounded-xl border bg-card p-4 sm:p-6">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">{[['Target', target.label], ['ID', target.id], ['Status', target.restricted ? target.kind === 'user' ? 'Banned' : 'Removed' : 'No moderation restriction'], ['Version', String(target.version)], ['Current access', detail.role]].map(([name, value]) => <div key={name}><dt className="text-muted-foreground">{name}</dt><dd>{value}</dd></div>)}</dl>
      {target.kind === 'problem' ? <p className="text-sm">Removal hides this question and stops new submissions. Revisions and student attempts remain. Restoration lets the author publish again, and keeps the question archived until they do.</p> : <p className="text-sm">Banning ends existing sessions and prevents another sign-in. It does not delete the account or its published questions. Unbanning requires a new sign-in.</p>}
      {target.protected ? <p className="text-sm">You cannot moderate your own questions, your own account or a staff account here.</p> : target.restricted && detail.role !== 'admin' ? <p className="text-sm">An administrator must restore this target.</p> : <fieldset disabled={busy || stale || older || Boolean(pending)} className="space-y-3">
        <legend className="font-medium">Record a decision</legend>
        <label className="block space-y-2 text-sm">Reason<Textarea ref={reasonField} value={reason} maxLength={1000} rows={3} onChange={e => setReason(e.target.value)}/></label>
        <p className="text-sm text-muted-foreground">Keep reporter identities and private evidence out of the reason.</p>
        <Button variant={target.restricted ? 'default' : 'destructive'} onClick={prepare}>{label}</Button>
      </fieldset>}
      {pending && <div ref={confirmation} tabIndex={-1} role="group" aria-label="Confirm staff action" className="space-y-3 rounded-lg border p-4">
        <h3 className="font-medium">Confirm {label.toLowerCase()}</h3><p>{target.label}</p><p className="text-sm">{pending.id}, version {pending.version}</p><p className="whitespace-pre-wrap text-sm">Reason: {pending.reason}</p>
        <div className="flex flex-wrap gap-3"><Button disabled={busy} onClick={() => void decide()}>Confirm {label.toLowerCase()}</Button><Button variant="outline" disabled={busy} onClick={() => { returnFocus.current = true; setPending(null); }}>Cancel action</Button></div>
      </div>}
      <section aria-label="Target audit" className="space-y-3 border-t pt-4"><h3 className="font-medium">Audit history</h3>{older && <p className="text-sm">Older history is shown. Load the target again before deciding.</p>}
        {!detail.audit.length && <p className="text-sm">No staff actions recorded.</p>}
        <ol className="space-y-3">{detail.audit.map(a => <li key={a.id} className="space-y-1 border-l-2 pl-3 text-sm"><p className="font-medium">{a.action}, version {a.version}</p><p>{a.createdAt}, {a.actorId || 'Deleted account'}</p><p className="whitespace-pre-wrap">{a.reason}</p></li>)}</ol>
        {detail.nextAudit && <Button variant="outline" disabled={busy || Boolean(pending)} onClick={() => void lookup(detail.nextAudit!)}>Older actions</Button>}
      </section>
    </div>}
  </section>;
}
