import { z } from 'zod';
import { problemKeySchema } from '../unified-arena';
const canonicalKey=problemKeySchema.refine(key=>key.startsWith('arena:')||key===key.toLowerCase());
export const interactionKeysSchema=z.array(canonicalKey).min(1).max(24).refine(keys=>new Set(keys).size===keys.length);
export const favoriteWriteSchema=z.strictObject({key:canonicalKey,favourite:z.boolean()});
export const problemStatsSchema=z.strictObject({key:problemKeySchema,favourites:z.number().int().nonnegative().nullable(),completed:z.number().int().nonnegative().nullable(),favourite:z.boolean(),canFavourite:z.boolean()});
export const interactionsSchema=z.strictObject({problems:z.array(problemStatsSchema).max(24),viewer:z.enum(['guest','unverified','verified'])});
export type ProblemStats=z.infer<typeof problemStatsSchema>;
