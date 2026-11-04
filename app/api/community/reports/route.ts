import {createModerationRoute} from '@/lib/community/moderation-route';
export const runtime='nodejs';export const dynamic='force-dynamic';
export const GET=createModerationRoute('reports');export const POST=GET;
