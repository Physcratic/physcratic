import { z } from 'zod';
const text = (max: number) => z.string().trim().min(1).max(max).regex(/^[^\x00-\x1f\x7f]*$/);
export const medalClaimSchema = z.strictObject({ competition:z.enum(['IPhO','APhO','EuPhO','National']),award:z.enum(['gold','silver','bronze','honourable-mention']),year:z.number().int().min(1959).max(new Date().getUTCFullYear()),country:z.string().regex(/^([A-Z]{2})?$/).default(''),competitionName:z.string().trim().max(120).default(''),certificateName:text(160) }).refine(v=>v.competition!=='National'||(v.country.length===2&&v.competitionName.length>0));
export const medalReviewSchema=z.strictObject({version:z.number().int().positive(),decision:z.enum(['approved','rejected','more-info','revoked']),reason:text(1000)});
