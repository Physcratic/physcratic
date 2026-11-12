import { z } from 'zod';
export const moderationNote = z.string().trim().min(1).max(1000)
  .refine(v => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v));
