import { z } from 'zod';
import { moderationNote } from './moderation-note';

export const actionKind = z.enum(['problem', 'user']);
const userId = z.string().trim().min(1).max(128).refine(v => !/[\u0000-\u001f\u007f]/.test(v));
export const actionLookup = z.strictObject({
  kind: actionKind,
  id: userId,
  by: z.enum(['id', 'handle']).default('id'),
  beforeAudit: z.string().regex(/^[1-9]\d{0,17}$/).optional(),
}).superRefine((v, ctx) => {
  if (v.kind === 'problem' && (v.by !== 'id' || !z.uuid().safeParse(v.id).success))
    ctx.addIssue({ code: 'custom', message: 'Enter a problem ID.' });
  if (v.by === 'handle' && !/^[a-z0-9_]{3,24}$/.test(v.id))
    ctx.addIssue({ code: 'custom', message: 'Enter a public profile handle.' });
}).transform(v => v.kind === 'problem' ? { ...v, id: v.id.toLowerCase() } : v);
export const actionDecision = z.strictObject({
  kind: actionKind,
  id: userId,
  version: z.number().int().nonnegative().max(2147483646),
  restricted: z.boolean(),
  reason: moderationNote,
}).superRefine((v, ctx) => {
  if (v.kind === 'problem' && !z.uuid().safeParse(v.id).success)
    ctx.addIssue({ code: 'custom', message: 'Enter a problem ID.' });
}).transform(v => v.kind === 'problem' ? { ...v, id: v.id.toLowerCase() } : v);
export const actionDetail = z.object({
  role: z.enum(['admin', 'moderator']),
  target: z.object({
    kind: actionKind, id: userId, label: z.string(),
    version: z.number().int().nonnegative(), restricted: z.boolean(), protected: z.boolean(),
  }),
  audit: z.array(z.object({
    id: z.string(), actorId: z.string().nullable(), action: z.string(),
    version: z.number().int(), reason: z.string(), createdAt: z.string(),
  })).max(20),
  nextAudit: z.string().nullable(),
});
export type ActionDetail = z.infer<typeof actionDetail>;
