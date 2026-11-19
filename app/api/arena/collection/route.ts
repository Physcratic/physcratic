import { after } from 'next/server';
import { pool } from '@/lib/db';
import { createRuntimeLoginAttestation } from '@/lib/runtime-login-attestation';
import { createUnifiedArenaApi } from '@/lib/unified-arena-api';
import { communityProfilesEnabled } from '@/lib/community/profile-route';
import { communityAchievementsEnabled,medalShowcaseEnabled } from '@/lib/community/achievements-route';
import {communityProblemStatsEnabled} from '@/lib/community/problem-stats-route';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const collection=createUnifiedArenaApi(pool,()=>({authors:process.env.COMMUNITY_AUTHORSHIP_ENABLED==='true'&&communityProfilesEnabled(),badges:communityAchievementsEnabled(),medals:medalShowcaseEnabled(),stats:communityProblemStatsEnabled()}));
const attest = createRuntimeLoginAttestation(pool, { schedule: after });

export async function GET(request: Request) {
  const response = await collection(request);
  if (response.ok) attest(request);
  return response;
}
