import {z} from 'zod';
import {problemKeySchema} from '../unified-arena';
const keySchema=problemKeySchema.transform(k=>k.startsWith('authored:')?k.toLowerCase():k);
export const statsKeysSchema=z.array(keySchema).min(1).max(24).refine(v=>new Set(v).size===v.length);
export const favouriteWriteSchema=z.strictObject({key:keySchema,favourite:z.boolean()});
export const problemStatSchema=z.strictObject({key:keySchema,favourites:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),favourite:z.boolean(),solves:z.number().int().nonnegative().nullable()});
export const statsPageSchema=z.strictObject({problems:z.array(problemStatSchema).max(24)});
export type ProblemStat=z.infer<typeof problemStatSchema>;
