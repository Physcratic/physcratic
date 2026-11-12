import 'server-only';
import type { Pool } from 'pg';
import { APIError } from 'better-auth/api';
import { communityActionsEnabled } from './action-policy';

export async function accountIsBanned(pool: Pick<Pool, 'query'>, id: string, enabled = communityActionsEnabled()) {
  if (!enabled) return false;
  const query = {
    text: "SELECT 1 FROM community_restriction WHERE kind='user' AND user_id=$1 AND restricted",
    values: [id], query_timeout: 5000,
  };
  const result = await pool.query(query);
  return result.rows.length > 0;
}
export async function assertAccountCanSignIn(pool: Pick<Pool, 'query'>, id: string) {
  if (await accountIsBanned(pool, id))
    throw new APIError('FORBIDDEN', { code: 'ACCOUNT_BANNED', message: 'This account is banned. Contact support to request a review.' });
}
