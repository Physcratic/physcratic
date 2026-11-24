import { pool } from '@/lib/db';
import { createUnifiedArenaApi } from '@/lib/unified-arena-api';
import { communityProfilesEnabled } from '@/lib/community/profile-route';
import { communityAchievementsEnabled,externalMedalShowcaseEnabled,medalShowcaseEnabled } from '@/lib/community/achievements-route';
import {communityProblemStatsEnabled} from '@/lib/community/problem-stats-route';
import { personalCompletionsEnabled } from '@/lib/personal-completions-route';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const GET=createUnifiedArenaApi(pool,()=>({authors:process.env.COMMUNITY_AUTHORSHIP_ENABLED==='true'&&communityProfilesEnabled(),badges:communityAchievementsEnabled(),medals:medalShowcaseEnabled(),externalMedals:externalMedalShowcaseEnabled(),stats:communityProblemStatsEnabled()}),{
  enabled:personalCompletionsEnabled,
  secret:()=>process.env.BETTER_AUTH_SECRET,
  user:async request=>(await import('@/lib/submission-server')).submissionUser(request),
});
